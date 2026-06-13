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

    const updatedRows = await prisma.$executeRaw`
      UPDATE "Order"
      SET "status" = 'COMPLETED'::"OrderStatus", "updatedAt" = NOW()
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

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to complete order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
