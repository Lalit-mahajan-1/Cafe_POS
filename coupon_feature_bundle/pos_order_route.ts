import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

type OrderLineInput = { productId: string; quantity: number };

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const customerId = body.customerId ? String(body.customerId) : null;
    const tableId = body.tableId ? String(body.tableId) : null;
    const paymentMethod = body.paymentMethod ? String(body.paymentMethod) : null;
    const manualDiscount = Number(body.discount || 0);
    const couponCode = body.couponCode ? String(body.couponCode).trim().toUpperCase() : null;
    const items = Array.isArray(body.items) ? (body.items as OrderLineInput[]) : [];

    if (!tableId) {
      return NextResponse.json({ error: "Table selection is required" }, { status: 400 });
    }

    if (!items.length) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (table.orders.length > 0) {
      return NextResponse.json({ error: `Table ${table.label} already has an active order` }, { status: 409 });
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const lineTotal = product.price * item.quantity;
      const lineTax = (lineTotal * product.tax) / 100;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal,
        taxAmount: lineTax,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = orderItems.reduce((sum, item) => sum + item.taxAmount, 0);

    const discounts = await prisma.discount.findMany({
      where: { isActive: true },
      include: { product: true },
    });

    const applicableDiscounts = discounts.filter((discount) => {
      if (discount.kind === "COUPON") {
        return Boolean(couponCode && discount.code === couponCode);
      }

      if (discount.kind === "PRODUCT") {
        if (!discount.productId || !discount.minQuantity) return false;
        return orderItems.some(
          (item) => item.productId === discount.productId && item.quantity >= discount.minQuantity!
        );
      }

      if (discount.kind === "ORDER") {
        return Number(discount.minOrderAmount || 0) <= subtotal;
      }

      return false;
    });

    const computedDiscounts = applicableDiscounts.map((discount) => {
      if (discount.valueType === "PERCENTAGE") {
        return subtotal * (discount.value / 100);
      }
      return Math.min(discount.value, subtotal);
    });

    const promoDiscount = computedDiscounts.reduce((sum, amount) => sum + amount, 0);
    const safeManualDiscount = Math.max(0, Number.isNaN(manualDiscount) ? 0 : manualDiscount);
    const safeDiscount = Math.min(subtotal, safeManualDiscount + promoDiscount);
    const total = Math.max(0, subtotal + taxAmount - safeDiscount);

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          employeeId: currentUser.id,
          customerId: customerId || null,
          tableId,
          subtotal,
          taxAmount,
          discount: safeDiscount,
          total,
          status: "DRAFT",
          paymentMethod,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Order creation failed" }, { status: 500 });
  }
}
