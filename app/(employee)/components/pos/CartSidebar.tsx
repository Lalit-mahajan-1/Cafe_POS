"use client";

import { Loader2, Package, Sparkles, TicketPercent, X } from "lucide-react";
import type { CartItem, Customer, FloorTable, Totals } from "./pos-types";
import {
  formatMoney,
  paymentLabels,
  statusConfig,
  type PaymentMethod,
} from "./pos-constants";

type Props = {
  cart: CartItem[];
  selectedTable: FloorTable | null;
  isTakeout: boolean;
  customer: Customer | null;
  couponCode: string;
  paymentMethod: PaymentMethod;
  totals: Totals;
  loading: boolean;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onCouponChange: (code: string) => void;
  onPaymentChange: (method: PaymentMethod) => void;
  onConfirmOrder: () => void;
};

export default function CartSidebar({
  cart,
  selectedTable,
  isTakeout,
  customer,
  couponCode,
  paymentMethod,
  totals,
  loading,
  onUpdateQuantity,
  onCouponChange,
  onPaymentChange,
  onConfirmOrder,
}: Props) {
  const canConfirm =
    cart.length > 0 &&
    (isTakeout || selectedTable?.status === "AVAILABLE");

  const hasCoupon = couponCode.trim().length > 0;

  return (
    <aside className="rounded-lg bg-[#000505] text-[#FDFBF7] shadow-sm flex flex-col xl:sticky xl:top-5 xl:max-h-[calc(100vh-40px)]">

      {/* ── Fixed header ── */}
      <div className="shrink-0 p-5 pb-4 border-b border-[#705C53]">
        <h2 className="text-xl font-semibold">Current Order</h2>

        <div className="mt-2">
          {isTakeout ? (
            <div className="flex items-center gap-2">
              <Package className="size-4 text-blue-400" />
              <span className="text-sm text-blue-300 font-medium">
                Takeout Order
              </span>
            </div>
          ) : selectedTable ? (
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  statusConfig[selectedTable.status].dot
                }`}
              />
              <span className="text-sm text-[#F3EFE8]/80">
                {selectedTable.label} · {selectedTable.seats} seats ·{" "}
                {statusConfig[selectedTable.status].label}
              </span>
            </div>
          ) : (
            <p className="text-sm text-[#F3EFE8]/60">No table selected</p>
          )}

          {customer && (
            <p className="mt-1 text-sm text-[#F3EFE8]/70">
              Customer: {customer.name}
            </p>
          )}
        </div>
      </div>

      {/* ── Scrollable cart items ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-3 space-y-3 overscroll-contain">
        {cart.length === 0 ? (
          <p className="text-sm text-[#F3EFE8]/60 text-center py-8">
            No products added yet.
          </p>
        ) : (
          cart.map((item) => (
            <div key={item.product.id} className="rounded-lg bg-white/10 p-3">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-[#F3EFE8]/65">
                    {formatMoney(item.product.price)} each
                  </p>
                </div>
                <p className="font-bold shrink-0">
                  {formatMoney(item.product.price * item.quantity)}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() =>
                    onUpdateQuantity(item.product.id, item.quantity - 1)
                  }
                  className="grid size-7 place-items-center rounded-md bg-[#705C53] hover:bg-[#C86446] transition text-sm font-bold"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold text-sm">
                  {item.quantity}
                </span>
                <button
                  onClick={() =>
                    onUpdateQuantity(item.product.id, item.quantity + 1)
                  }
                  className="grid size-7 place-items-center rounded-md bg-[#705C53] hover:bg-[#C86446] transition text-sm font-bold"
                >
                  +
                </button>
                <button
                  onClick={() => onUpdateQuantity(item.product.id, 0)}
                  className="ml-auto text-[#F3EFE8]/50 hover:text-red-400 transition"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

{/* ── Fixed footer ── */}
<div className="shrink-0 border-t border-[#705C53] p-5 space-y-4">

  {/* Coupon input */}
  <div className="rounded-lg border border-[#705C53]/40 bg-[#F3EFE8] p-3">
    <div className="flex items-center gap-2 text-sm font-semibold text-[#000505]">
      <TicketPercent className="size-4 text-[#C86446]" />
      Coupon
    </div>
    <div className="mt-2 flex gap-2">
      <input
        value={couponCode}
        onChange={(e) => onCouponChange(e.target.value)}
        placeholder="e.g. SAVE10"
        className="w-full rounded-md border border-[#E6DDD1] bg-[#FDFBF7] px-3 py-2 text-sm text-[#000505] outline-none focus:border-[#C86446]"
      />
      {hasCoupon && (
        <button
          onClick={() => onCouponChange("")}
          className="shrink-0 rounded-md bg-[#705C53] px-3 py-2 text-sm font-semibold text-[#FDFBF7] transition hover:bg-[#C86446]"
        >
          Clear
        </button>
      )}
    </div>
    {hasCoupon && (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
        <Sparkles className="size-3" />
        {couponCode.trim().toUpperCase()} — will be applied at checkout
      </p>
    )}
  </div>

  {/* Order totals */}
  <div className="space-y-2 text-sm">
    <div className="flex justify-between text-[#F3EFE8]/70">
      <span>Subtotal</span>
      <span>{formatMoney(totals.subtotal)}</span>
    </div>
    <div className="flex justify-between text-[#F3EFE8]/70">
      <span>Tax</span>
      <span>{formatMoney(totals.taxAmount)}</span>
    </div>

    {/* Discount — show pending note when coupon entered */}
    {hasCoupon && (
      <div className="flex justify-between text-emerald-400 text-xs">
        <span className="flex items-center gap-1">
          <Sparkles className="size-3" />
          Discount
        </span>
        <span className="italic">applied at checkout</span>
      </div>
    )}

    {/* Real discount if no coupon but some other discount exists */}
    {!hasCoupon && totals.discountAmount > 0 && (
      <div className="flex justify-between text-emerald-400">
        <span>Discount</span>
        <span>-{formatMoney(totals.discountAmount)}</span>
      </div>
    )}

    {/* Total — always show the number, add note if coupon pending */}
    <div className="flex justify-between border-t border-[#705C53] pt-3 text-lg font-bold">
      <span>Total</span>
      <div className="text-right">
        <span>{formatMoney(totals.subtotal + totals.taxAmount)}</span>
        {hasCoupon && (
          <p className="text-xs font-normal text-emerald-400 mt-0.5">
            before coupon discount
          </p>
        )}
      </div>
    </div>
  </div>

  {/* Payment method */}
  <div>
    <p className="text-sm font-semibold mb-2">Payment Method</p>
    <div className="grid grid-cols-3 gap-2">
      {(Object.keys(paymentLabels) as PaymentMethod[]).map((method) => (
        <button
          key={method}
          onClick={() => onPaymentChange(method)}
          className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
            paymentMethod === method
              ? "bg-[#C86446] text-white"
              : "bg-[#705C53]/50 text-[#F3EFE8]/70 hover:bg-[#705C53]"
          }`}
        >
          {paymentLabels[method]}
        </button>
      ))}
    </div>
  </div>

  {/* Confirm button */}
  <button
    onClick={onConfirmOrder}
    disabled={loading || !canConfirm}
    className="w-full rounded-md bg-[#C86446] px-4 py-3 font-semibold text-white hover:bg-[#A84F38] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  >
    {loading ? (
      <>
        <Loader2 className="size-4 animate-spin" />
        Processing...
      </>
    ) : (
      "Confirm Order"
    )}
  </button>

  {/* Occupied table warning */}
  {!isTakeout &&
    selectedTable?.status === "OCCUPIED" &&
    selectedTable.activeOrder && (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
        <p className="text-xs text-red-300 font-semibold mb-1">
          Active order on this table
        </p>
        <p className="text-xs text-[#F3EFE8]/70">
          {selectedTable.activeOrder.orderNumber} ·{" "}
          {formatMoney(selectedTable.activeOrder.total)}
        </p>
        {selectedTable.activeOrder.customer && (
          <p className="text-xs text-[#F3EFE8]/70">
            {selectedTable.activeOrder.customer.name}
          </p>
        )}
      </div>
    )}
</div>
    </aside>
  );
}


