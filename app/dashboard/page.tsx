import EmployeeMetricCard from "@/app/components/employee/EmployeeMetricCard";
import EmployeeSidebar from "@/app/components/employee/EmployeeSidebar";
import EmployeeTaskCard from "@/app/components/employee/EmployeeTaskCard";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  Bell,
  ChefHat,
  CheckCircle2,
  Clock3,
  Coffee,
  ReceiptText,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type SalesRow = {
  total_sales: number | null;
};

type CompletedRow = {
  completed_count: bigint;
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [todayOrders, activeOrders, recentActiveOrders, salesRows, completedRows] =
    await Promise.all([
      prisma.order.count({
        where: {
          employeeId: user.id,
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.order.count({
        where: {
          employeeId: user.id,
          status: "PAID",
        },
      }),
      prisma.order.findMany({
        where: {
          employeeId: user.id,
          status: "PAID",
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      }),
      prisma.$queryRaw<SalesRow[]>`
        SELECT COALESCE(SUM("total"), 0)::float AS total_sales
        FROM "Order"
        WHERE "employeeId" = ${user.id}
          AND "createdAt" >= ${startOfToday}
          AND "status"::text IN ('PAID', 'COMPLETED')
      `,
      prisma.$queryRaw<CompletedRow[]>`
        SELECT COUNT(*)::bigint AS completed_count
        FROM "Order"
        WHERE "employeeId" = ${user.id}
          AND "createdAt" >= ${startOfToday}
          AND "status"::text = 'COMPLETED'
      `,
    ]);

  const todaySales = salesRows[0]?.total_sales || 0;
  const completedToday = Number(completedRows[0]?.completed_count || 0);
  const averageTicket = todayOrders > 0 ? todaySales / todayOrders : 0;

  const priorityTasks = [
    {
      title: "Create a customer order",
      detail: "Open the POS terminal for customer lookup, product selection, taxes, discount, and billing.",
      status: "POS",
      href: "/pos",
      action: "Open POS",
      icon: <ReceiptText className="size-5" aria-hidden="true" />,
    },
    {
      title: "Complete active kitchen orders",
      detail: `${activeOrders} paid ${activeOrders === 1 ? "order is" : "orders are"} waiting in your kitchen display.`,
      status: "KDS",
      href: "/kds",
      action: "Open KDS",
      icon: <ChefHat className="size-5" aria-hidden="true" />,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F3EFE8] text-[#000505]">
      <EmployeeSidebar userName={user.name} userEmail={user.email} />

      <section className="lg:ml-72">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <header className="rounded-lg bg-[#FDFBF7] p-5 shadow-sm ring-1 ring-[#E6DDD1]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#C86446]">
                  <Coffee className="size-4" aria-hidden="true" />
                  Employee dashboard
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#000505] sm:text-4xl">
                  Welcome back, {user.name}
                </h1>
                <p className="mt-2 max-w-2xl text-[#705C53]">
                  Your live shift view is calculated from orders connected to your employee account.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:flex">
                <div className="rounded-lg bg-[#F3EFE8] px-4 py-3">
                  <p className="text-[#705C53]">Role</p>
                  <p className="mt-1 font-semibold">{user.role}</p>
                </div>
                <div className="rounded-lg bg-[#F3EFE8] px-4 py-3">
                  <p className="text-[#705C53]">Active KDS</p>
                  <p className="mt-1 font-semibold">{activeOrders}</p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Employee order metrics">
            <EmployeeMetricCard
              label="Orders today"
              value={String(todayOrders)}
              detail="All orders created by this employee since shift day start."
              icon={<ReceiptText className="size-6" aria-hidden="true" />}
              variant="terracotta"
            />
            <EmployeeMetricCard
              label="Active orders"
              value={String(activeOrders)}
              detail="Paid orders waiting for kitchen completion."
              icon={<ChefHat className="size-6" aria-hidden="true" />}
            />
            <EmployeeMetricCard
              label="Completed today"
              value={String(completedToday)}
              detail="Kitchen orders marked done by this employee today."
              icon={<CheckCircle2 className="size-6" aria-hidden="true" />}
            />
            <EmployeeMetricCard
              label="Sales today"
              value={formatMoney(todaySales)}
              detail={`Average ticket: ${formatMoney(averageTicket)}.`}
              icon={<TimerReset className="size-6" aria-hidden="true" />}
              variant="espresso"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Shift Selection</h2>
                  <p className="text-sm text-[#705C53]">
                    Choose the right workspace for employee service flow.
                  </p>
                </div>
                <Link
                  href="/pos"
                  className="rounded-md bg-[#C86446] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A84F38]"
                >
                  New order
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {priorityTasks.map((task) => (
                  <EmployeeTaskCard key={task.title} {...task} />
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-[#E6DDD1] bg-[#FDFBF7] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Service Alerts</h2>
                <Bell className="size-5 text-[#C86446]" aria-hidden="true" />
              </div>
              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <Clock3 className="mt-1 size-5 text-[#C86446]" aria-hidden="true" />
                  <p className="text-sm text-[#705C53]">
                    Keep paid orders moving through Kitchen Display until they are completed.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-1 size-5 text-[#C86446]" aria-hidden="true" />
                  <p className="text-sm text-[#705C53]">
                    Completed KDS orders stop counting as active but remain in today&apos;s sales.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="rounded-lg border border-[#E6DDD1] bg-[#FDFBF7] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Your Active Order Queue</h2>
                <p className="text-sm text-[#705C53]">
                  Latest paid orders joined with customer, item, and employee data.
                </p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-[#F3EFE8] px-3 py-1 text-sm font-semibold text-[#705C53]">
                <TrendingUp className="size-4" aria-hidden="true" />
                {activeOrders} active
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-[#E6DDD1]">
              <div className="grid grid-cols-[1fr_1fr_2fr_1fr] bg-[#F3EFE8] px-4 py-3 text-sm font-semibold text-[#705C53]">
                <span>Order</span>
                <span>Customer</span>
                <span>Items</span>
                <span>Created</span>
              </div>
              {recentActiveOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-[1fr_1fr_2fr_1fr] border-t border-[#E6DDD1] px-4 py-4 text-sm"
                >
                  <strong>{order.orderNumber}</strong>
                  <span>{order.customer?.name || "Walk-in"}</span>
                  <span>
                    {order.items
                      .map((item) => `${item.product.name} x ${item.quantity}`)
                      .join(", ")}
                  </span>
                  <span className="font-semibold text-[#C86446]">{formatTime(order.createdAt)}</span>
                </div>
              ))}
              {recentActiveOrders.length === 0 && (
                <div className="border-t border-[#E6DDD1] px-4 py-8 text-center text-sm text-[#705C53]">
                  No active kitchen orders for your account.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
