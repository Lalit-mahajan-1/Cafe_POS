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

    const updatedRows = await prisma.$executeRaw`
      UPDATE "Order"
      SET "status" = 'CANCELLED'::"OrderStatus", "updatedAt" = NOW()
      WHERE "id" = ${id}
        AND "employeeId" = ${user.id}
        AND "status" = 'PAID'::"OrderStatus"
    `;

    if (updatedRows === 0) {
      return NextResponse.json(
        { error: "Order is not active for this employee" },
        { status: 404 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, updatedAt: true },
    });

    return NextResponse.json({
      cancelledOrder: order
        ? { ...order, updatedAt: order.updatedAt.toISOString() }
        : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to cancel order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
