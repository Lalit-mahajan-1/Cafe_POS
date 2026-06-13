"use client";

import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Package,
} from "lucide-react";
import type { UserSummary, FloorTable } from "./pos-types";
import { statusConfig } from "./pos-constants";

type Props = {
  user: UserSummary;
  selectedTable: FloorTable | null;
  isTakeout: boolean;
  onOpenFloorModal: () => void;
  onNewOrder: () => void;
};

export default function POSHeader({
  user,
  selectedTable,
  isTakeout,
  onOpenFloorModal,
  onNewOrder,
}: Props) {
  return (
    <header className="flex flex-col gap-4 rounded-lg bg-[#FDFBF7] p-5 shadow-sm ring-1 ring-[#E6DDD1] lg:flex-row lg:items-center lg:justify-between">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#705C53]"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Cafe POS Terminal
        </h1>
        <p className="mt-2 text-[#705C53]">
          {user.name} · {user.role}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Table / Takeout indicator */}
        {isTakeout && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-400 bg-blue-50">
            <Package className="size-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-700">Takeout</span>
          </div>
        )}

        {selectedTable && !isTakeout && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              statusConfig[selectedTable.status].border
            } ${statusConfig[selectedTable.status].bg}`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                statusConfig[selectedTable.status].dot
              }`}
            />
            <span
              className={`text-sm font-bold ${
                statusConfig[selectedTable.status].text
              }`}
            >
              {selectedTable.label}
            </span>
            <span className="text-xs text-[#705C53]">
              · {selectedTable.seats} seats
            </span>
          </div>
        )}

        <button
          onClick={onOpenFloorModal}
          className="flex items-center gap-2 rounded-md border border-[#E6DDD1] px-4 py-2 text-sm font-semibold text-[#705C53] hover:bg-[#F3EFE8] transition"
        >
          <MapPin className="size-4" />
          {selectedTable || isTakeout ? "Change Table" : "Select Table"}
        </button>

        <button
          onClick={onNewOrder}
          className="rounded-md border border-[#C86446] px-4 py-2 text-sm font-semibold text-[#C86446] transition hover:bg-[#C86446] hover:text-white"
        >
          New Order
        </button>
      </div>
    </header>
  );
}