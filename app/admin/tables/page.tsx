"use client";

import { Fraunces } from "next/font/google";
import { Plus, Users } from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const tables = [
  { id: "T1", seats: 2, status: "occupied" as const, server: "Maria" },
  { id: "T2", seats: 4, status: "available" as const, server: null },
  { id: "T3", seats: 6, status: "reserved" as const, server: null },
  { id: "T4", seats: 2, status: "occupied" as const, server: "James" },
  { id: "T5", seats: 4, status: "available" as const, server: null },
  { id: "T6", seats: 4, status: "occupied" as const, server: "Maria" },
  { id: "T7", seats: 8, status: "available" as const, server: null },
  { id: "T8", seats: 2, status: "reserved" as const, server: null },
];

const statusStyles = {
  occupied: "bg-[#FFF4F0] text-[#A84C32] border-[#F5D6CC]",
  available: "bg-[#F0F9F0] text-[#2D6A2D] border-[#C8E6C8]",
  reserved: "bg-[#FEF8E7] text-[#8A6D00] border-[#F0E6C0]",
};

export default function TablesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className={`${fraunces.className} text-xl font-bold text-[#000505]`}
          >
            Tables
          </h1>
          <p className="text-sm text-[#705C53] mt-0.5">
            Manage your floor layout
          </p>
        </div>
        <button className="flex items-center gap-2 bg-[#C86446] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer">
          <Plus className="w-4 h-4" />
          Add Table
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="bg-[#FDFBF7] rounded-xl p-5"
            style={{
              boxShadow:
                "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`${fraunces.className} text-lg font-bold text-[#000505]`}
              >
                {table.id}
              </span>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  statusStyles[table.status]
                }`}
              >
                {table.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-[#705C53]">
              <Users className="w-4 h-4" />
              <span>{table.seats} seats</span>
            </div>
            {table.server && (
              <p className="text-xs text-[#C4B8AC] mt-2">
                Server: {table.server}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
