import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, tableId, paymentMethod, discount, couponCode, items } =
      body as {
      customerId?: string;
      tableId: string;
      paymentMethod: string;
      discount: number;
      couponCode?: string | null;
      items: { productId: string; quantity: number }[];
    };
    const normalizedCouponCode = couponCode?.trim().toUpperCase() || null;

    // ── Validate ───────────────────────────────────────────────────────────
    if (!tableId) {
      return NextResponse.json(
        { error: "Table selection is required" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // ── Check table exists and is free ─────────────────────────────────────
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        orders: {
          where: { status: "DRAFT" },
          take: 1,
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    if (table.orders.length > 0) {
      return NextResponse.json(
        { error: `Table ${table.label} already has an active order` },
        { status: 409 }
      );
    }

    // ── Fetch products ─────────────────────────────────────────────────────
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products not found" },
        { status: 404 }
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // ── Calculate totals ───────────────────────────────────────────────────
    let subtotal = 0;
    let taxAmount = 0;

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const lineTotal = product.price * item.quantity;
      const lineTax = (lineTotal * product.tax) / 100;

      subtotal += lineTotal;
      taxAmount += lineTax;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal,
      };
    });

    let couponDiscount = 0;

    if (normalizedCouponCode) {
      const coupon = await prisma.discount.findUnique({
        where: { code: normalizedCouponCode },
      });

      if (!coupon || !coupon.isActive || coupon.kind !== "COUPON") {
        return NextResponse.json(
          { error: "Coupon code is invalid or inactive" },
          { status: 400 }
        );
      }

      if (
        coupon.minOrderAmount != null &&
        subtotal < coupon.minOrderAmount
      ) {
        return NextResponse.json(
          {
            error: `Coupon requires a minimum order of ₹${coupon.minOrderAmount}`,
          },
          { status: 400 }
        );
      }

      couponDiscount =
        coupon.valueType === "PERCENTAGE"
          ? subtotal * (coupon.value / 100)
          : coupon.value;
    }

    const manualDiscount = Math.max(0, discount || 0);
    const discountAmount = Math.min(subtotal, manualDiscount + couponDiscount);
    const total = Math.max(0, subtotal + taxAmount - discountAmount);

    // ── Generate order number ──────────────────────────────────────────────
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;

    // ── Create order + mark table OCCUPIED in one transaction ──────────────
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          employeeId: currentUser.id,
          customerId: customerId || null,
          tableId,
          subtotal,
          taxAmount,
          discount: discountAmount,
          total,
          status: "DRAFT",
          paymentMethod,
          items: {
            create: orderItems,
          },
        },
        include: {
          customer: true,
          employee: {
            select: { name: true, email: true },
          },
          table: {
            select: { id: true, label: true },
          },
          items: {
            include: { product: true },
          },
        },
      });

      await tx.table.update({
        where: { id: tableId },
        data: { status: "OCCUPIED" },
      });

      return newOrder;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/pos/orders]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Order creation failed",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("tableId");
    const status = searchParams.get("status");

    const orders = await prisma.order.findMany({
      where: {
        ...(tableId && { tableId }),
        ...(status && {
          status: status as "DRAFT" | "PAID" | "CANCELLED" | "COMPLETED",
        }),
      },
      include: {
        customer: true,
        employee: {
          select: { name: true, email: true },
        },
        table: {
          select: { id: true, label: true },
        },
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[GET /api/pos/orders]", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
