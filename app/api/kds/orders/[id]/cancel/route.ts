import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(["ADMIN", "EMPLOYEE"]);
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: user.role === "ADMIN" 
          ? { id, status: { in: ["DRAFT", "PAID"] } }
          : { id, employeeId: user.id, status: { in: ["DRAFT", "PAID"] } },
      });

      if (!order) return null;

      const updated = await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      // ── Free table when order is cancelled ──────────────────────────
      if (order.tableId) {
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

    if (!result) {
      return NextResponse.json(
        { error: "Order is not active for this employee" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      cancelledOrder: result
        ? { id: result.id, orderNumber: result.orderNumber, updatedAt: result.updatedAt.toISOString() }
        : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to cancel order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
