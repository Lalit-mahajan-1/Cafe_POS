import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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

    const kind = String(body.kind || "COUPON");
    const valueType = String(body.valueType || "PERCENTAGE");
    const value = Number(body.value || 0);
    const description = body.description ? String(body.description) : null;
    const name = body.name ? String(body.name) : null;
    const code = body.code ? String(body.code).trim().toUpperCase() : null;
    const productId = body.productId ? String(body.productId) : null;
    const minQuantity = body.minQuantity != null ? Number(body.minQuantity) : null;
    const minOrderAmount = body.minOrderAmount != null ? Number(body.minOrderAmount) : null;

    if (!value || Number.isNaN(value) || value <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than zero" }, { status: 400 });
    }

    if (kind === "COUPON" && !code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    if (kind === "PRODUCT" && (!productId || !minQuantity || minQuantity <= 0)) {
      return NextResponse.json({ error: "Product promotion requires a product and minimum quantity" }, { status: 400 });
    }

    if (kind === "ORDER" && (!minOrderAmount || minOrderAmount <= 0)) {
      return NextResponse.json({ error: "Order promotion requires a minimum order amount" }, { status: 400 });
    }

    const discount = await prisma.discount.create({
      data: {
        name,
        code,
        kind: kind as "COUPON" | "PRODUCT" | "ORDER",
        valueType: valueType as "PERCENTAGE" | "FIXED",
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
    const message = error instanceof Error ? error.message : "Unable to create discount";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
