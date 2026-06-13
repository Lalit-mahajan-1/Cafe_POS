"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChefHat, Clock3, Minus, ReceiptText, RotateCcw, X, XCircle } from "lucide-react";
import CartSidebar from "../pos/CartSidebar";
import type { CartItem, Totals } from "../pos/pos-types";
import type { PaymentMethod } from "../pos/pos-constants";

type KitchenOrder = {
  id: string;
  orderNumber: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  status: "DRAFT" | "PAID" | "CANCELLED" | "COMPLETED";
  paymentMethod: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
  table: { id: string; label: string; seats: number } | null;
  coupon: { id: string; code: string; discountValue: number; discountType: string } | null;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: {
      id: string;
      name: string;
      price: number;
      unit: string;
      tax: number;
      description: string | null;
      category: { id: string; name: string; color: string };
    };
  }[];
};

type CancelledOrder = {
  id: string;
  orderNumber: string;
  updatedAt: string | Date;
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatTime = (date: string | Date) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

export default function KitchenDisplayClient({
  initialOrders,
  initialCancelledOrders,
  employeeName,
}: {
  initialOrders: KitchenOrder[];
  initialCancelledOrders: CancelledOrder[];
  employeeName: string;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [cancelledOrders, setCancelledOrders] = useState(initialCancelledOrders);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [decrementingItemId, setDecrementingItemId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [completedId, setCompletedId] = useState<string | null>(null);
  const [cancelledId, setCancelledId] = useState<string | null>(null);
  const [showCancelledDialog, setShowCancelledDialog] = useState(false);
  const [message, setMessage] = useState("");

  // ── Restore Timer ─────────────────────────────────────────────────────────
  const RESTORE_TIMEOUT_MS = 300000; // 5 minutes
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Pay Dialog State ──────────────────────────────────────────────────────
  const [payOrder, setPayOrder] = useState<KitchenOrder | null>(null);
  const [payCart, setPayCart] = useState<CartItem[]>([]);
  const [payCouponCode, setPayCouponCode] = useState("");
  const [payPaymentMethod, setPayPaymentMethod] = useState<PaymentMethod>("cash");
  const [payLoading, setPayLoading] = useState(false);

  const payTotals = useMemo<Totals>(() => {
    const subtotal = payCart.reduce(
      (s, i) => s + i.product.price * i.quantity,
      0
    );
    const taxAmount = payCart.reduce(
      (s, i) => s + (i.product.price * i.quantity * i.product.tax) / 100,
      0
    );
    const total = Math.max(0, subtotal + taxAmount);
    return { subtotal, taxAmount, discountAmount: 0, total };
  }, [payCart]);

  const handleOpenPayModal = (order: KitchenOrder) => {
    setPayOrder(order);
    
    // Map order items to CartItem format
    const initialCart: CartItem[] = order.items.map((item) => ({
      product: {
        id: item.product.id,
        name: item.product.name,
        price: item.product.price || item.unitPrice,
        unit: item.product.unit || "piece",
        tax: item.product.tax || 0,
        description: item.product.description || null,
        category: {
          id: item.product.category?.id || "",
          name: item.product.category?.name || "",
          color: item.product.category?.color || "#3b82f6",
        },
      },
      quantity: item.quantity,
    }));
    
    setPayCart(initialCart);
    setPayCouponCode(order.coupon?.code || "");
    setPayPaymentMethod((order.paymentMethod as PaymentMethod) || "cash");
    setPayLoading(false);
  };

  const handleUpdatePayCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setPayCart((items) => items.filter((i) => i.product.id !== productId));
      return;
    }
    setPayCart((items) =>
      items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      )
    );
  };

  const handleConfirmPayment = async () => {
    if (!payOrder) return;
    setPayLoading(true);
    setMessage("");

    try {
      const payload = {
        status: "PAID",
        paymentMethod: payPaymentMethod,
        couponCode: payCouponCode.trim() || null,
        items: payCart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      const res = await fetch(`/api/pos/orders/${payOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm payment");

      // Update local KDS orders state
      setOrders((current) =>
        current.map((o) =>
          o.id === payOrder.id
            ? { ...o, ...data.order, items: data.order.items }
            : o
        )
      );
      setPayOrder(null);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Payment confirmation failed");
    } finally {
      setPayLoading(false);
    }
  };

  const itemCount = useMemo(
    () => orders.reduce((sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0),
    [orders],
  );

  const completeOrder = async (orderId: string) => {
    setCompletingId(orderId);
    setMessage("");

    try {
      const res = await fetch(`/api/kds/orders/${orderId}/complete`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to complete order");

      setCompletedId(orderId);
      window.setTimeout(() => {
        setOrders((current) => current.filter((order) => order.id !== orderId));
        setCompletedId(null);
      }, 700);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Order completion failed");
    } finally {
      setCompletingId(null);
    }
  };

  const decrementItem = async (itemId: string) => {
    setDecrementingItemId(itemId);
    setMessage("");

    try {
      const res = await fetch(`/api/kds/order-items/${itemId}/decrement`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update item");

      setOrders((current) =>
        current.map((order) => (order.id === data.order.id ? data.order : order)),
      );
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Item update failed");
    } finally {
      setDecrementingItemId(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    setMessage("");

    try {
      const res = await fetch(`/api/kds/orders/${orderId}/cancel`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to cancel order");

      setCancelledId(orderId);
      window.setTimeout(() => {
        setOrders((current) => current.filter((order) => order.id !== orderId));
        if (data.cancelledOrder) {
          setCancelledOrders((current) => [
            data.cancelledOrder,
            ...current.filter((order) => order.id !== data.cancelledOrder.id),
          ]);
        }
        setCancelledId(null);
      }, 700);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Order cancellation failed");
    } finally {
      setCancellingId(null);
    }
  };

  const restoreOrder = async (orderId: string) => {
    setRestoringId(orderId);
    setMessage("");

    try {
      const res = await fetch(`/api/kds/orders/${orderId}/restore`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to restore order");

      setCancelledOrders((current) => current.filter((order) => order.id !== orderId));
      setOrders((current) => [data.order, ...current.filter((order) => order.id !== orderId)]);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Order restore failed");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F3EFE8] text-[#000505]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-[#705C53] bg-[#0E1111] p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#C86446]">
                <ChefHat className="size-4" aria-hidden="true" />
                Kitchen display
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl  text-[#F3EFE8]">
                Active orders for {employeeName}
              </h1>
              <p className="mt-2 max-w-2xl text-[#F3EFE8]/70">
                Active draft and paid orders created by this employee appear here. Convert draft orders to paid or complete preparation.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-[#F3EFE8] px-4 py-3 text-[#000505]">
                <p className="text-[#705C53]">Active orders</p>
                <p className="mt-1 text-2xl font-semibold">{orders.length}</p>
              </div>
              <div className="rounded-lg bg-[#C86446] px-4 py-3 text-white">
                <p className="text-white/75">Items waiting</p>
                <p className="mt-1 text-2xl font-semibold">{itemCount}</p>
              </div>
              <button
                onClick={() => setShowCancelledDialog(true)}
                className="rounded-lg border border-[#705C53] bg-[#FDFBF7] px-4 py-3 text-left text-[#000505] transition hover:bg-[#F3EFE8]"
              >
                <p className="text-[#705C53]">Cancelled</p>
                <p className="mt-1 text-2xl font-semibold">{cancelledOrders.length}</p>
              </button>
            </div>
          </div>
        </header>

        {message && (
          <div className="rounded-lg border border-[#C86446] bg-[#FDFBF7] px-4 py-3 text-sm text-[#705C53]">
            {message}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => {
            const isCompleted = completedId === order.id;
            const isCancelled = cancelledId === order.id;
            const isCompleting = completingId === order.id;
            const isCancelling = cancellingId === order.id;

            return (
              <article
                key={order.id}
                className={`relative overflow-hidden rounded-lg border p-5 shadow-sm transition-all duration-500 ${
                  isCompleted
                    ? "scale-[0.98] border-emerald-400 bg-emerald-500/20 opacity-70"
                    : isCancelled
                      ? "scale-[0.98] border-red-400 bg-red-500/20 opacity-70"
                    : "border-[#705C53] bg-[#FDFBF7] text-[#000505]"
                }`}
              >
                {isCompleted && (
                  <div className="absolute inset-0 z-10 grid place-items-center bg-emerald-500/15">
                    <div className="relative grid size-20 place-items-center rounded-full bg-emerald-500 text-white shadow-lg">
                      <span className="absolute size-20 animate-ping rounded-full bg-emerald-400/60" />
                      <Check className="relative z-10 size-10 animate-bounce" aria-hidden="true" />
                    </div>
                  </div>
                )}

                {isCancelled && (
                  <div className="absolute inset-0 z-10 grid place-items-center bg-red-500/15">
                    <div className="relative grid size-20 place-items-center rounded-full bg-red-500 text-white shadow-lg">
                      <span className="absolute size-20 animate-ping rounded-full bg-red-400/60" />
                      <XCircle className="relative z-10 size-10 animate-bounce" aria-hidden="true" />
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-[#C86446]">
                      <ReceiptText className="size-4" aria-hidden="true" />
                      {order.orderNumber}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      {order.customer?.name || "Walk-in customer"}
                    </h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-[#705C53]">
                      <Clock3 className="size-4" aria-hidden="true" />
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                  {order.status === "DRAFT" ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-500/20">
                      Draft
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#F3EFE8] px-3 py-1 text-xs font-semibold text-[#705C53]">
                      Paid
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[#E6DDD1] bg-[#FDFBF7] p-3"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.product.name}</p>
                          <p className="text-xs text-[#705C53]">{item.product.category.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {order.status === "DRAFT" && (
                            <button
                              onClick={() => decrementItem(item.id)}
                              disabled={decrementingItemId === item.id || isCompleting || isCancelling}
                              className="grid size-8 place-items-center rounded-md border border-[#E6DDD1] text-[#C86446] transition hover:bg-[#F3EFE8] disabled:opacity-50 cursor-pointer"
                              aria-label={`Reduce ${item.product.name}`}
                            >
                              <Minus className="size-4" aria-hidden="true" />
                            </button>
                          )}
                          <span className="rounded-md bg-[#F3EFE8] px-2 py-1 text-sm font-semibold text-[#000505]">
                            x{item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {order.items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[#E6DDD1] bg-[#FDFBF7] p-3 text-sm text-[#705C53]">
                      No items remain in this order.
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <strong>{formatMoney(order.total)}</strong>
                  <div className="flex gap-2">
                    {order.status === "DRAFT" ? (
                      <button
                        onClick={() => handleOpenPayModal(order)}
                        className="inline-flex items-center gap-2 rounded-md bg-[#C86446] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A84F38] shadow-sm hover:shadow-md cursor-pointer"
                      >
                        <ReceiptText className="size-4" aria-hidden="true" />
                        Pay
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => cancelOrder(order.id)}
                          disabled={isCancelling || isCompleting || isCompleted || isCancelled}
                          className="inline-flex items-center gap-2 rounded-md border border-[#C86446] px-4 py-2 text-sm font-semibold text-[#C86446] transition hover:bg-[#C86446] hover:text-white disabled:opacity-60 cursor-pointer"
                        >
                          <XCircle className="size-4" aria-hidden="true" />
                          {isCancelling ? "Cancelling..." : "Cancel"}
                        </button>
                        <button
                          onClick={() => completeOrder(order.id)}
                          disabled={isCompleting || isCancelling || isCompleted || isCancelled}
                          className="inline-flex items-center gap-2 rounded-md bg-[#C86446] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A84F38] disabled:opacity-60 cursor-pointer"
                        >
                          <Check className="size-4" aria-hidden="true" />
                          {isCompleting ? "Updating..." : "Done"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {orders.length === 0 && (
          <section className="grid min-h-[340px] place-items-center rounded-lg border border-[#705C53] bg-[#0E1111] p-8 text-center">
            <div>
              <ChefHat className="mx-auto size-12 text-[#C86446]" aria-hidden="true" />
              <h2 className="mt-4 text-2xl font-semibold">No active kitchen orders</h2>
              <p className="mt-2 text-[#F3EFE8]/70">
                Paid POS orders for this employee will appear here automatically on refresh.
              </p>
            </div>
          </section>
        )}

        {payOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300">
            <div className="relative w-full max-w-md rounded-xl bg-[#000505] p-1 shadow-2xl border border-[#705C53] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center px-5 py-4 border-b border-[#705C53]/40">
                <h3 className="text-lg font-semibold text-[#FDFBF7]">Pay Order {payOrder.orderNumber}</h3>
                <button
                  onClick={() => setPayOrder(null)}
                  className="rounded-md p-1.5 text-[#F3EFE8]/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                <CartSidebar
                  cart={payCart}
                  selectedTable={
                    payOrder.table
                      ? {
                          id: payOrder.table.id,
                          label: payOrder.table.label,
                          seats: payOrder.table.seats,
                          shape: "round",
                          status: "OCCUPIED",
                          row: 0,
                          col: 0,
                          activeOrder: null,
                          todayBookings: [],
                        }
                      : null
                  }
                  isTakeout={!payOrder.table}
                  customer={payOrder.customer}
                  couponCode={payCouponCode}
                  paymentMethod={payPaymentMethod}
                  totals={payTotals}
                  loading={payLoading}
                  onUpdateQuantity={handleUpdatePayCartQuantity}
                  onCouponChange={setPayCouponCode}
                  onPaymentChange={setPayPaymentMethod}
                  onConfirmOrder={handleConfirmPayment}
                  isDraftCheckout={true}
                />
              </div>
            </div>
          </div>
        )}

        {showCancelledDialog && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
            <section className="w-full max-w-2xl rounded-lg bg-[#FDFBF7] p-5 text-[#000505] shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C86446]">
                    Cancelled orders
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Restore cancelled orders</h2>
                  <p className="mt-1 text-sm text-[#705C53]">
                    Showing only order ID and cancellation time for this employee.
                  </p>
                </div>
                <button
                  onClick={() => setShowCancelledDialog(false)}
                  className="rounded-md p-2 text-[#705C53] hover:bg-[#F3EFE8]"
                  aria-label="Close cancelled orders"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-lg border border-[#E6DDD1]">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] bg-[#F3EFE8] px-4 py-3 text-sm font-semibold text-[#705C53]">
                  <span>Order ID</span>
                  <span>Cancelled at</span>
                  <span>Time left</span>
                  <span>Action</span>
                </div>
                {cancelledOrders.map((order) => {
                  const cancelledAt = new Date(order.updatedAt).getTime();
                  const elapsed = now - cancelledAt;
                  const expired = elapsed >= RESTORE_TIMEOUT_MS;
                  const remaining = Math.max(0, RESTORE_TIMEOUT_MS - elapsed);
                  const remainingSeconds = Math.ceil(remaining / 1000);
                  const remainingMinutes = Math.floor(remainingSeconds / 60);
                  const remainingSecs = remainingSeconds % 60;

                  return (
                    <div
                      key={order.id}
                      className={`grid grid-cols-[1fr_1fr_1fr_auto] items-center border-t border-[#E6DDD1] px-4 py-3 text-sm ${expired ? "opacity-50" : ""}`}
                    >
                      <strong>{order.orderNumber}</strong>
                      <span>{formatTime(order.updatedAt)}</span>
                      <span className={expired ? "text-red-500 font-semibold" : "text-[#705C53]"}>
                        {expired ? "Expired" : `${remainingMinutes}:${remainingSecs.toString().padStart(2, "0")}`}
                      </span>
                      <button
                        onClick={() => restoreOrder(order.id)}
                        disabled={restoringId === order.id || expired}
                        className="inline-flex items-center gap-2 rounded-md bg-[#000505] px-3 py-2 text-xs font-semibold text-[#FDFBF7] transition hover:bg-[#705C53] disabled:opacity-60"
                      >
                        <RotateCcw className="size-4" aria-hidden="true" />
                        {restoringId === order.id ? "Restoring..." : expired ? "Expired" : "Restore"}
                      </button>
                    </div>
                  );
                })}
                {cancelledOrders.length === 0 && (
                  <div className="border-t border-[#E6DDD1] px-4 py-8 text-center text-sm text-[#705C53]">
                    No cancelled orders for this employee.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
