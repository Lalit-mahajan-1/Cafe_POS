import AdminOrdersClient from "./AdminOrdersClient";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function getAdminKitchenData() {
  try {
    const user = await requireRole(["ADMIN"]);
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["PAID", "DRAFT"] },
      },
      orderBy: { createdAt: "asc" },
      include: {
        customer: true,
        table: true,
        coupon: true,
        items: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
    });
    const cancelledOrders = await prisma.order.findMany({
      where: {
        status: "CANCELLED",
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        updatedAt: true,
      },
    });

    return {
      user,
      orders: orders.map((order) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      })),
      cancelledOrders: cancelledOrders.map((order) => ({
        ...order,
        updatedAt: order.updatedAt.toISOString(),
      })),
    };
  } catch {
    redirect("/login");
  }
}

export default async function AdminOrdersPage() {
  const { orders, cancelledOrders } = await getAdminKitchenData();

  return (
    <AdminOrdersClient
      initialCancelledOrders={cancelledOrders}
      initialOrders={orders}
    />
  );
}
