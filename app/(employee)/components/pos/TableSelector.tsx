"use client";

import {
  AlertCircle,
  Coffee,
  Loader2,
  Package,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import type { FloorPlan, FloorTable } from "./pos-types";
import { statusConfig, formatMoney } from "./pos-constants";

type Props = {
  open: boolean;
  floorPlan: FloorPlan | null;
  floorLoading: boolean;
  floorError: string | null;
  selectedTable: FloorTable | null;
  isTakeout: boolean;
  onSelectTable: (table: FloorTable) => void;
  onTakeout: () => void;
  onRefresh: () => void;
  onClose: () => void;
};

function getGridCellStyle(table: FloorTable, isSelected: boolean) {
  const config = statusConfig[table.status];
  if (isSelected) {
    return "border-[#C86446] bg-[#C86446] text-white shadow-lg scale-105";
  }
  return `${config.gridBorder} ${config.gridBg} ${config.gridText} hover:shadow-md hover:scale-105`;
}

export default function TableSelector({
  open,
  floorPlan,
  floorLoading,
  floorError,
  selectedTable,
  isTakeout,
  onSelectTable,
  onTakeout,
  onRefresh,
  onClose,
}: Props) {
  if (!open) return null;

  const canClose = selectedTable || isTakeout;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-[#FDFBF7] rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#FDFBF7] border-b border-[#E6DDD1] px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-[#000505]">
              Select a Table
            </h2>
            <p className="text-sm text-[#705C53] mt-0.5">
              Choose a table for dine-in or pick takeout
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={floorLoading}
              className="flex items-center gap-1.5 text-sm text-[#705C53] hover:text-[#000505] transition px-3 py-1.5 rounded-lg hover:bg-[#F3EFE8]"
            >
              <RefreshCw
                className={`size-4 ${floorLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F3EFE8] rounded-lg transition"
              aria-label="Close table selector"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Takeout Option */}
          <button
            onClick={onTakeout}
            className={`w-full mb-6 flex items-center gap-4 rounded-lg border-2 p-4 transition-all duration-200 ${
              isTakeout
                ? "border-blue-500 bg-blue-50 shadow-md"
                : "border-[#E6DDD1] bg-white hover:border-blue-300 hover:bg-blue-50/50"
            }`}
          >
            <div
              className={`grid size-12 place-items-center rounded-lg ${
                isTakeout ? "bg-blue-500 text-white" : "bg-[#F3EFE8] text-[#705C53]"
              }`}
            >
              <Package className="size-6" />
            </div>
            <div className="text-left">
              <p
                className={`font-bold ${
                  isTakeout ? "text-blue-700" : "text-[#000505]"
                }`}
              >
                Takeout Order
              </p>
              <p className="text-sm text-[#705C53]">
                No table assigned — customer takes the order to go
              </p>
            </div>
            {isTakeout && (
              <div className="ml-auto shrink-0 grid size-8 place-items-center rounded-full bg-blue-500 text-white">
                ✓
              </div>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#E6DDD1]" />
            <span className="text-xs font-semibold text-[#C4B8AC] uppercase tracking-widest">
              or select a table
            </span>
            <div className="flex-1 h-px bg-[#E6DDD1]" />
          </div>

          {/* Error */}
          {floorError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="size-4 shrink-0" />
              {floorError}
            </div>
          )}

          {/* Loading */}
          {floorLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 text-[#C86446] animate-spin" />
            </div>
          )}

          {/* No floor plan */}
          {!floorLoading && !floorPlan && !floorError && (
            <div className="text-center py-16">
              <Coffee className="size-10 text-[#C4B8AC] mx-auto mb-3" />
              <p className="text-[#705C53] font-semibold">
                No floor plan configured
              </p>
              <p className="text-sm text-[#C4B8AC] mt-1">
                Ask admin to set up the floor plan, or use takeout above
              </p>
            </div>
          )}

          {/* Floor Plan Grid */}
          {!floorLoading && floorPlan && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {(
                  [
                    { label: "Total", count: floorPlan.summary.total, color: "bg-[#C86446]" },
                    { label: "Available", count: floorPlan.summary.available, color: "bg-emerald-500" },
                    { label: "Occupied", count: floorPlan.summary.occupied, color: "bg-red-500" },
                    { label: "Reserved", count: floorPlan.summary.reserved, color: "bg-amber-500" },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[#E6DDD1] bg-white"
                  >
                    <span className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span>
                      <span className="block text-lg font-bold text-[#000505]">
                        {item.count}
                      </span>
                      <span className="block text-xs text-[#705C53]">
                        {item.label}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                {Object.entries(statusConfig).map(([key, val]) => (
                  <span key={key} className="flex items-center gap-1.5 text-xs text-[#705C53]">
                    <span className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
                    {val.label}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 text-xs text-[#705C53]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C86446]" />
                  Selected
                </span>
              </div>

              {/* Grid */}
              <div className="overflow-x-auto rounded-lg border border-[#E6DDD1] bg-[#F8F4EE] p-4">
                <div
                  className="grid gap-2 min-w-[500px]"
                  style={{
                    gridTemplateColumns: `repeat(${floorPlan.cols}, minmax(64px, 1fr))`,
                  }}
                >
                  {Array.from({ length: floorPlan.rows }).map((_, rowIdx) =>
                    Array.from({ length: floorPlan.cols }).map((__, colIdx) => {
                      const row = rowIdx + 1;
                      const col = colIdx + 1;
                      const table = floorPlan.tables.find(
                        (t) => t.row === row && t.col === col
                      );
                      const isSelected =
                        !isTakeout && selectedTable?.id === table?.id;

                      if (!table) {
                        return (
                          <div
                            key={`${row}-${col}`}
                            className="aspect-square min-h-[64px] rounded-lg border border-dashed border-[#D9CEC3] bg-[#FDFBF7]/50"
                          />
                        );
                      }

                      return (
                        <button
                          key={table.id}
                          onClick={() => onSelectTable(table)}
                          className={`aspect-square min-h-[64px] rounded-lg border-2 text-xs font-bold transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1 ${getGridCellStyle(
                            table,
                            isSelected
                          )}`}
                        >
                          <span className="text-sm font-bold">
                            {table.label}
                          </span>
                          <span className="flex items-center gap-0.5 text-[10px] font-normal opacity-80">
                            <Users className="size-2.5" />
                            {table.seats}
                          </span>
                          {table.status !== "AVAILABLE" && (
                            <span className="text-[9px] font-semibold uppercase opacity-90">
                              {table.status === "OCCUPIED" ? "Busy" : "Booked"}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Table Detail */}
              {selectedTable && !isTakeout && (
                <div
                  className={`mt-4 rounded-lg border p-4 ${
                    statusConfig[selectedTable.status].border
                  } ${statusConfig[selectedTable.status].bg}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
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
                          {selectedTable.label} —{" "}
                          {statusConfig[selectedTable.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-[#705C53] mt-1">
                        {selectedTable.seats} seats · Row {selectedTable.row},
                        Col {selectedTable.col}
                      </p>

                      {selectedTable.status === "OCCUPIED" &&
                        selectedTable.activeOrder && (
                          <div className="mt-2 text-sm text-red-700">
                            <p className="font-semibold">
                              Order: {selectedTable.activeOrder.orderNumber}
                            </p>
                            <p>
                              Total:{" "}
                              {formatMoney(selectedTable.activeOrder.total)}
                            </p>
                            {selectedTable.activeOrder.customer && (
                              <p>
                                Customer:{" "}
                                {selectedTable.activeOrder.customer.name}
                              </p>
                            )}
                            {selectedTable.activeOrder.employee && (
                              <p>
                                Server:{" "}
                                {selectedTable.activeOrder.employee.name}
                              </p>
                            )}
                          </div>
                        )}

                      {selectedTable.status === "RESERVED" &&
                        selectedTable.todayBookings.length > 0 && (
                          <div className="mt-2 text-sm text-amber-700">
                            {selectedTable.todayBookings.map((b) => (
                              <p key={b.id}>
                                {b.guestName || b.customer?.name} ·{" "}
                                {b.guestCount} guests · {b.startTime}
                                {b.endTime ? ` — ${b.endTime}` : ""}
                              </p>
                            ))}
                          </div>
                        )}
                    </div>

                    {selectedTable.status === "AVAILABLE" && (
                      <button
                        onClick={onClose}
                        className="shrink-0 rounded-md bg-[#C86446] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B55A3E] transition"
                      >
                        Use This Table →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}