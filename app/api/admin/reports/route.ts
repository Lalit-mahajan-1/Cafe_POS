import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Period = "today" | "7d" | "30d" | "all";

type ReportOrderItem = {
  quantity: number;
  lineTotal: number;
  product: {
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
      color: string;
    };
  };
};

type ReportOrder = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentMethod: string | null;
  createdAt: Date;
  employee: { id: string; name: string };
  customer: { name: string } | null;
  items: ReportOrderItem[];
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const getPeriodRange = (period: Period) => {
  const now = new Date();
  const end = now;

  if (period === "all") return { start: null, end, previousStart: null, previousEnd: null };

  const start = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  }

  if (period === "7d") {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  }

  if (period === "30d") {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }

  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start);
  const previousStart = new Date(start.getTime() - duration);

  return { start, end, previousStart, previousEnd };
};

const getPeriodLabel = (period: Period) => {
  if (period === "today") return "Today";
  if (period === "7d") return "Last 7 days";
  if (period === "30d") return "Last 30 days";
  return "All time";
};

const toChangeLabel = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const buildSalesSeries = (orders: ReportOrder[], period: Period) => {
  if (period === "today") {
    const buckets = [9, 12, 15, 18, 21].map((hour) => ({
      label: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? "PM" : "AM"}`,
      value: 0,
      hour,
    }));

    for (const order of orders) {
      const hour = order.createdAt.getHours();
      const bucket = buckets.reduce((closest, candidate) =>
        Math.abs(candidate.hour - hour) < Math.abs(closest.hour - hour)
          ? candidate
          : closest
      );
      bucket.value += order.total;
    }

    return buckets.map(({ label, value }) => ({ label, value }));
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  const grouped = new Map<string, number>();

  for (const order of orders) {
    const label = formatter.format(order.createdAt);
    grouped.set(label, (grouped.get(label) ?? 0) + order.total);
  }

  return Array.from(grouped, ([label, value]) => ({ label, value })).slice(-8);
};

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);

    const searchParams = req.nextUrl.searchParams;
    const period = (searchParams.get("period") || "30d") as Period;
    const userId = searchParams.get("userId") || undefined;
    const productId = searchParams.get("productId") || undefined;
    const { start, end, previousStart, previousEnd } = getPeriodRange(period);

    const orderWhere = {
      status: "PAID" as const,
      ...(start ? { createdAt: { gte: start, lte: end } } : {}),
      ...(userId ? { employeeId: userId } : {}),
      ...(productId ? { items: { some: { productId } } } : {}),
    };

    const previousOrderWhere = {
      status: "PAID" as const,
      ...(previousStart && previousEnd
        ? { createdAt: { gte: previousStart, lt: previousEnd } }
        : {}),
      ...(userId ? { employeeId: userId } : {}),
      ...(productId ? { items: { some: { productId } } } : {}),
    };

    const [orders, previousOrders, users, products, categories] =
      await Promise.all([
        prisma.order.findMany({
          where: orderWhere,
          orderBy: { createdAt: "desc" },
          include: {
            employee: { select: { id: true, name: true } },
            customer: { select: { name: true } },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    category: { select: { id: true, name: true, color: true } },
                  },
                },
              },
            },
          },
        }),
        prisma.order.findMany({
          where: previousOrderWhere,
          select: { total: true },
        }),
        prisma.user.findMany({
          where: { archived: false },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.product.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.category.findMany({
          select: { id: true, name: true, color: true },
          orderBy: { name: "asc" },
        }),
      ]);

    const typedOrders = orders as ReportOrder[];
    const revenue = typedOrders.reduce((sum, order) => sum + order.total, 0);
    const previousRevenue = previousOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );
    const averageOrder = typedOrders.length ? revenue / typedOrders.length : 0;
    const previousAverage = previousOrders.length
      ? previousRevenue / previousOrders.length
      : 0;

    const productMap = new Map<
      string,
      { product: string; qty: number; revenue: number }
    >();
    const categoryMap = new Map<
      string,
      { category: string; revenue: number; color: string }
    >();

    for (const order of typedOrders) {
      for (const item of order.items) {
        const product = productMap.get(item.product.id) ?? {
          product: item.product.name,
          qty: 0,
          revenue: 0,
        };
        product.qty += item.quantity;
        product.revenue += item.lineTotal;
        productMap.set(item.product.id, product);

        const category = categoryMap.get(item.product.category.id) ?? {
          category: item.product.category.name,
          revenue: 0,
          color: item.product.category.color,
        };
        category.revenue += item.lineTotal;
        categoryMap.set(item.product.category.id, category);
      }
    }

    const categoryTotal = Array.from(categoryMap.values()).reduce(
      (sum, category) => sum + category.revenue,
      0
    );

    return NextResponse.json({
      filters: {
        period,
        periodLabel: getPeriodLabel(period),
        users,
        products,
        categories,
      },
      metrics: {
        totalOrders: {
          value: typedOrders.length,
          change: toChangeLabel(percentChange(typedOrders.length, previousOrders.length)),
          helper: "Since previous period",
        },
        revenue: {
          value: money(revenue),
          change: toChangeLabel(percentChange(revenue, previousRevenue)),
          helper: "Since previous period",
        },
        averageOrder: {
          value: money(averageOrder),
          change: toChangeLabel(percentChange(averageOrder, previousAverage)),
          helper: "Since previous period",
        },
      },
      salesSeries: buildSalesSeries(typedOrders, period),
      categoryMix: Array.from(categoryMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .map((category) => ({
          label: category.category,
          value: categoryTotal ? Math.round((category.revenue / categoryTotal) * 100) : 0,
          revenue: money(category.revenue),
          color: category.color,
        })),
      topOrders: typedOrders.slice(0, 8).map((order) => ({
        order: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod ?? "Not set",
        date: new Intl.DateTimeFormat("en-US").format(order.createdAt),
        customer: order.customer?.name ?? "Walk-in customer",
        employee: order.employee.name,
        total: money(order.total),
      })),
      topProducts: Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)
        .map((product) => ({
          product: product.product,
          qty: product.qty,
          revenue: money(product.revenue),
        })),
      topCategories: Array.from(categoryMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)
        .map((category) => ({
          category: category.category,
          revenue: money(category.revenue),
        })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to load reports";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
