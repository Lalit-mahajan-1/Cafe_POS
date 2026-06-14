import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import EmployeeSidebar from "@/app/(employee)/components/EmployeeSidebar";
import CustomersClient from "./CustomersClient";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const raw = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          orderNumber: true,
          total: true,
          createdAt: true,
          status: true,
        },
      },
    },
  });

  const customers = raw.map((c) => ({
    id:        c.id,
    name:      c.name,
    phone:     c.phone,
    email:     c.email,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    _count:    c._count,
    orders:    c.orders.map((o) => ({
      orderNumber: o.orderNumber,
      total:       o.total,
      createdAt:   o.createdAt.toISOString(),
      status:      o.status,
    })),
  }));

  return (
    <div className="flex min-h-screen">
      <EmployeeSidebar
        userName={user.name}
        userEmail={user.email}
        userAvatar={user.avatar}
      />

      <div className="flex-1 lg:ml-72">
        <CustomersClient initialCustomers={customers} />
      </div>
    </div>
  );
}