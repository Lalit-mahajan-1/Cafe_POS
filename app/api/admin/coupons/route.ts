import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("UNAUTHORIZED");
  return user;
}

// GET — list all coupons
export async function GET() {
  try {
    await requireAdmin();

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ coupons });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST — create coupon
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    const {
      name,
      code,
      discountType,
      discountValue,
      minOrderAmount,
      validFrom,
      validTill,
      maxUsage,
      description,
    } = body;

    // ── Validate ────────────────────────────────────────────────────────────
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Coupon name is required" },
        { status: 400 }
      );
    }

    if (!code?.trim()) {
      return NextResponse.json(
        { error: "Coupon code is required" },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();

    if (!/^[A-Z0-9_-]{2,20}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: "Code must be 2-20 characters, letters, numbers, - or _ only" },
        { status: 400 }
      );
    }

    if (!["PERCENTAGE", "FIXED"].includes(discountType)) {
      return NextResponse.json(
        { error: "discountType must be PERCENTAGE or FIXED" },
        { status: 400 }
      );
    }

    const value = Number(discountValue);
    if (!value || value <= 0) {
      return NextResponse.json(
        { error: "Discount value must be greater than 0" },
        { status: 400 }
      );
    }

    if (discountType === "PERCENTAGE" && value > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%" },
        { status: 400 }
      );
    }

    // ── Check duplicate code ─────────────────────────────────────────────────
    const existing = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Coupon code "${cleanCode}" already exists` },
        { status: 409 }
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        discountType,
        discountValue: value,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTill: validTill ? new Date(validTill) : null,
        maxUsage: maxUsage ? Number(maxUsage) : null,
        currentUsage: 0,
        isActive: true,
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/coupons]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create coupon" },
      { status: 500 }
    );
  }
}