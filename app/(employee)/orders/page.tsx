import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import EmployeeSidebar from "@/app/(employee)/components/EmployeeSidebar";
import OrdersListClient from "./OrdersListClient";

async function getOrdersData() {
  try {
    const user = await requireRole(["ADMIN", "EMPLOYEE"]);
    const orders = await prisma.order.findMany({
      where: {
        employeeId: user.id,
      },
      orderBy: { createdAt: "desc" },
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

    return {
      user,
      orders: orders.map((order) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      })),
    };
  } catch {
    redirect("/login");
  }
}

export default async function EmployeeOrdersPage() {
  const { user, orders } = await getOrdersData();
  return (
    <>
      <EmployeeSidebar userName={user.name} userEmail={user.email} userAvatar={user.avatar} />
      <main className="min-h-screen lg:ml-72 bg-[#F3EFE8] text-[#000505]">
        <OrdersListClient initialOrders={orders as any} employeeName={user.name} />
      </main>
    </>
  );
}
