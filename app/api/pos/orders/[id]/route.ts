import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { recalculateCart } from "@/services/discount.service";
import { sendReceiptEmail } from "@/services/email.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, paymentMethod, couponCode, items } = body as {
      status: "DRAFT" | "PAID" | "CANCELLED" | "COMPLETED";
      paymentMethod?: string;
      couponCode?: string | null;
      items?: { productId: string; quantity: number }[];
    };

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      let updateData: any = { status };

      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }

      if (items) {
        // Calculate new totals using discount service
        const calc = await recalculateCart(items, couponCode);

        // Update coupon usage if coupon changed
        if (order.couponId !== calc.couponId) {
          if (order.couponId) {
            await tx.coupon.update({
              where: { id: order.couponId },
              data: { currentUsage: { decrement: 1 } },
            });
          }
          if (calc.couponId) {
            await tx.coupon.update({
              where: { id: calc.couponId },
              data: { currentUsage: { increment: 1 } },
            });
          }
        }

        // Delete existing items
        await tx.orderItem.deleteMany({
          where: { orderId: id },
        });

        // Get prices for new items
        const products = await tx.product.findMany({
          where: { id: { in: items.map((i) => i.productId) } },
          select: { id: true, price: true },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        const newOrderItems = items.map((item) => {
          const product = productMap.get(item.productId)!;
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
            lineTotal: product.price * item.quantity,
          };
        });

        updateData = {
          ...updateData,
          couponId: calc.couponId || null,
          promotionId: calc.promotionId || null,
          subtotal: calc.subtotal,
          taxAmount: calc.taxAmount,
          discount: calc.discount,
          discountSource: calc.source,
          discountReason: calc.reason,
          total: calc.total,
          items: { create: newOrderItems },
        };
      }

      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          employee: { select: { name: true, email: true } },
          table: { select: { id: true, label: true } },
          coupon: true,
          items: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
        },
      });

      // ── Free table when order is closed ────────────────────────────────
      if (
        order.tableId &&
        ["CANCELLED", "COMPLETED"].includes(status)
      ) {
        // Check no other DRAFT or PAID orders on same table
        const otherActive = await tx.order.count({
          where: {
            tableId: order.tableId,
            status: { in: ["DRAFT", "PAID"] },
            id: { not: id },
          },
        });

        if (otherActive === 0) {
          const today = new Date();
          const startOfDay = new Date(today);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(today);
          endOfDay.setHours(23, 59, 59, 999);

          const activeBookings = await tx.booking.count({
            where: {
              tableId: order.tableId,
              isActive: true,
              date: { gte: startOfDay, lte: endOfDay },
            },
          });

          await tx.table.update({
            where: { id: order.tableId },
            data: {
              status: activeBookings > 0 ? "RESERVED" : "AVAILABLE",
            },
          });
        }
      }

      return updated;
    });

    if (status === "PAID" && updatedOrder.customer?.email) {
      sendReceiptEmail(updatedOrder).catch(console.error);
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("[PATCH /api/pos/orders/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        employee: { select: { name: true, email: true } },
        table: { select: { id: true, label: true } },
        coupon: true,
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[GET /api/pos/orders/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
