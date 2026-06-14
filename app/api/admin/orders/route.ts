import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireRole(["ADMIN"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100, // Fetch the latest 100 orders
      include: {
        customer: { select: { name: true, phone: true } },
        table: { select: { label: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    // Format the response for the frontend
    const formattedOrders = orders.map((order) => {
      // Create a string like "2x Cappuccino, 1x Croissant"
      const itemsString = order.items
        .map((item) => `${item.quantity}x ${item.product.name}`)
        .join(", ");

      // Format currency
      const formattedTotal = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(order.total);

      // Determine the elapsed time string
      const elapsedMs = Date.now() - order.updatedAt.getTime();
      const elapsedMins = Math.floor(elapsedMs / 60000);
      const elapsedHours = Math.floor(elapsedMins / 60);
      
      let timeString = "";
      if (elapsedMins < 1) timeString = "Just now";
      else if (elapsedMins < 60) timeString = `${elapsedMins}m ago`;
      else if (elapsedHours < 24) timeString = `${elapsedHours}h ago`;
      else timeString = `${Math.floor(elapsedHours / 24)}d ago`;

      return {
        id: order.orderNumber,
        dbId: order.id,
        items: itemsString || "No items",
        total: formattedTotal,
        status: order.status, // "DRAFT" | "PAID" | "CANCELLED" | "COMPLETED"
        time: timeString,
        createdAt: order.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error("[GET /api/admin/orders]", error);
    return NextResponse.json(
      { error: "Failed to fetch admin orders" },
      { status: 500 }
    );
  }
}
