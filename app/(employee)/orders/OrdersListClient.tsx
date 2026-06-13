"use client";

import { useMemo, useState } from "react";
import { Calendar, ReceiptText, FileText, X, Printer, CheckCircle2, Info, HelpCircle } from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: {
    id: string;
    name: string;
    price: number;
    category: { name: string };
  };
};

type Order = {
  id: string;
  orderNumber: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  discountReason: string | null;
  total: number;
  status: "DRAFT" | "PAID" | "CANCELLED" | "COMPLETED";
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { name: string; phone: string | null; email: string | null } | null;
  table: { label: string } | null;
  items: OrderItem[];
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const formatTime = (dateStr: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateStr));

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr));

export default function OrdersListClient({
  initialOrders,
  employeeName,
}: {
  initialOrders: Order[];
  employeeName: string;
}) {
  const [orders] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Group orders date-wise
  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    orders.forEach((order) => {
      const dateKey = formatDate(order.createdAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(order);
    });
    return groups;
  }, [orders]);

  // Calculate stats
  const stats = useMemo(() => {
    const result = {
      total: orders.length,
      drafts: 0,
      paid: 0,
      completed: 0,
      cancelled: 0,
      revenue: 0,
    };
    orders.forEach((order) => {
      if (order.status === "DRAFT") result.drafts++;
      else if (order.status === "PAID") {
        result.paid++;
        result.revenue += order.total;
      } else if (order.status === "COMPLETED") {
        result.completed++;
        result.revenue += order.total;
      } else if (order.status === "CANCELLED") {
        result.cancelled++;
      }
    });
    return result;
  }, [orders]);

  const statusBadge = (status: Order["status"]) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-500/20">
            Draft
          </span>
        );
      case "PAID":
        return (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-500/20">
            Paid
          </span>
        );
      case "COMPLETED":
        return (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-500/20">
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-500/20">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 print:p-0 print:m-0 print:gap-0 print:max-w-none print:w-full">
      {/* Header */}
      <header className="rounded-lg border border-[#705C53] bg-[#0E1111] p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#C86446]">
              <ReceiptText className="size-4" />
              Employee Station
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl text-[#F3EFE8]">
              Attended Orders
            </h1>
            <p className="mt-2 max-w-2xl text-[#F3EFE8]/70">
              Overview of all orders handled by you, ordered chronologically. View detailed receipts and print invoices for paid or completed orders.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm min-w-[320px] lg:min-w-[500px]">
            <div className="rounded-lg bg-[#F3EFE8] px-4 py-3 text-[#000505]">
              <p className="text-xs text-[#705C53]">Total Handled</p>
              <p className="mt-1 text-xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-500/10 px-4 py-3 text-[#000505]">
              <p className="text-xs text-amber-700">Drafts</p>
              <p className="mt-1 text-xl font-bold text-amber-800">{stats.drafts}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-500/10 px-4 py-3 text-[#000505]">
              <p className="text-xs text-emerald-700">Paid / Done</p>
              <p className="mt-1 text-xl font-bold text-emerald-800">{stats.paid + stats.completed}</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-500/10 px-4 py-3 text-[#000505]">
              <p className="text-xs text-red-700">Cancelled</p>
              <p className="mt-1 text-xl font-bold text-red-800">{stats.cancelled}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Orders List */}
      {orders.length === 0 ? (
        <section className="grid min-h-[300px] place-items-center rounded-lg border border-[#705C53] bg-[#0E1111] p-8 text-center print:hidden">
          <div>
            <ReceiptText className="mx-auto size-12 text-[#C86446]" />
            <h2 className="mt-4 text-2xl font-semibold text-[#F3EFE8]">No orders found</h2>
            <p className="mt-2 text-[#F3EFE8]/70">
              Orders you create in POS or handle in KDS will appear here.
            </p>
          </div>
        </section>
      ) : (
        <div className="space-y-8 print:hidden">
          {Object.entries(groupedOrders).map(([date, dateOrders]) => (
            <section key={date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2 border-b border-[#705C53]/35 pb-2 text-[#000505]">
                <Calendar className="size-4 text-[#C86446]" />
                <h2 className="text-lg font-bold tracking-tight">{date}</h2>
                <span className="text-xs bg-[#705C53]/20 px-2 py-0.5 rounded-full font-semibold text-[#705C53]">
                  {dateOrders.length} {dateOrders.length === 1 ? "order" : "orders"}
                </span>
              </div>

              {/* Order Cards/List */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dateOrders.map((order) => (
                  <article
                    key={order.id}
                    className="flex flex-col justify-between rounded-lg border border-[#E6DDD1] bg-[#FDFBF7] p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold tracking-wide text-[#C86446]">
                          {order.orderNumber}
                        </span>
                        {statusBadge(order.status)}
                      </div>

                      {/* Info details */}
                      <div className="mt-3 space-y-1.5 text-sm text-[#705C53]">
                        <p className="flex justify-between">
                          <span className="font-medium text-[#000505]">Time:</span>
                          <span>{formatTime(order.createdAt)}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="font-medium text-[#000505]">Table:</span>
                          <span>{order.table?.label ? `Table ${order.table.label}` : "Takeout"}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="font-medium text-[#000505]">Customer:</span>
                          <span className="truncate max-w-[150px]">{order.customer?.name || "Walk-in"}</span>
                        </p>
                        {order.paymentMethod && (
                          <p className="flex justify-between">
                            <span className="font-medium text-[#000505]">Payment:</span>
                            <span className="uppercase text-xs tracking-wider bg-[#F3EFE8] px-1.5 py-0.5 rounded font-bold text-[#705C53]">
                              {order.paymentMethod}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 border-t border-[#E6DDD1]/60 pt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#705C53]">Amount</p>
                        <strong className="text-base text-[#000505]">{formatMoney(order.total)}</strong>
                      </div>

                      {["PAID", "COMPLETED"].includes(order.status) ? (
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-[#000505] hover:bg-[#705C53] px-3.5 py-2 text-xs font-semibold text-[#FDFBF7] transition cursor-pointer"
                        >
                          <FileText className="size-3.5" />
                          Invoice
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-[#705C53]/60 italic flex items-center gap-1">
                          <Info className="size-3.5 text-[#705C53]/40" />
                          No Invoice
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Invoice Receipt Dialog */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300 print:bg-white print:relative print:block print:p-0 print:z-0 print:inset-auto">
          <section
            id="print-receipt-modal"
            className="relative w-full max-w-xl rounded-xl bg-[#FDFBF7] border border-[#705C53] p-6 text-[#000505] shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200 print:border-none print:shadow-none print:max-h-none print:p-0 print:m-0 print:w-full print:bg-white print:text-black print:overflow-visible"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 rounded-md p-1.5 text-[#705C53] hover:bg-[#F3EFE8] transition cursor-pointer print:hidden"
              aria-label="Close invoice"
            >
              <X className="size-5" />
            </button>

            {/* Receipt Header */}
            <div className="border-b border-dashed border-[#705C53]/40 pb-5 text-center">
              <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 print:hidden">
                <CheckCircle2 className="size-7" />
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#000505]">RECEIPT / INVOICE</h2>
              <p className="text-sm text-[#705C53] mt-1">Order Ref: {selectedOrder.orderNumber}</p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 py-5 text-sm border-b border-dashed border-[#705C53]/40">
              <div>
                <p className="text-[#705C53] text-xs uppercase tracking-wider font-semibold">Date & Time</p>
                <p className="font-semibold text-[#000505] mt-0.5">
                  {formatDate(selectedOrder.createdAt)} · {formatTime(selectedOrder.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-[#705C53] text-xs uppercase tracking-wider font-semibold">Attended By</p>
                <p className="font-semibold text-[#000505] mt-0.5">{employeeName}</p>
              </div>
              <div>
                <p className="text-[#705C53] text-xs uppercase tracking-wider font-semibold">Table / Seating</p>
                <p className="font-semibold text-[#000505] mt-0.5">
                  {selectedOrder.table?.label ? `Table ${selectedOrder.table.label}` : "Takeout Order"}
                </p>
              </div>
              <div>
                <p className="text-[#705C53] text-xs uppercase tracking-wider font-semibold">Payment Details</p>
                <p className="font-semibold text-[#000505] mt-0.5 uppercase">
                  {selectedOrder.paymentMethod || "N/A"}
                </p>
              </div>
              {selectedOrder.customer && (
                <div className="col-span-2">
                  <p className="text-[#705C53] text-xs uppercase tracking-wider font-semibold">Customer info</p>
                  <p className="font-semibold text-[#000505] mt-0.5">
                    {selectedOrder.customer.name} {selectedOrder.customer.phone ? `(${selectedOrder.customer.phone})` : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-5">
              <p className="text-xs uppercase tracking-wider font-semibold text-[#705C53] mb-3">Order items</p>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-[#000505]">{item.product.name}</p>
                      <p className="text-xs text-[#705C53]">
                        {formatMoney(item.unitPrice)} each × {item.quantity}
                      </p>
                    </div>
                    <strong className="font-semibold text-[#000505]">
                      {formatMoney(item.lineTotal)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border-t border-dashed border-[#705C53]/40 pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-[#705C53]">
                <span>Subtotal</span>
                <span className="font-semibold">{formatMoney(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#705C53]">
                <span>Taxes & GST</span>
                <span className="font-semibold">{formatMoney(selectedOrder.taxAmount)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount {selectedOrder.discountReason ? `(${selectedOrder.discountReason})` : ""}</span>
                  <span className="font-semibold">-{formatMoney(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#705C53] pt-4 text-lg font-bold text-[#000505]">
                <span>Grand Total</span>
                <span>{formatMoney(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Invoice QR Code */}
            <div className="mt-4 flex flex-col items-center justify-center p-3 bg-[#F8F4EE] rounded-lg border border-[#E6DDD1]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                  `Order: ${selectedOrder.orderNumber}\nTotal: ${formatMoney(selectedOrder.total)}\nPayment: ${selectedOrder.paymentMethod || "N/A"}\nTable: ${selectedOrder.table?.label || "Walk-in"}`
                )}`}
                alt="Invoice QR Code"
                className="w-28 h-28 border border-[#E6DDD1] p-1.5 bg-white"
              />
              <p className="text-[10px] text-[#705C53] mt-1.5 font-bold uppercase tracking-wider">Digital Receipt QR</p>
            </div>

            {/* Dialog Actions */}
            <div className="mt-6 flex gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 rounded-md border border-[#705C53] hover:bg-[#F3EFE8] px-4 py-3 text-sm font-semibold text-[#000505] transition cursor-pointer"
              >
                <Printer className="size-4" />
                Print Receipt
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
