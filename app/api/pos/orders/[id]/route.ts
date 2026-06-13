import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

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
    const { status } = body as {
      status: "DRAFT" | "PAID" | "CANCELLED" | "COMPLETED";
    };

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status },
        include: {
          customer: true,
          table: { select: { id: true, label: true } },
          items: { include: { product: true } },
        },
      });

      // ── Free table when order is closed ────────────────────────────────
      if (
        order.tableId &&
        ["PAID", "CANCELLED", "COMPLETED"].includes(status)
      ) {
        // Check no other DRAFT orders on same table
        const otherActive = await tx.order.count({
          where: {
            tableId: order.tableId,
            status: "DRAFT",
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
        items: { include: { product: true } },
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