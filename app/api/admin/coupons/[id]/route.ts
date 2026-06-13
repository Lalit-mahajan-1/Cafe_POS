import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("UNAUTHORIZED");
  return user;
}

// PATCH — update coupon
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.discountValue !== undefined) {
      const value = Number(body.discountValue);
      if (value <= 0) {
        return NextResponse.json(
          { error: "Discount value must be greater than 0" },
          { status: 400 }
        );
      }
      updateData.discountValue = value;
    }
    if (body.minOrderAmount !== undefined) {
      updateData.minOrderAmount = body.minOrderAmount
        ? Number(body.minOrderAmount)
        : null;
    }
    if (body.validTill !== undefined) {
      updateData.validTill = body.validTill ? new Date(body.validTill) : null;
    }
    if (body.maxUsage !== undefined) {
      updateData.maxUsage = body.maxUsage ? Number(body.maxUsage) : null;
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error("[PATCH /api/admin/coupons/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update coupon" },
      { status: 500 }
    );
  }
}

// DELETE — delete coupon
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    await prisma.coupon.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    console.error("[DELETE /api/admin/coupons/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}

// GET — single coupon
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ coupon });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}