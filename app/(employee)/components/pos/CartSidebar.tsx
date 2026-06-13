"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  TicketPercent,
  X,
} from "lucide-react";
import type {
  CartItem,
  CouponState,
  Customer,
  FloorTable,
  Totals,
} from "./pos-types";
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

const initialCouponState: CouponState = {
  status: "idle",
  code: "",
  couponId: null,
  discountType: null,
  discountValue: null,
  discountAmount: 0,
  message: "",
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

  const [coupon, setCoupon] = useState<CouponState>(initialCouponState);
  const appliedCodeRef = useRef("");

  // Reset coupon state when code is cleared
  useEffect(() => {
    if (!couponCode.trim()) {
      setCoupon(initialCouponState);
      appliedCodeRef.current = "";
    }
  }, [couponCode]);

  // Re-validate when subtotal changes and coupon is applied
  useEffect(() => {
    if (
      coupon.status === "valid" &&
      appliedCodeRef.current &&
      totals.subtotal > 0
    ) {
      void applyCoupon(appliedCodeRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.subtotal]);

  const applyCoupon = useCallback(
    async (code?: string) => {
      const codeToApply = (code || couponCode).trim().toUpperCase();
      if (!codeToApply) return;

      if (totals.subtotal <= 0) {
        setCoupon({
          ...initialCouponState,
          status: "invalid",
          code: codeToApply,
          message: "Add items to the cart first",
        });
        return;
      }

      setCoupon((prev) => ({
        ...prev,
        status: "loading",
        code: codeToApply,
        message: "",
      }));

      try {
        const res = await fetch("/api/pos/coupon/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            couponCode: codeToApply,
            subtotal: totals.subtotal,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.valid === false) {
          setCoupon({
            status: "invalid",
            code: codeToApply,
            couponId: null,
            discountType: null,
            discountValue: null,
            discountAmount: 0,
            message: data.error || "Invalid coupon",
          });
          appliedCodeRef.current = "";
          return;
        }

        setCoupon({
          status: "valid",
          code: data.code,
          couponId: data.couponId,
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmount: data.discount,
          message: data.message,
        });
        appliedCodeRef.current = codeToApply;

        // Sync the code back to parent in normalized form
        if (couponCode.trim().toUpperCase() !== data.code) {
          onCouponChange(data.code);
        }
      } catch {
        setCoupon({
          status: "invalid",
          code: codeToApply,
          couponId: null,
          discountType: null,
          discountValue: null,
          discountAmount: 0,
          message: "Failed to validate coupon",
        });
        appliedCodeRef.current = "";
      }
    },
    [couponCode, totals.subtotal, onCouponChange]
  );

  const handleClearCoupon = () => {
    onCouponChange("");
    setCoupon(initialCouponState);
    appliedCodeRef.current = "";
  };

  // Calculated totals with coupon discount applied
  const discountAmount = coupon.status === "valid" ? coupon.discountAmount : 0;
  const finalTotal = Math.max(
    0,
    totals.subtotal + totals.taxAmount - discountAmount
  );

  return (
    <aside className="rounded-lg bg-[#000505] text-[#FDFBF7] shadow-sm flex flex-col xl:sticky xl:top-5 xl:max-h-[calc(100vh-40px)]">

      {/* ── Fixed header ── */}
      <div className="shrink-0 p-5 pb-4 border-b border-[#705C53]">
        <h2 className="text-xl font-semibold">Current Order</h2>

        <div className="mt-2 space-y-1">
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
            <p className="text-sm text-[#F3EFE8]/70">
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

        {/* Coupon section */}
        <div className="rounded-lg border border-[#705C53]/40 bg-[#F3EFE8] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#000505]">
            <TicketPercent className="size-4 text-[#C86446]" />
            Coupon Code
          </div>

          <div className="mt-2 flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => onCouponChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
              placeholder="Enter coupon code"
              disabled={coupon.status === "valid"}
              className={`w-full rounded-md border px-3 py-2 text-sm text-[#000505] outline-none transition ${
                coupon.status === "valid"
                  ? "border-emerald-400 bg-emerald-50"
                  : coupon.status === "invalid"
                  ? "border-red-400 bg-red-50"
                  : "border-[#E6DDD1] bg-[#FDFBF7] focus:border-[#C86446]"
              }`}
            />

            {coupon.status === "valid" ? (
              <button
                onClick={handleClearCoupon}
                className="shrink-0 rounded-md bg-[#705C53] px-3 py-2 text-sm font-semibold text-[#FDFBF7] transition hover:bg-red-600"
              >
                Remove
              </button>
            ) : (
              <button
                onClick={() => applyCoupon()}
                disabled={
                  !couponCode.trim() || coupon.status === "loading"
                }
                className="shrink-0 rounded-md bg-[#C86446] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#A84F38] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {coupon.status === "loading" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Apply"
                )}
              </button>
            )}
          </div>

          {/* Coupon feedback */}
          {coupon.status === "valid" && (
            <div className="mt-2 flex items-start gap-2 rounded-md bg-emerald-100 border border-emerald-300 px-3 py-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800">
                <p className="font-semibold">{coupon.code} applied</p>
                <p className="mt-0.5">
                  {coupon.discountType === "PERCENTAGE"
                    ? `${coupon.discountValue}% off`
                    : `₹${coupon.discountValue?.toFixed(2)} off`}
                  {" · "}
                  You save {formatMoney(coupon.discountAmount)}
                </p>
              </div>
            </div>
          )}

          {coupon.status === "invalid" && (
            <div className="mt-2 flex items-start gap-2 rounded-md bg-red-100 border border-red-300 px-3 py-2">
              <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium">
                {coupon.message}
              </p>
            </div>
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
          <div
            className={`flex justify-between ${
              discountAmount > 0 ? "text-emerald-400" : "text-[#F3EFE8]/70"
            }`}
          >
            <span>Discount</span>
            <span>
              {discountAmount > 0 ? "−" : ""}
              {formatMoney(discountAmount)}
            </span>
          </div>
          <div className="flex justify-between border-t border-[#705C53] pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{formatMoney(finalTotal)}</span>
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

        {/* Confirm */}
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
            <>Confirm Order · {formatMoney(finalTotal)}</>
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