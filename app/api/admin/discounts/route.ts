import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const discountKinds = ["COUPON", "PRODUCT", "ORDER"] as const;
const discountValueTypes = ["PERCENTAGE", "FIXED"] as const;

type DiscountKind = (typeof discountKinds)[number];
type DiscountValueType = (typeof discountValueTypes)[number];

const isDiscountKind = (value: string): value is DiscountKind =>
  discountKinds.includes(value as DiscountKind);

const isDiscountValueType = (value: string): value is DiscountValueType =>
  discountValueTypes.includes(value as DiscountValueType);

export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: true },
    });

    return NextResponse.json({ discounts });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await req.json();

    const rawKind = String(body.kind || "COUPON").toUpperCase();
    const rawValueType = String(body.valueType || "PERCENTAGE").toUpperCase();
    const kind = isDiscountKind(rawKind) ? rawKind : "COUPON";
    const valueType = isDiscountValueType(rawValueType)
      ? rawValueType
      : "PERCENTAGE";
    const value = Number(body.value || 0);
    const description = body.description ? String(body.description) : null;
    const name = body.name ? String(body.name) : null;
    const code = body.code ? String(body.code).trim().toUpperCase() : null;
    const productId = body.productId ? String(body.productId) : null;
    const minQuantity =
      body.minQuantity != null ? Number(body.minQuantity) : null;
    const minOrderAmount =
      body.minOrderAmount != null ? Number(body.minOrderAmount) : null;

    if (!value || Number.isNaN(value) || value <= 0) {
      return NextResponse.json(
        { error: "Discount value must be greater than zero" },
        { status: 400 }
      );
    }

    if (valueType === "PERCENTAGE" && value > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100" },
        { status: 400 }
      );
    }

    if (kind === "COUPON" && !code) {
      return NextResponse.json(
        { error: "Coupon code is required" },
        { status: 400 }
      );
    }

    if (kind === "PRODUCT" && (!productId || !minQuantity || minQuantity <= 0)) {
      return NextResponse.json(
        {
          error: "Product promotion requires a product and minimum quantity",
        },
        { status: 400 }
      );
    }

    if (kind === "ORDER" && (!minOrderAmount || minOrderAmount <= 0)) {
      return NextResponse.json(
        { error: "Order promotion requires a minimum order amount" },
        { status: 400 }
      );
    }

    const discount = await prisma.discount.create({
      data: {
        name,
        code,
        kind,
        valueType,
        value,
        productId,
        minQuantity,
        minOrderAmount,
        description,
        isActive: true,
      },
    });

    return NextResponse.json({ discount }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to create discount";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await req.json();
    const id = String(body.id || "");

    if (!id) {
      return NextResponse.json(
        { error: "Discount id is required" },
        { status: 400 }
      );
    }

    const discount = await prisma.discount.update({
      where: { id },
      data: { isActive: Boolean(body.isActive) },
    });

    return NextResponse.json({ discount });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to update discount";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
