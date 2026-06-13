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

    const order = await prisma.order.update({
      where: { id, employeeId: user.id, status: "CANCELLED" },
      data: { status: "PAID" },
      include: {
        customer: true,
        items: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
    });

    return NextResponse.json({
      order: {
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to restore cancelled order" },
      { status: 500 },
    );
  }
}
