"use client";

import { Fraunces } from "next/font/google";
import { Search, Coffee } from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const orders = [
  { id: "#1042", items: "2x Cappuccino, 1x Croissant", total: "$18.50", status: "preparing" as const, time: "2m ago" },
  { id: "#1041", items: "1x Flat White, 1x Blueberry Muffin", total: "$11.75", status: "ready" as const, time: "5m ago" },
  { id: "#1040", items: "3x Espresso, 2x Panini", total: "$32.40", status: "completed" as const, time: "8m ago" },
  { id: "#1039", items: "1x Latte, 1x Chai Tea", total: "$9.00", status: "preparing" as const, time: "12m ago" },
  { id: "#1038", items: "2x Croissant", total: "$8.00", status: "completed" as const, time: "20m ago" },
  { id: "#1037", items: "1x Panini, 1x Espresso", total: "$11.50", status: "cancelled" as const, time: "35m ago" },
];

const statusStyles = {
  preparing: "bg-[#FEF8E7] text-[#8A6D00] border-[#F0E6C0]",
  ready: "bg-[#F0F9F0] text-[#2D6A2D] border-[#C8E6C8]",
  completed: "bg-[#F3EFE8] text-[#705C53] border-[#E8E0D8]",
  cancelled: "bg-[#FFF4F0] text-[#A84C32] border-[#F5D6CC]",
};

export default function OrdersPage() {
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
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/50 transition-colors">
                <td className="px-5 py-3 text-sm font-medium text-[#000505]">{order.id}</td>
                <td className="px-5 py-3 text-sm text-[#705C53]">{order.items}</td>
                <td className="px-5 py-3 text-sm font-medium text-[#000505]">{order.total}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusStyles[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-[#C4B8AC]">{order.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
