"use client";

import { CheckCircle2, FileText, Loader2, X } from "lucide-react";
import type { CreatedOrder } from "./pos-types";
import { formatMoney } from "./pos-constants";

type Props = {
  order: CreatedOrder | null;
  loading: boolean;
  onMarkPaid: (orderId: string) => void;
  onNewOrder: () => void;
};

export default function OrderSuccessModal({
  order,
  loading,
  onMarkPaid,
  onNewOrder,
}: Props) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <section className="w-full max-w-2xl rounded-lg bg-[#FDFBF7] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#C86446]">
              <CheckCircle2 className="size-4" />
              Order Created
            </p>
            <h2 className="mt-1 text-2xl font-bold">{order.orderNumber}</h2>
            <p className="mt-1 text-sm text-[#705C53]">
              {order.table?.label ?? "Takeout"} ·{" "}
              {order.paymentMethod?.toUpperCase()} ·{" "}
              {order.customer?.name || "Walk-in"}
            </p>
          </div>
          <button
            onClick={onNewOrder}
            className="p-2 hover:bg-[#F3EFE8] rounded-lg"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Items */}
        <div className="rounded-lg border border-[#E6DDD1] divide-y divide-[#E6DDD1]">
          {order.items.map((item) => (
            <div
              key={item.product.id}
              className="flex justify-between px-4 py-3 text-sm"
            >
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <strong>{formatMoney(item.lineTotal)}</strong>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-[#705C53]">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#705C53]">
            <span>Tax</span>
            <span>{formatMoney(order.taxAmount)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-[#705C53]">
              <span>Discount</span>
              <span>-{formatMoney(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#E6DDD1] pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{formatMoney(order.total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 rounded-md border border-[#E6DDD1] px-4 py-2.5 text-sm font-semibold text-[#705C53] hover:bg-[#F3EFE8] transition"
          >
            <FileText className="size-4" />
            Print Receipt
          </button>
          <button
            onClick={() => onMarkPaid(order.id)}
            disabled={loading || order.status === "PAID"}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {order.status === "PAID" ? "Paid ✓" : "Mark as Paid"}
          </button>
        </div>

        {order.status === "PAID" && (
          <button
            onClick={onNewOrder}
            className="mt-3 w-full rounded-md bg-[#C86446] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#B55A3E] transition"
          >
            Start New Order →
          </button>
        )}
      </section>
    </div>
  );
}