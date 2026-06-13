import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { recalculateCart } from "@/services/discount.service";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, tableId, paymentMethod, couponCode, items } = body as {
      customerId?: string;
      tableId: string | null;
      paymentMethod: string;
      couponCode?: string | null;
      items: { productId: string; quantity: number }[];
    };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const isTakeout = !tableId;

    // ── Check table (dine-in only) ───────────────────────────────────────
    if (!isTakeout) {
      const table = await prisma.table.findUnique({
        where: { id: tableId! },
        include: {
          orders: { where: { status: "DRAFT" }, take: 1 },
        },
      });

      if (!table) {
        return NextResponse.json(
          { error: "Table not found" },
          { status: 404 }
        );
      }

      if (table.orders.length > 0) {
        return NextResponse.json(
          { error: `Table ${table.label} already has an active order` },
          { status: 409 }
        );
      }
    }

    // ── Recalculate everything server-side ───────────────────────────────
    // recalculateCart already fetches products, calculates subtotal,
    // tax, and applies best discount (coupon or promotion).
    // Do NOT fetch products again after this — that was causing the error.
    const calc = await recalculateCart(items, couponCode);

    // ── Coupon security check ────────────────────────────────────────────
    if (couponCode && calc.source === "COUPON" && !calc.couponId) {
      return NextResponse.json(
        { error: "Coupon validation failed" },
        { status: 400 }
      );
    }

    // ── Generate order number ────────────────────────────────────────────
    const prefix = isTakeout ? "TO" : "ORD";
    const orderNumber = `${prefix}-${Date.now()
      .toString(36)
      .toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;

    // ── Build order items from what recalculateCart already validated ────
    // recalculateCart threw if any product wasn't found, so productIds
    // are guaranteed valid. Fetch prices from the same source of truth.
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, price: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal: product.price * item.quantity,
      };
    });

    // ── Create order in transaction ──────────────────────────────────────
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          employeeId: currentUser.id,
          customerId: customerId || null,
          tableId: isTakeout ? null : tableId,
          couponId: calc.couponId || null,
          promotionId: calc.promotionId || null,
          subtotal: calc.subtotal,
          taxAmount: calc.taxAmount,
          discount: calc.discount,
          discountSource: calc.source,
          discountReason: calc.reason,
          total: calc.total,
          status: "DRAFT",
          paymentMethod,
          items: { create: orderItems },
        },
        include: {
          customer: true,
          employee: { select: { name: true, email: true } },
          table: { select: { id: true, label: true } },
          coupon: { select: { id: true, code: true } },
          promotion: { select: { id: true, name: true } },
          items: { include: { product: true } },
        },
      });

      // Mark table OCCUPIED (dine-in only)
      if (!isTakeout) {
        await tx.table.update({
          where: { id: tableId! },
          data: { status: "OCCUPIED" },
        });
      }

      // Increment coupon usage
      if (calc.couponId) {
        await tx.coupon.update({
          where: { id: calc.couponId },
          data: { currentUsage: { increment: 1 } },
        });
      }

      return newOrder;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/pos/orders]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Order creation failed",
      },
      { status: 500 }
    );
  }
}