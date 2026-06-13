import EmployeeMetricCard from "@/app/components/employee/EmployeeMetricCard";
import EmployeeSidebar from "@/app/components/employee/EmployeeSidebar";
import EmployeeTaskCard from "@/app/components/employee/EmployeeTaskCard";
import { getCurrentUser } from "@/lib/auth/session";
import {
  Bell,
  CalendarDays,
  ChefHat,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Coffee,
  CreditCard,
  PackageCheck,
  ReceiptText,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const priorityTasks = [
  {
    title: "Start a new counter order",
    detail: "Use the POS terminal for dine-in, takeaway, taxes, discounts, and payment method capture.",
    status: "POS",
    href: "/pos",
    action: "Open POS",
    icon: <ReceiptText className="size-5" aria-hidden="true" />,
  },
  {
    title: "Watch kitchen tickets",
    detail: "Keep prepared items moving from order queue to service handoff without delaying the table.",
    status: "KDS",
    href: "/kds",
    action: "Open KDS",
    icon: <ChefHat className="size-5" aria-hidden="true" />,
  },
  {
    title: "Assist QR ordering",
    detail: "Generate or share a QR flow when customers need menu or UPI-ready access.",
    status: "QR",
    href: "/generate-qr",
    action: "Open QR",
    icon: <CreditCard className="size-5" aria-hidden="true" />,
  },
];

const serviceQueue = [
  { ticket: "ORD-0048", table: "Counter", item: "Cappuccino + Croissant", status: "Draft" },
  { ticket: "ORD-0051", table: "T04", item: "Masala Chai + Veg Club", status: "Preparing" },
  { ticket: "ORD-0055", table: "Takeaway", item: "Cold Coffee + Brownie", status: "Payment" },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  const joinedDate = new Date(user.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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
                  Run cafe service from one place: POS orders, kitchen display, customers, products,
                  taxes, discounts, and payments.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:flex">
                <div className="rounded-lg bg-[#F3EFE8] px-4 py-3">
                  <p className="text-[#705C53]">Role</p>
                  <p className="mt-1 font-semibold">{user.role}</p>
                </div>
                <div className="rounded-lg bg-[#F3EFE8] px-4 py-3">
                  <p className="text-[#705C53]">Joined</p>
                  <p className="mt-1 font-semibold">{joinedDate}</p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Employee shift summary">
            <EmployeeMetricCard
              label="Open orders"
              value="12"
              detail="Draft and preparing tickets need employee action."
              icon={<ReceiptText className="size-6" aria-hidden="true" />}
              variant="terracotta"
            />
            <EmployeeMetricCard
              label="Products live"
              value="28"
              detail="Coffee, tea, pastries, sandwiches, desserts, beverages."
              icon={<PackageCheck className="size-6" aria-hidden="true" />}
            />
            <EmployeeMetricCard
              label="Avg handoff"
              value="09m"
              detail="Target service window for cafe counter flow."
              icon={<TimerReset className="size-6" aria-hidden="true" />}
            />
            <EmployeeMetricCard
              label="Shift payments"
              value="Rs 24.8k"
              detail="Cash, card, and UPI are tracked per paid order."
              icon={<CircleDollarSign className="size-6" aria-hidden="true" />}
              variant="espresso"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Priority Work</h2>
                  <p className="text-sm text-[#705C53]">
                    Employee actions mapped to the cafe POS problem flow.
                  </p>
                </div>
                <Link
                  href="/pos"
                  className="rounded-md bg-[#C86446] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A84F38]"
                >
                  New order
                </Link>
              </div>

              <div className="grid gap-4">
                {priorityTasks.map((task) => (
                  <EmployeeTaskCard key={task.title} {...task} />
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg border border-[#E6DDD1] bg-[#FDFBF7] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Service Alerts</h2>
                  <Bell className="size-5 text-[#C86446]" aria-hidden="true" />
                </div>
                <div className="mt-5 space-y-4">
                  <div className="flex gap-3">
                    <Clock3 className="mt-1 size-5 text-[#C86446]" aria-hidden="true" />
                    <p className="text-sm text-[#705C53]">
                      Draft orders should be closed or paid before shift handover.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-1 size-5 text-[#C86446]" aria-hidden="true" />
                    <p className="text-sm text-[#705C53]">
                      Paid orders can move to kitchen display and service handoff.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <CalendarDays className="mt-1 size-5 text-[#C86446]" aria-hidden="true" />
                    <p className="text-sm text-[#705C53]">
                      Test employee login: john@cafe.com with password employee123.
                    </p>
                  </div>
                </div>
              </div>

              <div id="payments" className="rounded-lg bg-[#705C53] p-5 text-[#FDFBF7] shadow-sm">
                <h2 className="text-xl font-semibold">Payment Mix</h2>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#F3EFE8]/75">UPI</span>
                    <strong>48%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#F3EFE8]/75">Card</span>
                    <strong>34%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#F3EFE8]/75">Cash</span>
                    <strong>18%</strong>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="rounded-lg border border-[#E6DDD1] bg-[#FDFBF7] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Live Service Queue</h2>
                <p className="text-sm text-[#705C53]">
                  A cafe-friendly view of order number, table/counter, item summary, and current state.
                </p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-[#F3EFE8] px-3 py-1 text-sm font-semibold text-[#705C53]">
                <TrendingUp className="size-4" aria-hidden="true" />
                Service pace healthy
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-[#E6DDD1]">
              <div className="grid grid-cols-4 bg-[#F3EFE8] px-4 py-3 text-sm font-semibold text-[#705C53]">
                <span>Order</span>
                <span>Table</span>
                <span>Items</span>
                <span>Status</span>
              </div>
              {serviceQueue.map((order) => (
                <div
                  key={order.ticket}
                  className="grid grid-cols-4 border-t border-[#E6DDD1] px-4 py-4 text-sm"
                >
                  <strong>{order.ticket}</strong>
                  <span>{order.table}</span>
                  <span>{order.item}</span>
                  <span className="font-semibold text-[#C86446]">{order.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
