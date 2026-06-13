import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type OrderLineInput = {
  productId: string;
  quantity: number;
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(["ADMIN", "EMPLOYEE"]);
    const body = await req.json();

    const customerId = body.customerId ? String(body.customerId) : null;
    const paymentMethod = body.paymentMethod ? String(body.paymentMethod) : null;
    const discount = Number(body.discount || 0);
    const lines = Array.isArray(body.items) ? (body.items as OrderLineInput[]) : [];

    if (!lines.length) {
      return NextResponse.json({ error: "Add at least one product to the order" }, { status: 400 });
    }

    if (!paymentMethod || !["cash", "card", "upi"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Choose an enabled payment method" }, { status: 400 });
    }

    const productIds = lines.map((line) => line.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const orderItems = lines.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      const quantity = Number(line.quantity || 0);

      if (!product || quantity <= 0) {
        throw new Error("Invalid product selection");
      }

      return {
        productId: product.id,
        quantity,
        unitPrice: product.price,
        lineTotal: product.price * quantity,
        taxAmount: (product.price * quantity * product.tax) / 100,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = orderItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const safeDiscount = Math.max(0, Number.isNaN(discount) ? 0 : discount);
    const total = Math.max(0, subtotal + taxAmount - safeDiscount);
    const orderNumber = `ORD-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        employeeId: user.id,
        customerId,
        subtotal,
        taxAmount,
        discount: safeDiscount,
        total,
        paymentMethod,
        status: "PAID",
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
        employee: { select: { id: true, name: true, email: true } },
        items: { include: { product: { include: { category: true } } } },
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
