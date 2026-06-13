import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/sessions";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("UNAUTHORIZED");
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.discountValue !== undefined) {
      updateData.discountValue = Number(body.discountValue);
    }
    if (body.minOrderAmount !== undefined) {
      updateData.minOrderAmount = body.minOrderAmount
        ? Number(body.minOrderAmount)
        : null;
    }
    if (body.minQuantity !== undefined) {
      updateData.minQuantity = body.minQuantity
        ? Number(body.minQuantity)
        : null;
    }
    if (body.validTill !== undefined) {
      updateData.validTill = body.validTill ? new Date(body.validTill) : null;
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error("[PATCH /api/admin/promotions/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update promotion" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await prisma.promotion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/promotions/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete promotion" },
      { status: 500 }
    );
  }
}