"use client";

import { Fraunces } from "next/font/google";
import {
  DollarSign,
  ClipboardList,
  Table2,
  Clock,
  ArrowRight,
  Coffee,
} from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const stats = [
  {
    label: "Today's Revenue",
    value: "$1,284",
    change: "+12.5%",
    positive: true,
    icon: DollarSign,
  },
  {
    label: "Orders Today",
    value: "47",
    change: "+8.2%",
    positive: true,
    icon: ClipboardList,
  },
  {
    label: "Active Tables",
    value: "6",
    change: "2 available",
    positive: true,
    icon: Table2,
  },
  {
    label: "Avg. Preparation",
    value: "12m",
    change: "-2m from yesterday",
    positive: true,
    icon: Clock,
  },
];

export default function AdminDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#FDFBF7] rounded-xl p-5"
            style={{
              boxShadow:
                "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">
                {stat.label}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F3EFE8] flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-[#705C53]" />
              </div>
            </div>
            <p
              className={`${fraunces.className} text-2xl font-bold text-[#000505]`}
            >
              {stat.value}
            </p>
            <p
              className={`text-xs mt-1 ${
                stat.positive ? "text-green-600" : "text-[#A84C32]"
              }`}
            >
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="bg-[#FDFBF7] rounded-xl p-6"
          style={{
            boxShadow:
              "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
          }}
        >
          <h2
            className={`${fraunces.className} text-base font-bold text-[#000505] mb-4`}
          >
            Recent Orders
          </h2>
          <div className="space-y-3">
            {[
              { id: "#1042", items: "2x Cappuccino, 1x Croissant", time: "2m ago", total: "$18.50" },
              { id: "#1041", items: "1x Flat White, 1x Blueberry Muffin", time: "5m ago", total: "$11.75" },
              { id: "#1040", items: "3x Espresso, 2x Panini", time: "8m ago", total: "$32.40" },
            ].map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between py-2 border-b border-[#E8E0D8] last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-[#000505]">
                    {order.id}
                  </p>
                  <p className="text-xs text-[#C4B8AC]">{order.items}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#000505]">
                    {order.total}
                  </p>
                  <p className="text-xs text-[#C4B8AC]">{order.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 flex items-center gap-1 text-sm text-[#C86446] font-medium hover:text-[#B55A3E] transition-colors duration-200 cursor-pointer">
            View all orders
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          className="bg-[#FDFBF7] rounded-xl p-6"
          style={{
            boxShadow:
              "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
          }}
        >
          <h2
            className={`${fraunces.className} text-base font-bold text-[#000505] mb-4`}
          >
            Top Products
          </h2>
          <div className="space-y-3">
            {[
              { name: "Cappuccino", sold: 128, revenue: "$576" },
              { name: "Flat White", sold: 96, revenue: "$432" },
              { name: "Croissant", sold: 84, revenue: "$336" },
              { name: "Espresso", sold: 72, revenue: "$252" },
            ].map((product) => (
              <div
                key={product.name}
                className="flex items-center justify-between py-2 border-b border-[#E8E0D8] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F3EFE8] flex items-center justify-center">
                    <Coffee className="w-4 h-4 text-[#705C53]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#000505]">
                      {product.name}
                    </p>
                    <p className="text-xs text-[#C4B8AC]">
                      {product.sold} sold
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-[#000505]">
                  {product.revenue}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
