import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CustomersClient from "./CustomersClient";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);
  } catch {
    redirect("/login");
  }

  const customers = await prisma.customer.findMany({
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

  return <CustomersClient initialCustomers={customers} />;
}