import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function getKitchenOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: {
        include: {
          product: { include: { category: true } },
        },
      },
    },
  });

  if (!order) return null;

  return {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(["ADMIN", "EMPLOYEE"]);
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.findUnique({
        where: { id },
        include: {
          product: true,
          order: { select: { id: true, employeeId: true, status: true, discount: true } },
        },
      });

      if (!orderItem || orderItem.order.employeeId !== user.id || orderItem.order.status !== "PAID") {
        throw new Error("Order item is not active for this employee");
      }

      if (orderItem.quantity > 1) {
        const nextQuantity = orderItem.quantity - 1;
        await tx.orderItem.update({
          where: { id },
          data: {
            quantity: nextQuantity,
            lineTotal: orderItem.unitPrice * nextQuantity,
          },
        });
      } else {
        await tx.orderItem.delete({ where: { id } });
      }

      const remainingItems = await tx.orderItem.findMany({
        where: { orderId: orderItem.order.id },
        include: { product: true },
      });

      if (remainingItems.length === 0) {
        await tx.order.update({
          where: { id: orderItem.order.id },
          data: {
            subtotal: 0,
            taxAmount: 0,
            total: 0,
          },
        });
      } else {
        const subtotal = remainingItems.reduce((sum, item) => sum + item.lineTotal, 0);
        const taxAmount = remainingItems.reduce(
          (sum, item) => sum + (item.lineTotal * item.product.tax) / 100,
          0,
        );
        const total = Math.max(0, subtotal + taxAmount - orderItem.order.discount);

        await tx.order.update({
          where: { id: orderItem.order.id },
          data: { subtotal, taxAmount, total },
        });
      }

      return orderItem.order.id;
    });

    const order = await getKitchenOrder(result);

    return NextResponse.json({ order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to decrement order item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
