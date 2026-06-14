"use client";

import { useEffect, useMemo, useState } from "react";
import { Fraunces } from "next/font/google";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Search,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

type Period = "today" | "7d" | "30d" | "all";

type Metric = {
  label: string;
  value: string;
  change: string;
  helper: string;
  icon: LucideIcon;
};

type SelectOption = {
  id: string;
  name: string;
};

type SalesPoint = {
  label: string;
  value: number;
};

type CategoryMixItem = {
  label: string;
  value: number;
  revenue: string;
  color: string;
};

type OrderRow = {
  order: string;
  status: string;
  paymentMethod: string;
  date: string;
  customer: string;
  employee: string;
  total: string;
};

type ReportData = {
  filters: {
    period: Period;
    periodLabel: string;
    users: SelectOption[];
    products: SelectOption[];
    categories: Array<SelectOption & { color: string }>;
  };
  metrics: {
    totalOrders: { value: number; change: string; helper: string };
    revenue: { value: string; change: string; helper: string };
    averageOrder: { value: string; change: string; helper: string };
  };
  salesSeries: SalesPoint[];
  categoryMix: CategoryMixItem[];
  topOrders: OrderRow[];
  topProducts: Array<{ product: string; qty: number; revenue: string }>;
  topCategories: Array<{ category: string; revenue: string }>;
};

type Filters = {
  period: Period;
  userId: string;
  productId: string;
  search: string;
};

const cardShadow =
  "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)";

const periodOptions: Array<{ value: Period; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const positiveChange = (change: string) => !change.trim().startsWith("-");

function ReportFilters({
  filters,
  data,
  onChange,
}: {
  filters: Filters;
  data: ReportData | null;
  onChange: (nextFilters: Filters) => void;
}) {
  const selectedUser = data?.filters.users.find((user) => user.id === filters.userId);
  const selectedProduct = data?.filters.products.find(
    (product) => product.id === filters.productId
  );

  return (
    <div
      className="bg-[#FDFBF7] rounded-lg p-4"
      style={{ boxShadow: cardShadow }}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <label className="group flex items-center gap-2 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3 py-2 text-sm font-medium text-[#705C53] transition-all duration-200 focus-within:border-[#C86446]">
            <CalendarDays className="w-4 h-4 text-[#C4B8AC] group-focus-within:text-[#C86446]" />
            <select
              value={filters.period}
              onChange={(event) =>
                onChange({ ...filters, period: event.target.value as Period })
              }
              className="bg-transparent text-sm font-medium text-[#705C53] outline-none"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="group flex items-center gap-2 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3 py-2 text-sm font-medium text-[#705C53] transition-all duration-200 focus-within:border-[#C86446]">
            <UserRound className="w-4 h-4 text-[#C4B8AC] group-focus-within:text-[#C86446]" />
            <select
              value={filters.userId}
              onChange={(event) =>
                onChange({ ...filters, userId: event.target.value })
              }
              className="max-w-40 bg-transparent text-sm font-medium text-[#705C53] outline-none"
            >
              <option value="">All users</option>
              {data?.filters.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <label className="group flex items-center gap-2 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3 py-2 text-sm font-medium text-[#705C53] transition-all duration-200 focus-within:border-[#C86446]">
            <Filter className="w-4 h-4 text-[#C4B8AC] group-focus-within:text-[#C86446]" />
            <select
              value={filters.productId}
              onChange={(event) =>
                onChange({ ...filters, productId: event.target.value })
              }
              className="max-w-44 bg-transparent text-sm font-medium text-[#705C53] outline-none"
            >
              <option value="">All products</option>
              {data?.filters.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="relative w-full xl:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4B8AC]" />
          <input
            type="text"
            placeholder="Search report rows..."
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
          />
        </div>
      </div>

      {(selectedUser || selectedProduct) && (
        <p className="mt-3 text-xs text-[#C4B8AC]">
          Showing {selectedUser?.name ?? "all users"} and{" "}
          {selectedProduct?.name ?? "all products"}.
        </p>
      )}
    </div>
  );
}

function ExportMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 bg-[#C86446] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-[#E8E0D8] bg-[#FDFBF7]"
          style={{ boxShadow: cardShadow }}
        >
          <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#705C53] hover:bg-[#F3EFE8] hover:text-[#000505] transition-colors">
            <FileText className="w-4 h-4 text-[#C86446]" />
            PDF report
          </button>
          <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#705C53] hover:bg-[#F3EFE8] hover:text-[#000505] transition-colors">
            <FileSpreadsheet className="w-4 h-4 text-[#C86446]" />
            XLS report
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="bg-[#FDFBF7] rounded-lg p-5"
          style={{ boxShadow: cardShadow }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#705C53]">
              {metric.label}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F3EFE8] flex items-center justify-center">
              <metric.icon className="w-4 h-4 text-[#705C53]" />
            </div>
          </div>
          <p
            className={`${fraunces.className} mt-3 text-4xl font-bold text-[#000505]`}
          >
            {metric.value}
          </p>
          <p className="mt-3 text-xs text-[#705C53]">
            <span
              className={`font-semibold ${positiveChange(metric.change) ? "text-green-600" : "text-[#A84C32]"
                }`}
            >
              {metric.change}
            </span>{" "}
            {metric.helper}
          </p>
        </div>
      ))}
    </div>
  );
}

function SalesChart({ points: salesPoints }: { points: SalesPoint[] }) {
  const chartPoints = salesPoints.length
    ? salesPoints
    : [{ label: "No orders", value: 0 }];
  const max = Math.max(...chartPoints.map((point) => point.value), 1);
  const width = 430;
  const plotStart = 40;
  const plotEnd = 392;
  const step =
    chartPoints.length > 1 ? (plotEnd - plotStart) / (chartPoints.length - 1) : 0;
  const points = chartPoints
    .map((point, index) => {
      const x = plotStart + index * step;
      const y = 190 - (point.value / max) * 150;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `${plotStart},190 ${points} ${plotEnd},190`;

  return (
    <section
      className="bg-[#FDFBF7] rounded-lg p-5"
      style={{ boxShadow: cardShadow }}
    >
      <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
        Sales
      </h2>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} 240`} className="min-w-[430px] w-full h-64">
          {[0, 1, 2, 3].map((line) => (
            <line
              key={line}
              x1="40"
              x2="404"
              y1={40 + line * 50}
              y2={40 + line * 50}
              stroke="#E8E0D8"
              strokeWidth="1"
            />
          ))}
          {chartPoints.map((_, line) => (
            <line
              key={line}
              x1={plotStart + line * step}
              x2={plotStart + line * step}
              y1="35"
              y2="190"
              stroke="#F0E9E1"
              strokeWidth="1"
            />
          ))}
          <text x="0" y="45" className="fill-[#705C53] text-[12px]">
            ${Math.round(max)}
          </text>
          <text x="8" y="95" className="fill-[#705C53] text-[12px]">
            ${Math.round(max * 0.66)}
          </text>
          <text x="12" y="145" className="fill-[#705C53] text-[12px]">
            ${Math.round(max * 0.33)}
          </text>
          <text x="18" y="195" className="fill-[#705C53] text-[12px]">
            $0
          </text>
          <polygon points={areaPoints} fill="#7FB2D9" opacity="0.55" />
          <polyline
            points={points}
            fill="none"
            stroke="#2F7FB8"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {chartPoints.map((point, index) => {
            const x = plotStart + index * step;
            const y = 190 - (point.value / max) * 150;
            return (
              <g key={`${point.label}-${index}`}>
                <circle cx={x} cy={y} r="3" fill="#2F7FB8" />
                {(index === 0 ||
                  index === chartPoints.length - 1 ||
                  index % 2 === 0) && (
                    <text
                      x={Math.max(24, x - 18)}
                      y="222"
                      className="fill-[#705C53] text-[13px] font-semibold"
                    >
                      {point.label}
                    </text>
                  )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function ProductMixChart({ items }: { items: CategoryMixItem[] }) {
  const gradient = useMemo(() => {
    if (!items.length) return "#F3EFE8";

    let start = 0;
    return items
      .map((item) => {
        const end = start + item.value * 3.6;
        const segment = `${item.color} ${start}deg ${end}deg`;
        start = end;
        return segment;
      })
      .join(", ");
  }, [items]);

  return (
    <section
      className="bg-[#FDFBF7] rounded-lg p-5"
      style={{ boxShadow: cardShadow }}
    >
      <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
        Product Mix
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr] md:items-center">
        <div
          className="mx-auto flex h-52 w-52 items-center justify-center rounded-full"
          style={{
            background: items.length ? `conic-gradient(${gradient})` : gradient,
          }}
        >
          {!items.length && (
            <span className="text-sm font-medium text-[#C4B8AC]">No data</span>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm text-[#705C53]">
            Category contribution by paid order item revenue.
          </p>
          {items.length ? (
            items.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-[#000505]">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
                <span className="text-sm text-[#705C53]">
                  {item.value}% · {item.revenue}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#C4B8AC]">No category sales yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

import {
  Coffee,
  Cookie,
  Sandwich,
  Croissant,
  Leaf,
  CakeSlice,
} from "lucide-react";

// Maps category name -> icon component shown in the "Category" column
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Coffee: Coffee,
  Tea: Leaf,
  Desserts: CakeSlice,
  Pastries: Croissant,
  Sandwiches: Sandwich,
  Snacks: Cookie,
  Beverages: Coffee,
};

function getCategoryIcon(category: string) {
  return categoryIcons[category] || Coffee;
}

function TopOrdersTable({ rows }: { rows: OrderRow[] }) {
  return (
    <section
      className="bg-[#FDFBF7] rounded-lg p-5"
      style={{ boxShadow: cardShadow }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`${fraunces.className} text-base font-bold text-[#00746B]`}>
          Top Orders
        </h2>
        <span className="text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">
          Highest value
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-[#E8E0D8]">
              {["Order", "Status", "Payment", "Date", "Customer", "Employee", "Total"].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-3 py-2 text-left text-xs font-medium text-[#705C53] uppercase tracking-[0.08em]"
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((order) => (
                <tr
                  key={order.order}
                  className="border-b border-[#F0E9E1] last:border-0 odd:bg-[#F3EFE8]/45"
                >
                  <td className="px-3 py-3 text-sm font-semibold text-[#00746B]">
                    {order.order}
                  </td>
                  <td className="px-3 py-3 text-sm text-[#705C53]">
                    {order.status}
                  </td>
                  <td className="px-3 py-3 text-sm capitalize text-[#705C53]">
                    {order.paymentMethod}
                  </td>
                  <td className="px-3 py-3 text-sm text-[#705C53]">
                    {order.date}
                  </td>
                  <td className="px-3 py-3 text-sm text-[#705C53]">
                    {order.customer}
                  </td>
                  <td className="px-3 py-3 text-sm text-[#705C53]">
                    {order.employee}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-semibold text-[#000505]">
                    {order.total}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-[#C4B8AC]">
                  No paid orders found for this report.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RankingTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Array<Record<string, string | number>>;
  columns: string[];
}) {
  return (
    <section
      className="bg-[#FDFBF7] rounded-lg p-5"
      style={{ boxShadow: cardShadow }}
    >
      <h2 className={`${fraunces.className} text-base font-bold text-[#1B72C9]`}>
        {title}
      </h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-[#E8E0D8]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E0D8]">
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-xs font-medium text-[#705C53] uppercase tracking-[0.08em]"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={`${title}-${index}`}
                  className="border-b border-[#F0E9E1] last:border-0 odd:bg-[#F3EFE8]/60"
                >
                  {columns.map((column) => {
                    // Product column: show a small square cover thumbnail next to the name
                    if (column === "Product") {
                      const image = row.image as string | undefined;
                      return (
                        <td
                          key={column}
                          className="px-4 py-3 text-sm font-medium text-[#000505]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#F3EFE8] flex items-center justify-center overflow-hidden shrink-0">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt={String(row[column])}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Coffee className="w-4 h-4 text-[#705C53]" />
                              )}
                            </div>
                            <span>{row[column]}</span>
                          </div>
                        </td>
                      );
                    }

                    // Category column: show an icon representing the category
                    if (column === "Category") {
                      const Icon = getCategoryIcon(String(row[column]));
                      return (
                        <td
                          key={column}
                          className="px-4 py-3 text-sm font-medium text-[#000505]"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#F3EFE8] flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5 text-[#705C53]" />
                            </div>
                            <span>{row[column]}</span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={column}
                        className="px-4 py-3 text-sm font-medium text-[#000505]"
                      >
                        {row[column]}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-[#C4B8AC]"
                >
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export default function AdminDashboard() {
  const [filters, setFilters] = useState<Filters>({
    period: "all",
    userId: "",
    productId: "",
    search: "",
  });
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ period: filters.period });
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.productId) params.set("productId", filters.productId);

      fetch(`/api/admin/reports?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Unable to load reports");
          return data as ReportData;
        })
        .then((data) => setReport(data))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Unable to load reports");
          setReport(null);
        })
        .finally(() => setLoading(false));
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [filters.period, filters.userId, filters.productId]);

  const metrics = useMemo<Metric[]>(() => {
    const current = report?.metrics;

    return [
      {
        label: "Total Orders",
        value: String(current?.totalOrders.value ?? 0),
        change: current?.totalOrders.change ?? "+0.0%",
        helper: current?.totalOrders.helper ?? "Since previous period",
        icon: ClipboardList,
      },
      {
        label: "Revenue",
        value: current?.revenue.value ?? "$0.00",
        change: current?.revenue.change ?? "+0.0%",
        helper: current?.revenue.helper ?? "Since previous period",
        icon: TrendingUp,
      },
      {
        label: "Average Order",
        value: current?.averageOrder.value ?? "$0.00",
        change: current?.averageOrder.change ?? "+0.0%",
        helper: current?.averageOrder.helper ?? "Since previous period",
        icon: CalendarDays,
      },
    ];
  }, [report]);

  const search = filters.search.trim().toLowerCase();
  const filteredOrders = useMemo(() => {
    const rows = report?.topOrders ?? [];
    if (!search) return rows;

    return rows.filter((order) =>
      Object.values(order).some((value) =>
        String(value).toLowerCase().includes(search)
      )
    );
  }, [report, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className={`${fraunces.className} text-xl font-bold text-[#000505]`}>
            Reports
          </h1>
          <p className="text-sm text-[#705C53] mt-0.5">
            Review sales, orders, products, and category performance.
          </p>
        </div>
        <ExportMenu />
      </div>

      <ReportFilters filters={filters} data={report} onChange={setFilters} />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F5D6CC] bg-[#FFF4F0] px-4 py-3 text-sm text-[#A84C32]">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-4 py-3 text-sm text-[#705C53]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading report data...
        </div>
      )}

      <MetricCards metrics={metrics} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SalesChart points={report?.salesSeries ?? []} />
        <ProductMixChart items={report?.categoryMix ?? []} />
      </div>

      <TopOrdersTable rows={filteredOrders} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RankingTable
          title="Top Product"
          rows={report?.topProducts ?? []}
          columns={["Product", "qty", "revenue"]}
        />
        <RankingTable
          title="Top Category"
          rows={report?.topCategories ?? []}
          columns={["category", "revenue"]}
        />
      </div>
    </div>
  );
}
