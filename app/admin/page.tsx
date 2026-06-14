"use client";

import { useEffect, useMemo, useState } from "react";
import { Fraunces } from "next/font/google";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Coffee,
  Cookie,
  Croissant,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  CakeSlice,
  Leaf,
  Loader2,
  Sandwich,
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
  topProducts: Array<{ Product: string; image?: string | null; qty: number; revenue: string }>;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const num = parseInt(cleaned, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── PDF Chart Drawing (using only supported jsPDF primitives) ────────────────

/**
 * Draw a sales trend line chart WITHOUT doc.path().
 * Uses doc.lines() for the area fill approximation and doc.line() for the stroke.
 */
function drawSalesChart(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  points: SalesPoint[],
  x: number,
  y: number,
  w: number,
  h: number
): number {
  if (!points.length) return y + h;

  const max = Math.max(...points.map((p) => p.value), 1);
  const padL = 18;
  const padB = 14;
  const plotW = w - padL;
  const plotH = h - padB;
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;

  // Grid lines
  doc.setDrawColor(220, 210, 200);
  doc.setLineWidth(0.25);
  for (let i = 0; i <= 3; i++) {
    const gy = y + (plotH / 3) * i;
    doc.line(x + padL, gy, x + w, gy);
  }

  // Y-axis labels
  doc.setFontSize(6);
  doc.setTextColor(112, 92, 83);
  const fmt = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
  doc.text(fmt(max), x, y + 3);
  doc.text(fmt(max * 0.66), x, y + plotH / 3 + 3);
  doc.text(fmt(max * 0.33), x, y + (plotH * 2) / 3 + 3);
  doc.text("0", x, y + plotH + 3);

  // Compute screen coords
  const coords = points.map((p, i) => ({
    px: x + padL + i * step,
    py: y + plotH - (p.value / max) * plotH,
  }));

  // Draw area fill using many thin horizontal slices (no path API needed)
  // We draw the area as a series of filled trapezoids between consecutive points
  doc.setFillColor(127, 178, 217);
  for (let i = 0; i < coords.length - 1; i++) {
    const x1 = coords[i].px;
    const y1 = coords[i].py;
    const x2 = coords[i + 1].px;
    const y2 = coords[i + 1].py;
    const base = y + plotH;
    // Draw filled trapezoid as two triangles
    // Triangle 1: (x1,base), (x1,y1), (x2,y2)
    doc.setFillColor(127, 178, 217);
    // jsPDF triangle: doc.triangle(x1,y1, x2,y2, x3,y3, style)
    doc.triangle(x1, base, x1, y1, x2, y2, "F");
    // Triangle 2: (x1,base), (x2,y2), (x2,base)
    doc.triangle(x1, base, x2, y2, x2, base, "F");
  }

  // Stroke line on top
  doc.setDrawColor(47, 127, 184);
  doc.setLineWidth(0.8);
  for (let i = 1; i < coords.length; i++) {
    doc.line(coords[i - 1].px, coords[i - 1].py, coords[i].px, coords[i].py);
  }

  // Dots + x-axis labels
  doc.setFillColor(47, 127, 184);
  coords.forEach((c, i) => {
    doc.circle(c.px, c.py, 1, "FD");
    if (i === 0 || i === coords.length - 1 || i % Math.max(1, Math.floor(coords.length / 6)) === 0) {
      doc.setFontSize(5.5);
      doc.setTextColor(112, 92, 83);
      const labelX = Math.max(x + padL, Math.min(x + w - 8, c.px - 4));
      doc.text(points[i].label, labelX, y + h);
    }
  });

  return y + h + 4;
}

/**
 * Draw a donut chart using triangle fans (no doc.path needed).
 */
function drawDonutChart(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  items: CategoryMixItem[],
  cx: number,
  cy: number,
  r: number
) {
  if (!items.length) return;

  let startAngle = -Math.PI / 2;

  for (const item of items) {
    const sweep = (item.value / 100) * 2 * Math.PI;
    const [rv, gv, bv] = hexToRgb(item.color);
    doc.setFillColor(rv, gv, bv);
    doc.setDrawColor(rv, gv, bv);

    // Draw filled sector as triangle fan
    const segments = Math.max(6, Math.round((sweep / (2 * Math.PI)) * 36));
    for (let s = 0; s < segments; s++) {
      const a1 = startAngle + (sweep * s) / segments;
      const a2 = startAngle + (sweep * (s + 1)) / segments;
      doc.triangle(
        cx,
        cy,
        cx + r * Math.cos(a1),
        cy + r * Math.sin(a1),
        cx + r * Math.cos(a2),
        cy + r * Math.sin(a2),
        "F"
      );
    }
    startAngle += sweep;
  }

  // White hole for donut
  doc.setFillColor(253, 251, 247);
  doc.setDrawColor(253, 251, 247);
  doc.circle(cx, cy, r * 0.52, "F");
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportPDF(report: ReportData, periodLabel: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(200, 100, 70);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Cafe POS — Sales Report", margin, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Period: ${periodLabel}  ·  Generated: ${new Date().toLocaleString("en-IN")}`,
    pageW - margin,
    14,
    { align: "right" }
  );

  let curY = 30;

  // ── Metric Cards ───────────────────────────────────────────────────────────
  const cardW = (contentW - 8) / 3;
  const metricDefs = [
    {
      label: "Total Orders",
      value: String(report.metrics.totalOrders.value),
      change: report.metrics.totalOrders.change,
      helper: report.metrics.totalOrders.helper,
    },
    {
      label: "Revenue",
      value: report.metrics.revenue.value,
      change: report.metrics.revenue.change,
      helper: report.metrics.revenue.helper,
    },
    {
      label: "Avg Order",
      value: report.metrics.averageOrder.value,
      change: report.metrics.averageOrder.change,
      helper: report.metrics.averageOrder.helper,
    },
  ];

  metricDefs.forEach((m, i) => {
    const cx = margin + i * (cardW + 4);
    doc.setFillColor(243, 239, 232);
    doc.roundedRect(cx, curY, cardW, 24, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(112, 92, 83);
    doc.text(m.label, cx + 4, curY + 7);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 5, 5);
    doc.text(m.value, cx + 4, curY + 16);
    const positive = !m.change.startsWith("-");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(positive ? 22 : 168, positive ? 163 : 76, positive ? 74 : 50);
    doc.text(m.change, cx + cardW - 4, curY + 7, { align: "right" });
    doc.setFontSize(6);
    doc.setTextColor(112, 92, 83);
    doc.text(m.helper, cx + 4, curY + 21);
  });

  curY += 30;

  // ── Sales Chart ────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 5, 5);
  doc.text("Sales Trend", margin, curY);
  curY += 4;

  const chartH = 42;
  doc.setFillColor(253, 251, 247);
  doc.roundedRect(margin, curY, contentW, chartH + 6, 2, 2, "F");

  curY = drawSalesChart(
    doc,
    report.salesSeries,
    margin + 4,
    curY + 4,
    contentW - 8,
    chartH
  );
  curY += 6;

  // ── Product Mix ────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 5, 5);
  doc.text("Product Mix", margin, curY);
  curY += 4;

  const mixBoxH = 56;
  doc.setFillColor(253, 251, 247);
  doc.roundedRect(margin, curY, contentW, mixBoxH, 2, 2, "F");

  const donutR = 20;
  const donutCx = margin + donutR + 10;
  const donutCy = curY + mixBoxH / 2;
  drawDonutChart(doc, report.categoryMix, donutCx, donutCy, donutR);

  // Legend
  let legY = curY + 10;
  const legX = donutCx + donutR + 12;
  doc.setFontSize(7);
  for (const item of report.categoryMix) {
    if (legY > curY + mixBoxH - 4) break;
    const [rv, gv, bv] = hexToRgb(item.color);
    doc.setFillColor(rv, gv, bv);
    doc.rect(legX, legY - 3.5, 4, 4, "F");
    doc.setTextColor(0, 5, 5);
    doc.setFont("helvetica", "bold");
    doc.text(item.label, legX + 6, legY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(112, 92, 83);
    doc.text(`${item.value}%  ·  ${item.revenue}`, legX + 42, legY);
    legY += 7.5;
  }

  curY += mixBoxH + 8;

  // ── Top Orders Table ───────────────────────────────────────────────────────
  if (curY > pageH - 50) { doc.addPage(); curY = 16; }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 116, 107);
  doc.text("Top Orders", margin, curY);
  curY += 3;

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [["Order", "Status", "Payment", "Date", "Customer", "Employee", "Total"]],
    body: report.topOrders.map((o) => [
      o.order, o.status, o.paymentMethod, o.date, o.customer, o.employee, o.total,
    ]),
    headStyles: {
      fillColor: [200, 100, 70],
      textColor: 255,
      fontSize: 7,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 7, textColor: [0, 5, 5] },
    alternateRowStyles: { fillColor: [243, 239, 232] },
    columnStyles: { 6: { halign: "right" } },
    theme: "plain",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 8;

  // ── Top Products (with thumbnails) ─────────────────────────────────────────
  if (curY > pageH - 70) { doc.addPage(); curY = 16; }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 114, 201);
  doc.text("Top Products", margin, curY);
  curY += 3;

  const productImageDataUrls: (string | null)[] = await Promise.all(
    report.topProducts.map((p) =>
      p.image ? fetchImageAsDataUrl(p.image) : Promise.resolve(null)
    )
  );

  const rowH = 13;
  const col0 = contentW * 0.5;
  const col1 = contentW * 0.2;
  const col2 = contentW * 0.3;

  // Header row
  doc.setFillColor(200, 100, 70);
  doc.rect(margin, curY, contentW, 7, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Product", margin + 15, curY + 5);
  doc.text("Qty", margin + col0 + 4, curY + 5);
  doc.text("Revenue", margin + col0 + col1 + 4, curY + 5);
  curY += 7;

  report.topProducts.forEach((p, i) => {
    if (curY > pageH - 20) { doc.addPage(); curY = 16; }

    if (i % 2 === 1) {
      doc.setFillColor(243, 239, 232);
      doc.rect(margin, curY, contentW, rowH, "F");
    }

    const thumbSize = 9;
    const thumbX = margin + 2;
    const thumbY = curY + (rowH - thumbSize) / 2;
    const imgDataUrl = productImageDataUrls[i];

    if (imgDataUrl) {
      try {
        doc.addImage(imgDataUrl, "JPEG", thumbX, thumbY, thumbSize, thumbSize);
      } catch {
        doc.setFillColor(196, 184, 172);
        doc.roundedRect(thumbX, thumbY, thumbSize, thumbSize, 1, 1, "F");
      }
    } else {
      doc.setFillColor(196, 184, 172);
      doc.roundedRect(thumbX, thumbY, thumbSize, thumbSize, 1, 1, "F");
    }

    const textY = curY + rowH / 2 + 2;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 5, 5);
    doc.text(p.Product, margin + thumbSize + 5, textY);
    doc.text(String(p.qty), margin + col0 + 4, textY);
    doc.text(p.revenue, margin + col0 + col1 + 4, textY);

    curY += rowH;
  });

  curY += 8;

  // ── Top Categories ─────────────────────────────────────────────────────────
  if (curY > pageH - 60) { doc.addPage(); curY = 16; }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 114, 201);
  doc.text("Top Categories", margin, curY);
  curY += 3;

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [["Category", "Revenue"]],
    body: report.topCategories.map((c) => [c.category, c.revenue]),
    headStyles: { fillColor: [200, 100, 70], textColor: 255, fontSize: 7, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: [0, 5, 5] },
    alternateRowStyles: { fillColor: [243, 239, 232] },
    columnStyles: { 1: { halign: "right" } },
    theme: "plain",
  });

  // ── Footer on every page ───────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFillColor(243, 239, 232);
    doc.rect(0, pageH - 8, pageW, 8, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(112, 92, 83);
    doc.text("Cafe POS · Confidential", margin, pageH - 3);
    doc.text(`Page ${pg} of ${totalPages}`, pageW - margin, pageH - 3, { align: "right" });
  }

  doc.save(`cafe-report-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

// ─── XLSX Export ──────────────────────────────────────────────────────────────

async function exportXLSX(report: ReportData, periodLabel: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Summary
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Cafe POS — Sales Report"],
    [`Period: ${periodLabel}`],
    [`Generated: ${new Date().toLocaleString("en-IN")}`],
    [],
    ["Metric", "Value", "Change", "Note"],
    [
      "Total Orders",
      report.metrics.totalOrders.value,
      report.metrics.totalOrders.change,
      report.metrics.totalOrders.helper,
    ],
    [
      "Revenue",
      report.metrics.revenue.value,
      report.metrics.revenue.change,
      report.metrics.revenue.helper,
    ],
    [
      "Average Order",
      report.metrics.averageOrder.value,
      report.metrics.averageOrder.change,
      report.metrics.averageOrder.helper,
    ],
  ]);
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Sales Trend
  const salesSheet = XLSX.utils.aoa_to_sheet([
    ["Label", "Revenue (INR)"],
    ...report.salesSeries.map((p) => [p.label, p.value]),
  ]);
  salesSheet["!cols"] = [{ wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, salesSheet, "Sales Trend");

  // Product Mix
  const mixSheet = XLSX.utils.aoa_to_sheet([
    ["Category", "Share (%)", "Revenue"],
    ...report.categoryMix.map((c) => [c.label, c.value, c.revenue]),
  ]);
  mixSheet["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, mixSheet, "Product Mix");

  // All Orders
  const ordersSheet = XLSX.utils.aoa_to_sheet([
    ["Order", "Status", "Payment", "Date", "Customer", "Employee", "Total"],
    ...report.topOrders.map((o) => [
      o.order, o.status, o.paymentMethod, o.date, o.customer, o.employee, o.total,
    ]),
  ]);
  ordersSheet["!cols"] = [
    { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
    { wch: 22 }, { wch: 18 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ordersSheet, "Top Orders");

  // Top Products
  const productsSheet = XLSX.utils.aoa_to_sheet([
    ["Product", "Qty", "Revenue"],
    ...report.topProducts.map((p) => [p.Product, p.qty, p.revenue]),
  ]);
  productsSheet["!cols"] = [{ wch: 28 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, productsSheet, "Top Products");

  // Top Categories
  const categoriesSheet = XLSX.utils.aoa_to_sheet([
    ["Category", "Revenue"],
    ...report.topCategories.map((c) => [c.category, c.revenue]),
  ]);
  categoriesSheet["!cols"] = [{ wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, categoriesSheet, "Top Categories");

  XLSX.writeFile(
    wb,
    `cafe-report-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.xlsx`
  );
}

// ─── UI Components ────────────────────────────────────────────────────────────

function ReportFilters({
  filters,
  data,
  onChange,
}: {
  filters: Filters;
  data: ReportData | null;
  onChange: (nextFilters: Filters) => void;
}) {
  const selectedUser = data?.filters.users.find((u) => u.id === filters.userId);
  const selectedProduct = data?.filters.products.find((p) => p.id === filters.productId);

  return (
    <div className="bg-[#FDFBF7] rounded-lg p-4" style={{ boxShadow: cardShadow }}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <label className="group flex items-center gap-2 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3 py-2 text-sm font-medium text-[#705C53] transition-all duration-200 focus-within:border-[#C86446]">
            <CalendarDays className="w-4 h-4 text-[#C4B8AC] group-focus-within:text-[#C86446]" />
            <select
              value={filters.period}
              onChange={(e) => onChange({ ...filters, period: e.target.value as Period })}
              className="bg-transparent text-sm font-medium text-[#705C53] outline-none"
            >
              {periodOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="group flex items-center gap-2 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3 py-2 text-sm font-medium text-[#705C53] transition-all duration-200 focus-within:border-[#C86446]">
            <UserRound className="w-4 h-4 text-[#C4B8AC] group-focus-within:text-[#C86446]" />
            <select
              value={filters.userId}
              onChange={(e) => onChange({ ...filters, userId: e.target.value })}
              className="max-w-40 bg-transparent text-sm font-medium text-[#705C53] outline-none"
            >
              <option value="">All users</option>
              {data?.filters.users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>

          <label className="group flex items-center gap-2 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3 py-2 text-sm font-medium text-[#705C53] transition-all duration-200 focus-within:border-[#C86446]">
            <Filter className="w-4 h-4 text-[#C4B8AC] group-focus-within:text-[#C86446]" />
            <select
              value={filters.productId}
              onChange={(e) => onChange({ ...filters, productId: e.target.value })}
              className="max-w-44 bg-transparent text-sm font-medium text-[#705C53] outline-none"
            >
              <option value="">All products</option>
              {data?.filters.products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
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
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
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

function ExportMenu({ report }: { report: ReportData | null }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const periodLabel = report?.filters.periodLabel ?? "All time";

  const handleExport = async (type: "pdf" | "xlsx") => {
    if (!report) return;
    setOpen(false);
    setExporting(type);
    try {
      if (type === "pdf") await exportPDF(report, periodLabel);
      else await exportXLSX(report, periodLabel);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((c) => !c)}
        disabled={!report || !!exporting}
        className="flex items-center gap-2 bg-[#C86446] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {exporting ? `Exporting ${exporting.toUpperCase()}…` : "Export"}
        {!exporting && <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-[#E8E0D8] bg-[#FDFBF7]"
          style={{ boxShadow: cardShadow }}
        >
          <button
            onClick={() => handleExport("pdf")}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#705C53] hover:bg-[#F3EFE8] hover:text-[#000505] transition-colors"
          >
            <FileText className="w-4 h-4 text-[#C86446]" />
            PDF report
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#705C53] hover:bg-[#F3EFE8] hover:text-[#000505] transition-colors"
          >
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
            <span className="text-sm font-medium text-[#705C53]">{metric.label}</span>
            <div className="w-8 h-8 rounded-lg bg-[#F3EFE8] flex items-center justify-center">
              <metric.icon className="w-4 h-4 text-[#705C53]" />
            </div>
          </div>
          <p className={`${fraunces.className} mt-3 text-4xl font-bold text-[#000505]`}>
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
  const max = Math.max(...chartPoints.map((p) => p.value), 1);
  const width = 430;
  const plotStart = 40;
  const plotEnd = 392;
  const step =
    chartPoints.length > 1 ? (plotEnd - plotStart) / (chartPoints.length - 1) : 0;
  const coords = chartPoints.map((p, i) => ({
    x: plotStart + i * step,
    y: 190 - (p.value / max) * 150,
  }));
  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${plotStart},190 ${polylinePoints} ${coords[coords.length - 1].x},190`;

  return (
    <section className="bg-[#FDFBF7] rounded-lg p-5" style={{ boxShadow: cardShadow }}>
      <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>Sales</h2>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} 240`} className="min-w-[430px] w-full h-64">
          {[0, 1, 2, 3].map((l) => (
            <line key={l} x1="40" x2="404" y1={40 + l * 50} y2={40 + l * 50} stroke="#E8E0D8" strokeWidth="1" />
          ))}
          {chartPoints.map((_, l) => (
            <line key={l} x1={plotStart + l * step} x2={plotStart + l * step} y1="35" y2="190" stroke="#F0E9E1" strokeWidth="1" />
          ))}
          <text x="0" y="45" className="fill-[#705C53] text-[12px]">₹{Math.round(max)}</text>
          <text x="8" y="95" className="fill-[#705C53] text-[12px]">₹{Math.round(max * 0.66)}</text>
          <text x="12" y="145" className="fill-[#705C53] text-[12px]">₹{Math.round(max * 0.33)}</text>
          <text x="18" y="195" className="fill-[#705C53] text-[12px]">₹0</text>
          <polygon points={areaPoints} fill="#7FB2D9" opacity="0.55" />
          <polyline points={polylinePoints} fill="none" stroke="#2F7FB8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {chartPoints.map((point, index) => {
            const c = coords[index];
            return (
              <g key={`${point.label}-${index}`}>
                <circle cx={c.x} cy={c.y} r="3" fill="#2F7FB8" />
                {(index === 0 || index === chartPoints.length - 1 || index % 2 === 0) && (
                  <text x={Math.max(24, c.x - 18)} y="222" className="fill-[#705C53] text-[13px] font-semibold">
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
    <section className="bg-[#FDFBF7] rounded-lg p-5" style={{ boxShadow: cardShadow }}>
      <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>Product Mix</h2>
      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr] md:items-center">
        <div
          className="mx-auto flex h-52 w-52 items-center justify-center rounded-full"
          style={{ background: items.length ? `conic-gradient(${gradient})` : gradient }}
        >
          {!items.length && (
            <div className="h-32 w-32 rounded-full bg-[#FDFBF7] flex items-center justify-center">
              <span className="text-sm font-medium text-[#C4B8AC]">No data</span>
            </div>
          )}
          {items.length > 0 && (
            <div className="h-28 w-28 rounded-full bg-[#FDFBF7]" />
          )}
        </div>
        <div className="space-y-3">
          <p className="text-sm text-[#705C53]">Category contribution by paid order item revenue.</p>
          {items.length ? (
            items.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-[#000505]">
                  <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
                <span className="text-sm text-[#705C53] whitespace-nowrap">{item.value}% · {item.revenue}</span>
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
    <section className="bg-[#FDFBF7] rounded-lg p-5" style={{ boxShadow: cardShadow }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`${fraunces.className} text-base font-bold text-[#00746B]`}>Top Orders</h2>
        <span className="text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Highest value</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-[#E8E0D8]">
              {["Order", "Status", "Payment", "Date", "Customer", "Employee", "Total"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-[#705C53] uppercase tracking-[0.08em]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((order) => (
                <tr key={order.order} className="border-b border-[#F0E9E1] last:border-0 odd:bg-[#F3EFE8]/45">
                  <td className="px-3 py-3 text-sm font-semibold text-[#00746B]">{order.order}</td>
                  <td className="px-3 py-3 text-sm text-[#705C53]">{order.status}</td>
                  <td className="px-3 py-3 text-sm capitalize text-[#705C53]">{order.paymentMethod}</td>
                  <td className="px-3 py-3 text-sm text-[#705C53]">{order.date}</td>
                  <td className="px-3 py-3 text-sm text-[#705C53]">{order.customer}</td>
                  <td className="px-3 py-3 text-sm text-[#705C53]">{order.employee}</td>
                  <td className="px-3 py-3 text-right text-sm font-semibold text-[#000505]">{order.total}</td>
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
    <section className="bg-[#FDFBF7] rounded-lg p-5" style={{ boxShadow: cardShadow }}>
      <h2 className={`${fraunces.className} text-base font-bold text-[#1B72C9]`}>{title}</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-[#E8E0D8]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E0D8]">
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-[#705C53] uppercase tracking-[0.08em]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-b border-[#F0E9E1] last:border-0 odd:bg-[#F3EFE8]/60">
                  {columns.map((col) => {
                    if (col === "Product") {
                      const image = row.image as string | undefined;
                      return (
                        <td key={col} className="px-4 py-3 text-sm font-medium text-[#000505]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#F3EFE8] flex items-center justify-center overflow-hidden shrink-0">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={image} alt={String(row[col])} className="w-full h-full object-cover" />
                              ) : (
                                <Coffee className="w-4 h-4 text-[#705C53]" />
                              )}
                            </div>
                            <span>{row[col]}</span>
                          </div>
                        </td>
                      );
                    }
                    if (col === "category" || col === "Category") {
                      const Icon = getCategoryIcon(String(row[col]));
                      return (
                        <td key={col} className="px-4 py-3 text-sm font-medium text-[#000505]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#F3EFE8] flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5 text-[#705C53]" />
                            </div>
                            <span>{row[col]}</span>
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={col} className="px-4 py-3 text-sm font-medium text-[#000505]">
                        {row[col]}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[#C4B8AC]">
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

// ─── Page ─────────────────────────────────────────────────────────────────────

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

      fetch(`/api/admin/reports?${params.toString()}`, { signal: controller.signal })
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
        value: current?.revenue.value ?? "₹0.00",
        change: current?.revenue.change ?? "+0.0%",
        helper: current?.revenue.helper ?? "Since previous period",
        icon: TrendingUp,
      },
      {
        label: "Average Order",
        value: current?.averageOrder.value ?? "₹0.00",
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
      Object.values(order).some((v) => String(v).toLowerCase().includes(search))
    );
  }, [report, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className={`${fraunces.className} text-xl font-bold text-[#000505]`}>Reports</h1>
          <p className="text-sm text-[#705C53] mt-0.5">
            Review sales, orders, products, and category performance.
          </p>
        </div>
        <ExportMenu report={report} />
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
          title="Top Products"
          rows={
            (report?.topProducts ?? []) as unknown as Array<Record<string, string | number>>
          }
          columns={["Product", "qty", "revenue"]}
        />
        <RankingTable
          title="Top Categories"
          rows={report?.topCategories ?? []}
          columns={["category", "revenue"]}
        />
      </div>
    </div>
  );
}