import KitchenDisplayClient from "@/app/components/kds/KitchenDisplayClient";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import EmployeeSidebar from "@/app/components/employee/EmployeeSidebar";

async function getKitchenData() {
  try {
    const user = await requireRole(["ADMIN", "EMPLOYEE"]);
    const orders = await prisma.order.findMany({
      where: {
        employeeId: user.id,
        status: "PAID",
      },
      orderBy: { createdAt: "asc" },
      include: {
        customer: true,
        items: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
    });
    const cancelledOrders = await prisma.order.findMany({
      where: {
        employeeId: user.id,
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

export default async function KitchenDisplay() {

  const { user, orders, cancelledOrders } = await getKitchenData();
  return (

    <><EmployeeSidebar userName={user.name} userEmail={user.email}/>

      <main className="min-h-screen lg:ml-72 bg-[#F3EFE8] text-[#000505]"> 

        <KitchenDisplayClient

          employeeName={user.name}

          initialCancelledOrders={cancelledOrders}

          initialOrders={orders}

        />

      </main>

    </>

  );

}