import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("UNAUTHORIZED");
  return user;
}

// GET — list all promotions
export async function GET() {
  try {
    await requireAdmin();

    const promotions = await prisma.promotion.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: { id: true, name: true, price: true },
        },
      },
    });

    return NextResponse.json({ promotions });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST — create promotion
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    const {
      name,
      appliesTo,
      discountType,
      discountValue,
      minOrderAmount,
      productId,
      minQuantity,
      validFrom,
      validTill,
      description,
    } = body;

    // ── Validate ─────────────────────────────────────────────────────────────
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Promotion name is required" },
        { status: 400 }
      );
    }

    if (!["ORDER", "PRODUCT"].includes(appliesTo)) {
      return NextResponse.json(
        { error: "appliesTo must be ORDER or PRODUCT" },
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

    // ── Type-specific validation ──────────────────────────────────────────────
    if (appliesTo === "ORDER") {
      if (!minOrderAmount || Number(minOrderAmount) <= 0) {
        return NextResponse.json(
          { error: "Order promotion requires a minimum order amount" },
          { status: 400 }
        );
      }
    }

    if (appliesTo === "PRODUCT") {
      if (!productId) {
        return NextResponse.json(
          { error: "Product promotion requires a product" },
          { status: 400 }
        );
      }

      if (!minQuantity || Number(minQuantity) <= 0) {
        return NextResponse.json(
          { error: "Product promotion requires a minimum quantity" },
          { status: 400 }
        );
      }

      // Verify product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
    }

    const promotion = await prisma.promotion.create({
      data: {
        name: name.trim(),
        appliesTo,
        discountType,
        discountValue: value,
        minOrderAmount:
          appliesTo === "ORDER" ? Number(minOrderAmount) : null,
        productId: appliesTo === "PRODUCT" ? productId : null,
        minQuantity:
          appliesTo === "PRODUCT" ? Number(minQuantity) : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTill: validTill ? new Date(validTill) : null,
        isActive: true,
        description: description?.trim() || null,
      },
      include: {
        product: { select: { id: true, name: true, price: true } },
      },
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/promotions]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create promotion" },
      { status: 500 }
    );
  }
}