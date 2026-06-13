import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Fraunces } from "next/font/google";
import {
  TrendingUp,
  TrendingDown,
  ReceiptText,
  Users,
  ShoppingBag,
  IndianRupee,
  ChefHat,
  TicketPercent,
  AlertCircle,
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowUpRight,
} from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const fmtShort = (n: number) =>
  n >= 10_00_000
    ? `₹${(n / 10_00_000).toFixed(1)}L`
    : n >= 1_000
      ? `₹${(n / 1_000).toFixed(1)}K`
      : `₹${n}`;

const pct = (curr: number, prev: number) => {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
};

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  sub,
  delta,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  const up = delta !== undefined && delta >= 0;
  return (
    <div
      className={`rounded-xl p-5 ${accent
          ? "bg-[#C86446] text-white"
          : "bg-[#FDFBF7] text-[#000505]"
        }`}
      style={{
        boxShadow: accent
          ? "0 4px 20px rgba(200,100,70,0.25)"
          : "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2 rounded-lg ${accent ? "bg-white/20" : "bg-[#F3EFE8]"
            }`}
        >
          <span className={accent ? "text-white" : "text-[#C86446]"}>{icon}</span>
        </div>
        {delta !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${accent
                ? up
                  ? "bg-white/20 text-white"
                  : "bg-white/20 text-white"
                : up
                  ? "bg-[#F0F9F0] text-[#2D6A2D]"
                  : "bg-[#FFF4F0] text-[#A84C32]"
              }`}
          >
            {up ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p
        className={`text-2xl font-bold tracking-tight ${accent ? "text-white" : "text-[#000505]"
          }`}
      >
        {value}
      </p>
      <p
        className={`text-xs font-medium uppercase tracking-[0.08em] mt-1 ${accent ? "text-white/70" : "text-[#C4B8AC]"
          }`}
      >
        {label}
      </p>
      {sub && (
        <p
          className={`text-xs mt-2 ${accent ? "text-white/80" : "text-[#705C53]"
            }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PAID: {
      label: "Paid",
      cls: "bg-[#F0F9F0] text-[#2D6A2D] border-[#C8E6C8]",
      icon: <Clock3 className="w-3 h-3" />,
    },
    COMPLETED: {
      label: "Completed",
      cls: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    CANCELLED: {
      label: "Cancelled",
      cls: "bg-[#FFF4F0] text-[#A84C32] border-[#F5D6CC]",
      icon: <XCircle className="w-3 h-3" />,
    },
    DRAFT: {
      label: "Draft",
      cls: "bg-[#F3EFE8] text-[#705C53] border-[#E8E0D8]",
      icon: <AlertCircle className="w-3 h-3" />,
    },
  };
  const s = map[status] ?? map.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${s.cls}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const now = new Date();

  // Window boundaries
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(thisMonthStart);

  const [
    // Today
    todayOrders,
    yesterdayOrders,
    // Revenue
    todayRevenue,
    yesterdayRevenue,
    thisMonthRevenue,
    lastMonthRevenue,
    // Orders by status (all time counts for KPIs)
    paidCount,
    completedCount,
    cancelledCount,
    // Staff
    totalStaff,
    activeStaff,
    // Products
    totalProducts,
    // Coupons used today
    couponUsedToday,
    // Recent orders (last 8)
    recentOrders,
    // Top products this month by quantity
    topProducts,
    // Top employees this month by revenue
    topEmployees,
    // Hourly order distribution today (raw)
    hourlyRaw,
  ] = await Promise.all([
    // Today order count (all statuses)
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),

    // Yesterday order count
    prisma.order.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),

    // Today revenue (PAID + COMPLETED)
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: todayStart },
        status: { in: ["PAID", "COMPLETED"] },
      },
    }),

    // Yesterday revenue
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: yesterdayStart, lt: todayStart },
        status: { in: ["PAID", "COMPLETED"] },
      },
    }),

    // This month revenue
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: thisMonthStart },
        status: { in: ["PAID", "COMPLETED"] },
      },
    }),

    // Last month revenue
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
        status: { in: ["PAID", "COMPLETED"] },
      },
    }),

    // Paid (in-kitchen)
    prisma.order.count({
      where: { status: "PAID", createdAt: { gte: todayStart } },
    }),

    // Completed today
    prisma.order.count({
      where: { status: "COMPLETED", createdAt: { gte: todayStart } },
    }),

    // Cancelled today
    prisma.order.count({
      where: { status: "CANCELLED", createdAt: { gte: todayStart } },
    }),

    // Total non-archived staff
    prisma.user.count({ where: { archived: false } }),

    // Staff who placed an order today (active today)
    prisma.order
      .findMany({
        where: { createdAt: { gte: todayStart } },
        select: { employeeId: true },
        distinct: ["employeeId"],
      })
      .then((rows) => rows.length),

    // Total active products
    prisma.product.count(),

    // Coupons applied today
    prisma.order.count({
      where: {
        createdAt: { gte: todayStart },
        couponId: { not: null },
      },
    }),

    // Recent 8 orders
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        customer: { select: { name: true } },
        employee: { select: { name: true } },
        items: { select: { quantity: true } },
      },
    }),

    // Top 5 products this month
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          createdAt: { gte: thisMonthStart },
          status: { in: ["PAID", "COMPLETED"] },
        },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),

    // Top 5 employees this month by revenue
    prisma.order.groupBy({
      by: ["employeeId"],
      where: {
        createdAt: { gte: thisMonthStart },
        status: { in: ["PAID", "COMPLETED"] },
      },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),

    // Today orders by hour (for sparkline)
    prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: { in: ["PAID", "COMPLETED"] },
      },
      select: { createdAt: true, total: true },
    }),
  ]);

  // ── Derived values ───────────────────────────────────────────────────────
  const todayRev = todayRevenue._sum.total ?? 0;
  const yestRev = yesterdayRevenue._sum.total ?? 0;
  const thisMonthRev = thisMonthRevenue._sum.total ?? 0;
  const lastMonthRev = lastMonthRevenue._sum.total ?? 0;

  const revDelta = pct(todayRev, yestRev);
  const orderDelta = pct(todayOrders, yesterdayOrders);
  const monthRevDelta = pct(thisMonthRev, lastMonthRev);

  const avgTicket = todayOrders > 0 ? todayRev / todayOrders : 0;

  // Hourly buckets (6 AM–10 PM)
  const hourBuckets: number[] = Array(17).fill(0); // index 0 = 6 AM, 16 = 10 PM
  hourlyRaw.forEach((o) => {
    const h = o.createdAt.getHours();
    const idx = Math.max(0, Math.min(16, h - 6));
    hourBuckets[idx] += 1;
  });
  const maxBucket = Math.max(...hourBuckets, 1);

  // Resolve product names for top products
  const productIds = topProducts.map((p) => p.productId);
  const productNames = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productNameMap = Object.fromEntries(productNames.map((p) => [p.id, p.name]));

  // Resolve employee names for top employees
  const employeeIds = topEmployees.map((e) => e.employeeId);
  const employeeNames = await prisma.user.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, name: true },
  });
  const employeeNameMap = Object.fromEntries(employeeNames.map((e) => [e.id, e.name]));

  const maxEmpRev = Math.max(...topEmployees.map((e) => e._sum.total ?? 0), 1);
  const maxProdQty = Math.max(...topProducts.map((p) => p._sum.quantity ?? 0), 1);

  const monthName = now.toLocaleString("en-IN", { month: "long" });

  return (
    <div className={fraunces.variable}>
      {/* ── Page header ── */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C86446] mb-1">
          Admin Dashboard
        </p>
        <h1 className={`${fraunces.className} text-2xl font-bold text-[#000505]`}>
          Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"},{" "}
          {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-[#705C53] mt-0.5">
          {now.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Revenue today"
          value={fmtShort(todayRev)}
          sub={`vs ₹${Math.round(yestRev).toLocaleString("en-IN")} yesterday`}
          delta={revDelta}
          icon={<IndianRupee className="w-5 h-5" />}
          accent
        />
        <MetricCard
          label="Orders today"
          value={String(todayOrders)}
          sub={`${completedCount} completed · ${paidCount} in kitchen`}
          delta={orderDelta}
          icon={<ReceiptText className="w-5 h-5" />}
        />
        <MetricCard
          label={`${monthName} revenue`}
          value={fmtShort(thisMonthRev)}
          sub={`Last month: ${fmtShort(lastMonthRev)}`}
          delta={monthRevDelta}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          label="Avg ticket today"
          value={fmt(avgTicket)}
          sub={`${couponUsedToday} coupon${couponUsedToday !== 1 ? "s" : ""} applied today`}
          icon={<TicketPercent className="w-5 h-5" />}
        />
      </div>

      {/* ── Secondary stat strip ── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 rounded-xl bg-[#FDFBF7] px-5 py-4"
        style={{ boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)" }}
      >
        {[
          { label: "Staff on shift today", value: `${activeStaff} / ${totalStaff}`, icon: <Users className="w-4 h-4 text-[#C86446]" /> },
          { label: "Active products", value: totalProducts, icon: <ShoppingBag className="w-4 h-4 text-[#C86446]" /> },
          { label: "In kitchen (PAID)", value: paidCount, icon: <ChefHat className="w-4 h-4 text-[#C86446]" /> },
          { label: "Cancelled today", value: cancelledCount, icon: <XCircle className="w-4 h-4 text-[#C86446]" /> },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F3EFE8] shrink-0">{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-[#000505] leading-tight">{s.value}</p>
              <p className="text-xs text-[#C4B8AC] leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main 2-col section ── */}
      <div className="grid xl:grid-cols-[1.6fr_1fr] gap-6 mb-6">

        {/* Recent orders */}
        <div
          className="bg-[#FDFBF7] rounded-xl overflow-hidden"
          style={{ boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)" }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E0D8]">
            <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
              Recent Orders
            </h2>
            <span className="text-xs text-[#C4B8AC]">Latest 8</span>
          </div>
          <div className="divide-y divide-[#E8E0D8]">
            {recentOrders.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center text-[#C4B8AC]">No orders yet.</p>
            ) : (
              recentOrders.map((order) => {
                const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#F3EFE8]/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#000505] truncate">
                        #{order.orderNumber}
                      </p>
                      <p className="text-xs text-[#C4B8AC] truncate">
                        {order.customer?.name ?? "Walk-in"} · {order.employee.name} · {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <StatusBadge status={order.status} />
                      <span className="text-sm font-bold text-[#000505]">
                        {fmt(order.total)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">

          {/* Today's hourly activity */}
          <div
            className="bg-[#FDFBF7] rounded-xl p-5"
            style={{ boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)" }}
          >
            <h2 className={`${fraunces.className} text-base font-bold text-[#000505] mb-4`}>
              Today&apos;s Order Activity
            </h2>
            {hourlyRaw.length === 0 ? (
              <p className="text-sm text-[#C4B8AC] text-center py-4">No orders yet today.</p>
            ) : (
              <div className="flex items-end gap-1 h-16">
                {hourBuckets.map((count, i) => {
                  const h = i + 6;
                  const barH = Math.max(4, Math.round((count / maxBucket) * 56));
                  const label = h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`;
                  const isNow = new Date().getHours() === h;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${label}: ${count} order${count !== 1 ? "s" : ""}`}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all ${isNow ? "bg-[#C86446]" : count > 0 ? "bg-[#E8D5CC]" : "bg-[#F3EFE8]"
                          }`}
                        style={{ height: `${barH}px` }}
                      />
                      {i % 3 === 0 && (
                        <span className="text-[9px] text-[#C4B8AC]">{label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order status breakdown */}
          <div
            className="bg-[#FDFBF7] rounded-xl p-5"
            style={{ boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)" }}
          >
            <h2 className={`${fraunces.className} text-base font-bold text-[#000505] mb-4`}>
              Today&apos;s Order Breakdown
            </h2>
            {[
              { label: "Completed", count: completedCount, color: "bg-[#1D4ED8]" },
              { label: "In Kitchen", count: paidCount, color: "bg-[#2D6A2D]" },
              { label: "Cancelled", count: cancelledCount, color: "bg-[#A84C32]" },
            ].map((row) => {
              const total = completedCount + paidCount + cancelledCount || 1;
              const w = Math.round((row.count / total) * 100);
              return (
                <div key={row.label} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs text-[#705C53] mb-1">
                    <span>{row.label}</span>
                    <span className="font-semibold">{row.count} ({w}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#F3EFE8] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.color} transition-all`}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom 2-col: top products + top employees ── */}
      <div className="grid xl:grid-cols-2 gap-6">

        {/* Top products this month */}
        <div
          className="bg-[#FDFBF7] rounded-xl overflow-hidden"
          style={{ boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)" }}
        >
          <div className="px-5 py-4 border-b border-[#E8E0D8]">
            <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
              Top Products — {monthName}
            </h2>
            <p className="text-xs text-[#C4B8AC] mt-0.5">By units sold (paid & completed)</p>
          </div>
          <div className="p-5 space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-sm text-[#C4B8AC] text-center py-4">No data for this month.</p>
            ) : (
              topProducts.map((p, i) => {
                const qty = p._sum.quantity ?? 0;
                const rev = p._sum.lineTotal ?? 0;
                const w = Math.round((qty / maxProdQty) * 100);
                return (
                  <div key={p.productId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-[#C4B8AC] w-4 shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-[#000505] truncate">
                          {productNameMap[p.productId] ?? "Unknown"}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-sm font-bold text-[#000505]">{qty} units</span>
                        <span className="text-xs text-[#C4B8AC] ml-2">{fmtShort(rev)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F3EFE8] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#C86446] transition-all"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top employees this month */}
        <div
          className="bg-[#FDFBF7] rounded-xl overflow-hidden"
          style={{ boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)" }}
        >
          <div className="px-5 py-4 border-b border-[#E8E0D8]">
            <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
              Top Staff — {monthName}
            </h2>
            <p className="text-xs text-[#C4B8AC] mt-0.5">By revenue generated (paid & completed)</p>
          </div>
          <div className="divide-y divide-[#E8E0D8]">
            {topEmployees.length === 0 ? (
              <p className="text-sm text-[#C4B8AC] text-center py-8">No data for this month.</p>
            ) : (
              topEmployees.map((e, i) => {
                const rev = e._sum.total ?? 0;
                const orders = e._count.id;
                const w = Math.round((rev / maxEmpRev) * 100);
                return (
                  <div key={e.employeeId} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0
                              ? "bg-[#C86446] text-white"
                              : "bg-[#F3EFE8] text-[#705C53]"
                            }`}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#000505] truncate">
                            {employeeNameMap[e.employeeId] ?? "Unknown"}
                          </p>
                          <p className="text-xs text-[#C4B8AC]">{orders} orders</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#000505] shrink-0 ml-3">
                        {fmtShort(rev)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F3EFE8] overflow-hidden ml-9">
                      <div
                        className="h-full rounded-full bg-[#C86446]/60 transition-all"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}