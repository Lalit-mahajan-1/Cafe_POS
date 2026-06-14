"use client";

import { useEffect, useState } from "react";
import { Fraunces } from "next/font/google";
import { Search } from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

// Map the DB status to the UI badge style and label
const getStatusBadge = (status: string) => {
  switch (status) {
    case "PAID":
      return { label: "preparing", style: "bg-[#FEF8E7] text-[#8A6D00] border-[#F0E6C0]" };
    case "COMPLETED":
      return { label: "completed", style: "bg-[#F3EFE8] text-[#705C53] border-[#E8E0D8]" };
    case "CANCELLED":
      return { label: "cancelled", style: "bg-[#FFF4F0] text-[#A84C32] border-[#F5D6CC]" };
    case "DRAFT":
      return { label: "draft", style: "bg-[#F0F9F0] text-[#2D6A2D] border-[#C8E6C8]" };
    default:
      return { label: status.toLowerCase(), style: "bg-[#F3EFE8] text-[#705C53] border-[#E8E0D8]" };
  }
};

type Order = {
  id: string;
  dbId: string;
  items: string;
  total: string;
  status: string;
  time: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/admin/orders");
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchOrders();

    // Poll every 5 seconds for real-time updates
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter((order) =>
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.items.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className={`${fraunces.className} text-xl font-bold text-[#000505]`}
          >
            Orders
          </h1>
          <p className="text-sm text-[#705C53] mt-0.5">
            Track and manage orders
          </p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4B8AC]" />
        <input
          type="text"
          placeholder="Search orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
        />
      </div>

      <div
        className="bg-[#FDFBF7] rounded-xl overflow-hidden"
        style={{
          boxShadow:
            "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
        }}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E0D8]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Order</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Items</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Total</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading && orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#705C53]">
                  Loading orders...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#705C53]">
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const badge = getStatusBadge(order.status);
                return (
                  <tr key={order.dbId} className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-[#000505]">{order.id}</td>
                    <td className="px-5 py-3 text-sm text-[#705C53] max-w-md truncate">{order.items}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#000505]">{order.total}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badge.style}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#C4B8AC]">{order.time}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
