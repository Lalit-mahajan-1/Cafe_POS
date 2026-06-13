"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import CartSidebar from "@/app/(employee)/components/pos/CartSidebar";
import type { CartItem, Totals } from "@/app/(employee)/components/pos/pos-types";
import type { PaymentMethod } from "@/app/(employee)/components/pos/pos-constants";

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

const formatTime = (date: string | Date) => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const statusStyles: Record<string, string> = {
  DRAFT: "bg-[#FEF8E7] text-[#8A6D00] border-[#F0E6C0]",
  PAID: "bg-[#F0F9F0] text-[#2D6A2D] border-[#C8E6C8]",
  COMPLETED: "bg-[#F3EFE8] text-[#705C53] border-[#E8E0D8]",
  CANCELLED: "bg-[#FFF4F0] text-[#A84C32] border-[#F5D6CC]",
};

export default function AdminOrdersClient({
  initialOrders,
  initialCancelledOrders,
}: {
  initialOrders: KitchenOrder[];
  initialCancelledOrders: CancelledOrder[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [cancelledOrders, setCancelledOrders] = useState(initialCancelledOrders);
  const [search, setSearch] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // ── Pay Dialog State ──────────────────────────────────────────────────────
  const [payOrder, setPayOrder] = useState<KitchenOrder | null>(null);
  const [payCart, setPayCart] = useState<CartItem[]>([]);
  const [payCouponCode, setPayCouponCode] = useState("");
  const [payPaymentMethod, setPayPaymentMethod] = useState<PaymentMethod>("cash");
  const [payLoading, setPayLoading] = useState(false);

  const payTotals = useMemo<Totals>(() => {
    const subtotal = payCart.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const taxAmount = payCart.reduce((s, i) => s + (i.product.price * i.quantity * i.product.tax) / 100, 0);
    const total = Math.max(0, subtotal + taxAmount);
    return { subtotal, taxAmount, discountAmount: 0, total };
  }, [payCart]);

  const handleOpenPayModal = (order: KitchenOrder) => {
    setPayOrder(order);
    
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
    setPayCart((items) => items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)));
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
        items: payCart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      };

      const res = await fetch(`/api/pos/orders/${payOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm payment");

      setOrders((current) =>
        current.map((o) => (o.id === payOrder.id ? { ...o, ...data.order, items: data.order.items } : o))
      );
      setPayOrder(null);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Payment confirmation failed");
    } finally {
      setPayLoading(false);
    }
  };

  const completeOrder = async (orderId: string) => {
    setCompletingId(orderId);
    setMessage("");

    try {
      const res = await fetch(`/api/kds/orders/${orderId}/complete`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to complete order");

      setOrders((current) => current.filter((order) => order.id !== orderId));
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Order completion failed");
    } finally {
      setCompletingId(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    setMessage("");

    try {
      const res = await fetch(`/api/kds/orders/${orderId}/cancel`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to cancel order");

      setOrders((current) => current.filter((order) => order.id !== orderId));
      if (data.cancelledOrder) {
        setCancelledOrders((current) => [
          data.cancelledOrder,
          ...current.filter((order) => order.id !== data.cancelledOrder.id),
        ]);
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Order cancellation failed");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer?.name.toLowerCase().includes(q) ||
        o.items.some((i) => i.product.name.toLowerCase().includes(q))
    );
  }, [orders, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`font-fraunces text-xl font-bold text-[#000505]`}>
            Orders
          </h1>
          <p className="text-sm text-[#705C53] mt-0.5">Track and manage active orders</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4B8AC]" />
        <input
          type="text"
          placeholder="Search active orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
        />
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-[#C86446] bg-[#FDFBF7] px-4 py-3 text-sm text-[#705C53]">
          {message}
        </div>
      )}

      <div
        className="bg-[#FDFBF7] rounded-xl overflow-hidden"
        style={{
          boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#E8E0D8]">
                <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Order</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Items</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Total</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Time</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-[#705C53]">
                    No active orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const itemsStr = order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ");
                  const isCompleting = completingId === order.id;
                  const isCancelling = cancellingId === order.id;

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/50 transition-colors"
                    >
                      <td className="px-5 py-4 text-sm font-semibold text-[#C86446]">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#705C53] max-w-[250px] truncate" title={itemsStr}>
                        {itemsStr}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#000505]">
                        {formatMoney(order.total)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyles[order.status] || ""}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#C4B8AC]">
                        {formatTime(order.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {order.status === "DRAFT" && (
                            <button
                              onClick={() => handleOpenPayModal(order)}
                              className="text-xs font-semibold bg-[#C86446] text-white px-3 py-1.5 rounded-md hover:bg-[#A84F38] transition cursor-pointer"
                            >
                              Pay
                            </button>
                          )}
                          {order.status === "PAID" && (
                            <button
                              onClick={() => completeOrder(order.id)}
                              disabled={isCompleting || isCancelling}
                              className="text-xs font-semibold bg-[#C86446] text-white px-3 py-1.5 rounded-md hover:bg-[#A84F38] transition disabled:opacity-50 cursor-pointer"
                            >
                              {isCompleting ? "..." : "Complete"}
                            </button>
                          )}
                          {order.status === "DRAFT" && (
                            <button
                              onClick={() => cancelOrder(order.id)}
                              disabled={isCancelling || isCompleting}
                              className="text-xs font-semibold border border-[#C86446] text-[#C86446] px-3 py-1.5 rounded-md hover:bg-[#C86446] hover:text-white transition disabled:opacity-50 cursor-pointer"
                            >
                              {isCancelling ? "..." : "Cancel"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Modal */}
      {payOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300">
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
    </div>
  );
}
