import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function ensureCompletedStatusExists() {
  await prisma.$executeRaw`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'COMPLETED'`;
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(["ADMIN", "EMPLOYEE"]);
    const { id } = await params;
    await ensureCompletedStatusExists();

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id,
          employeeId: user.id,
          status: "PAID",
        },
      });

      if (!order) return null;

      const updated = await tx.order.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      // ── Free table when order is completed ──────────────────────────
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

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to complete order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
