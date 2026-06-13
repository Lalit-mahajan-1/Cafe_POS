"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Fraunces } from "next/font/google";
import {
  Armchair,
  Grid3X3,
  Maximize2,
  RotateCcw,
  Save,
  Table2,
  Trash2,
  Users,
  Loader2,
  Eye,
  Pencil,
  CalendarPlus,
  X,
  Clock,
  UserCheck,
  Coffee,
  AlertCircle,
} from "lucide-react";
import {
  floorPlanService,
  FloorTable,
  TableShape,
  BookingPayload,
} from "@/services/floorPlan";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const MAX_GRID_SIZE = 10;

const defaultTables: FloorTable[] = [
  { id: "table-1", label: "T1", row: 2, col: 2, seats: 2, width: 2, height: 2, shape: "round" },
  { id: "table-2", label: "T2", row: 2, col: 6, seats: 4, width: 3, height: 2, shape: "square" },
  { id: "table-3", label: "T3", row: 5, col: 4, seats: 6, width: 3, height: 3, shape: "round" },
  { id: "table-4", label: "T4", row: 8, col: 8, seats: 4, width: 3, height: 2, shape: "booth" },
];

const shapeStyles: Record<TableShape, string> = {
  round: "rounded-full",
  square: "rounded-lg",
  booth: "rounded-[18px]",
};

const shapeLabels: Record<TableShape, string> = {
  round: "Round",
  square: "Square",
  booth: "Booth",
};

const statusColors = {
  AVAILABLE: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Available",
  },
  OCCUPIED: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "Occupied",
  },
  RESERVED: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Reserved",
  },
};

const clampDimension = (value: number) =>
  Math.min(MAX_GRID_SIZE, Math.max(1, Number.isFinite(value) ? value : 1));

const makeTableId = () =>
  `table-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const nextTableLabel = (tables: FloorTable[]) => {
  const used = new Set(tables.map((t) => t.label.toUpperCase()));
  let index = 1;
  while (used.has(`T${index}`)) index += 1;
  return `T${index}`;
};

const sortTables = (tables: FloorTable[]) =>
  [...tables].sort((a, b) => a.row - b.row || a.col - b.col);

type ViewMode = "edit" | "view";

export default function TablesPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [tables, setTables] = useState<FloorTable[]>(defaultTables);
  const [selectedId, setSelectedId] = useState(defaultTables[0]?.id ?? "");
  const [savedAt, setSavedAt] = useState("Not saved yet");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("view");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingTableId, setBookingTableId] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState({
    guestName: "",
    guestPhone: "",
    guestCount: 1,
    date: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    notes: "",
  });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // ── Load from DB ───────────────────────────────────────────────────────────
  const loadFloorPlan = useCallback(async () => {
    try {
      const plan = await floorPlanService.get();
      if (!plan) {
        setIsLoading(false);
        return;
      }
      setRows(plan.rows);
      setCols(plan.cols);
      setTables(plan.tables);
      setSelectedId(plan.tables[0]?.id ?? "");
      setSavedAt("Loaded from database");
    } catch {
      setSavedAt("Could not load saved layout");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFloorPlan();
  }, [loadFloorPlan]);

  // Auto-refresh in view mode every 30s
  useEffect(() => {
    if (viewMode !== "view") return;
    const interval = setInterval(() => loadFloorPlan(), 30000);
    return () => clearInterval(interval);
  }, [viewMode, loadFloorPlan]);

  // ── Memos ──────────────────────────────────────────────────────────────────
  const sortedTables = useMemo(() => sortTables(tables), [tables]);

  const filteredTables = useMemo(() => {
    if (statusFilter === "ALL") return sortedTables;
    return sortedTables.filter((t) => t.status === statusFilter);
  }, [sortedTables, statusFilter]);

  const selectedTable = tables.find((t) => t.id === selectedId) ?? null;

  const occupiedCells = useMemo(
    () => new Map(tables.map((t) => [`${t.row}-${t.col}`, t])),
    [tables]
  );

  const summary = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === "AVAILABLE" || !t.status).length;
    const occupied = tables.filter((t) => t.status === "OCCUPIED").length;
    const reserved = tables.filter((t) => t.status === "RESERVED").length;
    return { total, available, occupied, reserved };
  }, [tables]);

  // ── Grid handlers (edit mode) ──────────────────────────────────────────────
  const handleGridSizeChange = (axis: "rows" | "cols", value: string) => {
    const dimension = clampDimension(Number(value));
    setSaveError(null);

    if (axis === "rows") {
      setRows(dimension);
      setTables((c) => c.filter((t) => t.row <= dimension));
    } else {
      setCols(dimension);
      setTables((c) => c.filter((t) => t.col <= dimension));
    }
  };

  const handleCellClick = (row: number, col: number) => {
    setSaveError(null);
    const existing = occupiedCells.get(`${row}-${col}`);

    if (existing) {
      setSelectedId(existing.id);
      return;
    }

    if (viewMode === "view") return;

    const newTable: FloorTable = {
      id: makeTableId(),
      label: nextTableLabel(tables),
      row,
      col,
      seats: 4,
      width: 2,
      height: 2,
      shape: "round",
      status: "AVAILABLE",
    };

    setTables((c) => sortTables([...c, newTable]));
    setSelectedId(newTable.id);
  };

  const updateSelectedTable = <K extends keyof FloorTable>(
    key: K,
    value: FloorTable[K]
  ) => {
    if (!selectedTable) return;
    setSaveError(null);
    setTables((c) =>
      c.map((t) => (t.id === selectedTable.id ? { ...t, [key]: value } : t))
    );
  };

  const removeSelectedTable = () => {
    if (!selectedTable) return;
    setSaveError(null);
    setTables((c) => c.filter((t) => t.id !== selectedTable.id));
    setSelectedId("");
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const savePlan = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      await floorPlanService.save({ rows, cols, tables });
      setSavedAt(
        `Saved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setSaveError(message);
      setSavedAt("Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [rows, cols, tables]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetPlan = () => {
    setSaveError(null);
    setRows(10);
    setCols(10);
    setTables(defaultTables);
    setSelectedId(defaultTables[0]?.id ?? "");
    setSavedAt("Reset to defaults");
  };

  // ── Booking ────────────────────────────────────────────────────────────────
  const openBookingModal = (tableId: string) => {
    setBookingTableId(tableId);
    setBookingForm({
      guestName: "",
      guestPhone: "",
      guestCount: 1,
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      notes: "",
    });
    setBookingError(null);
    setShowBookingModal(true);
  };

  const submitBooking = async () => {
    if (!bookingTableId) return;
    if (!bookingForm.guestName.trim()) {
      setBookingError("Guest name is required");
      return;
    }
    if (!bookingForm.startTime) {
      setBookingError("Start time is required");
      return;
    }

    setIsBooking(true);
    setBookingError(null);

    try {
      const payload: BookingPayload = {
        tableId: bookingTableId,
        guestName: bookingForm.guestName.trim(),
        guestPhone: bookingForm.guestPhone.trim() || undefined,
        guestCount: bookingForm.guestCount,
        date: bookingForm.date,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime || undefined,
        notes: bookingForm.notes.trim() || undefined,
      };

      await floorPlanService.createBooking(payload);
      setShowBookingModal(false);
      await loadFloorPlan();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Booking failed";
      setBookingError(message);
    } finally {
      setIsBooking(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      await floorPlanService.cancelBooking(bookingId);
      await loadFloorPlan();
    } catch (error) {
      console.error("Failed to cancel booking:", error);
    }
  };

  // ── Grid cell styles ──────────────────────────────────────────────────────
  const getCellStyles = (table: FloorTable | undefined, isSelected: boolean) => {
    if (!table) {
      return viewMode === "edit"
        ? "border-dashed border-[#D9CEC3] bg-[#FDFBF7] text-[#C4B8AC] hover:border-[#C86446] hover:text-[#C86446]"
        : "border-dashed border-[#E8E0D8] bg-[#FDFBF7]/50 text-transparent cursor-default";
    }

    if (isSelected) {
      return "border-[#C86446] bg-[#C86446] text-white shadow-[0_8px_18px_rgba(200,100,70,0.22)]";
    }

    if (viewMode === "view") {
      const status = table.status || "AVAILABLE";
      const colors = statusColors[status];
      return `${colors.border} ${colors.bg} ${colors.text} hover:shadow-md`;
    }

    return "border-[#E4B9AA] bg-[#FFF4F0] text-[#A84C32] hover:border-[#C86446]";
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#C86446] animate-spin" />
          <p className="text-sm text-[#705C53]">Loading floor plan...</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className={`${fraunces.className} text-xl font-bold text-[#000505]`}>
            Tables
          </h1>
          <p className="text-sm text-[#705C53] mt-0.5">
            {viewMode === "edit"
              ? "Design the floor grid and assign table positions"
              : "Live floor view — see which tables are occupied, reserved, or available"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveError && (
            <span className="text-xs text-[#A84C32] bg-[#FFF4F0] border border-[#F5D6CC] px-3 py-2 rounded-lg max-w-xs truncate flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {saveError}
            </span>
          )}

          {/* Mode toggle */}
          <div className="flex items-center bg-[#F3EFE8] rounded-lg p-1">
            <button
              onClick={() => setViewMode("view")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                viewMode === "view"
                  ? "bg-white text-[#000505] shadow-sm"
                  : "text-[#705C53] hover:text-[#000505]"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </button>
            <button
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                viewMode === "edit"
                  ? "bg-white text-[#000505] shadow-sm"
                  : "text-[#705C53] hover:text-[#000505]"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          {viewMode === "edit" && (
            <>
              <button
                onClick={resetPlan}
                disabled={isSaving}
                className="flex items-center gap-2 border border-[#E8E0D8] bg-[#FDFBF7] text-[#705C53] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F3EFE8] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={savePlan}
                disabled={isSaving}
                className="flex items-center gap-2 bg-[#C86446] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed min-w-[120px] justify-center"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Layout
                  </>
                )}
              </button>
            </>
          )}

          {viewMode === "view" && (
            <button
              onClick={() => loadFloorPlan()}
              className="flex items-center gap-2 border border-[#E8E0D8] bg-[#FDFBF7] text-[#705C53] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F3EFE8] transition-all duration-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* ── Status Summary Cards (View mode) ── */}
      {viewMode === "view" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {(
            [
              { key: "ALL", label: "Total", count: summary.total, color: "bg-[#C86446]" },
              { key: "AVAILABLE", label: "Available", count: summary.available, color: "bg-emerald-500" },
              { key: "OCCUPIED", label: "Occupied", count: summary.occupied, color: "bg-red-500" },
              { key: "RESERVED", label: "Reserved", count: summary.reserved, color: "bg-amber-500" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                statusFilter === item.key
                  ? "border-[#C86446] bg-[#FFF4F0] shadow-sm"
                  : "border-[#E8E0D8] bg-[#FDFBF7] hover:bg-[#F8F4EE]"
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${item.color}`} />
              <span>
                <span className="block text-lg font-bold text-[#000505]">
                  {item.count}
                </span>
                <span className="block text-xs text-[#705C53]">{item.label}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        {/* ── Floor Grid ── */}
        <section
          className="bg-[#FDFBF7] rounded-lg p-5"
          style={{
            boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
          }}
        >
          <div className="flex flex-col gap-4 mb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
                {viewMode === "edit" ? "Floor Grid" : "Live Floor View"}
              </h2>
              <p className="text-sm text-[#705C53] mt-1">
                {viewMode === "edit"
                  ? "Click any empty cell to place a table."
                  : "Click a table to see details. Colors show status."}
              </p>
            </div>

            {viewMode === "edit" && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                    Rows
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={MAX_GRID_SIZE}
                    value={rows}
                    onChange={(e) => handleGridSizeChange("rows", e.target.value)}
                    className="w-24 px-3 py-2 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                    Columns
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={MAX_GRID_SIZE}
                    value={cols}
                    onChange={(e) => handleGridSizeChange("cols", e.target.value)}
                    className="w-24 px-3 py-2 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                  />
                </label>
              </div>
            )}

            {viewMode === "view" && (
              <div className="flex items-center gap-4 text-xs text-[#705C53]">
                {Object.entries(statusColors).map(([key, val]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
                    {val.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="overflow-x-auto rounded-lg border border-[#E8E0D8] bg-[#F8F4EE] p-4">
            <div
              className="grid min-w-[560px] gap-2"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(44px, 1fr))`,
              }}
            >
              {Array.from({ length: rows }).map((_, rowIndex) =>
                Array.from({ length: cols }).map((__, colIndex) => {
                  const row = rowIndex + 1;
                  const col = colIndex + 1;
                  const table = occupiedCells.get(`${row}-${col}`);
                  const isSelected = table?.id === selectedId;

                  // In view mode with filter, dim non-matching tables
                  const isFiltered =
                    viewMode === "view" &&
                    statusFilter !== "ALL" &&
                    table &&
                    (table.status || "AVAILABLE") !== statusFilter;

                  return (
                    <button
                      key={`${row}-${col}`}
                      type="button"
                      onClick={() => handleCellClick(row, col)}
                      aria-label={
                        table
                          ? `${table.label} — ${
                              statusColors[table.status || "AVAILABLE"].label
                            }`
                          : viewMode === "edit"
                          ? `Place table at R${row} C${col}`
                          : "Empty cell"
                      }
                      className={`aspect-square min-h-11 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer ${getCellStyles(
                        table,
                        isSelected
                      )} ${isFiltered ? "opacity-20" : ""}`}
                    >
                      {table ? table.label : ""}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#705C53] md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-[#C86446]" />
              <span>
                {rows} × {cols} grid
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-[#C86446]" />
              <span>{tables.length} tables placed</span>
            </div>
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-[#C86446]" />
              <span className={saveError ? "text-[#A84C32]" : ""}>{savedAt}</span>
            </div>
          </div>
        </section>

        {/* ── Right Sidebar ── */}
        <aside className="space-y-6">
          {/* Table Details / Info */}
          <section
            className="bg-[#FDFBF7] rounded-lg p-5"
            style={{
              boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
            }}
          >
            <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
              {viewMode === "edit" ? "Table Details" : "Table Info"}
            </h2>
            <p className="text-sm text-[#705C53] mt-1">
              {viewMode === "edit"
                ? "Select a cell to edit the table."
                : "Select a table to see status and bookings."}
            </p>

            {selectedTable ? (
              <div className="mt-5 space-y-4">
                {/* ── View Mode Info ── */}
                {viewMode === "view" && (
                  <>
                    {/* Status badge */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        statusColors[selectedTable.status || "AVAILABLE"].border
                      } ${statusColors[selectedTable.status || "AVAILABLE"].bg}`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          statusColors[selectedTable.status || "AVAILABLE"].dot
                        }`}
                      />
                      <span
                        className={`text-sm font-semibold ${
                          statusColors[selectedTable.status || "AVAILABLE"].text
                        }`}
                      >
                        {statusColors[selectedTable.status || "AVAILABLE"].label}
                      </span>
                    </div>

                    {/* Table info */}
                    <div className="rounded-lg border border-[#E8E0D8] bg-[#F8F4EE] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#705C53]">Table</span>
                        <span className="text-sm font-bold text-[#000505]">
                          {selectedTable.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#705C53]">Seats</span>
                        <span className="text-sm font-semibold text-[#000505] flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {selectedTable.seats}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#705C53]">Shape</span>
                        <span className="text-sm text-[#000505]">
                          {shapeLabels[selectedTable.shape]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#705C53]">Position</span>
                        <span className="text-sm text-[#000505]">
                          R{selectedTable.row} C{selectedTable.col}
                        </span>
                      </div>
                    </div>

                    {/* Active order */}
                    {selectedTable.activeOrder && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Coffee className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-semibold text-red-700">
                            Active Order
                          </span>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-red-600">Order #</span>
                            <span className="font-medium text-red-800">
                              {selectedTable.activeOrder.orderNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600">Total</span>
                            <span className="font-bold text-red-800">
                              ₹{selectedTable.activeOrder.total.toFixed(2)}
                            </span>
                          </div>
                          {selectedTable.activeOrder.customer && (
                            <div className="flex justify-between">
                              <span className="text-red-600">Customer</span>
                              <span className="font-medium text-red-800">
                                {selectedTable.activeOrder.customer.name}
                              </span>
                            </div>
                          )}
                          {selectedTable.activeOrder.employee && (
                            <div className="flex justify-between">
                              <span className="text-red-600">Server</span>
                              <span className="text-red-800">
                                {selectedTable.activeOrder.employee.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Today's bookings */}
                    {selectedTable.todayBookings &&
                      selectedTable.todayBookings.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-semibold text-amber-700">
                              Today&apos;s Bookings
                            </span>
                          </div>
                          <div className="space-y-2">
                            {selectedTable.todayBookings.map((booking) => (
                              <div
                                key={booking.id}
                                className="flex items-center justify-between bg-white rounded-md p-2.5 border border-amber-100"
                              >
                                <div>
                                  <p className="text-sm font-medium text-[#000505]">
                                    {booking.customer?.name || booking.guestName}
                                  </p>
                                  <p className="text-xs text-[#705C53]">
                                    {booking.startTime}
                                    {booking.endTime ? ` — ${booking.endTime}` : ""}{" "}
                                    · {booking.guestCount} guests
                                  </p>
                                </div>
                                <button
                                  onClick={() => cancelBooking(booking.id)}
                                  className="text-red-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                                  title="Cancel booking"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Book this table button */}
                    {(selectedTable.status === "AVAILABLE" || !selectedTable.status) && (
                      <button
                        onClick={() => openBookingModal(selectedTable.id)}
                        className="flex w-full items-center justify-center gap-2 bg-[#C86446] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        Book This Table
                      </button>
                    )}
                  </>
                )}

                {/* ── Edit Mode Fields ── */}
                {viewMode === "edit" && (
                  <>
                    <label className="block">
                      <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                        Table Name
                      </span>
                      <input
                        type="text"
                        value={selectedTable.label}
                        onChange={(e) =>
                          updateSelectedTable("label", e.target.value.toUpperCase())
                        }
                        className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                          Seats
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={selectedTable.seats}
                          onChange={(e) =>
                            updateSelectedTable("seats", Math.max(1, Number(e.target.value)))
                          }
                          className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                          Shape
                        </span>
                        <select
                          value={selectedTable.shape}
                          onChange={(e) =>
                            updateSelectedTable("shape", e.target.value as TableShape)
                          }
                          className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                        >
                          {Object.entries(shapeLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                          Width
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={selectedTable.width}
                          onChange={(e) =>
                            updateSelectedTable("width", Math.max(1, Number(e.target.value)))
                          }
                          className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                          Depth
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={selectedTable.height}
                          onChange={(e) =>
                            updateSelectedTable("height", Math.max(1, Number(e.target.value)))
                          }
                          className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                        />
                      </label>
                    </div>

                    {/* Preview */}
                    <div className="rounded-lg border border-[#E8E0D8] bg-[#F8F4EE] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">
                            Preview
                          </p>
                          <p className="text-sm text-[#705C53] mt-1">
                            R{selectedTable.row} C{selectedTable.col}
                          </p>
                          <p className="text-xs text-[#C4B8AC] mt-0.5">
                            {selectedTable.seats} seats · {shapeLabels[selectedTable.shape]}
                          </p>
                        </div>
                        <div
                          className={`flex items-center justify-center bg-[#C86446] text-white font-bold text-sm ${
                            shapeStyles[selectedTable.shape]
                          }`}
                          style={{
                            width: `${Math.min(112, selectedTable.width * 26)}px`,
                            height: `${Math.min(88, selectedTable.height * 24)}px`,
                          }}
                        >
                          {selectedTable.label}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={removeSelectedTable}
                      className="flex w-full items-center justify-center gap-2 border border-[#F5D6CC] bg-[#FFF4F0] text-[#A84C32] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#FBE6DE] transition-all duration-200 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Table
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-[#D9CEC3] bg-[#F8F4EE] px-4 py-8 text-center">
                <Maximize2 className="w-5 h-5 text-[#C4B8AC] mx-auto mb-2" />
                <p className="text-sm text-[#705C53]">No table selected</p>
                <p className="text-xs text-[#C4B8AC] mt-1">
                  Click a table on the grid to see details
                </p>
              </div>
            )}
          </section>

          {/* Table List */}
          <section
            className="bg-[#FDFBF7] rounded-lg p-5"
            style={{
              boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
                {viewMode === "edit" ? "Assigned Tables" : "All Tables"}
              </h2>
              <span className="text-xs text-[#705C53] bg-[#F3EFE8] px-2 py-1 rounded-full">
                {filteredTables.length} shown
              </span>
            </div>

            {filteredTables.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#D9CEC3] bg-[#F8F4EE] px-4 py-6 text-center">
                <p className="text-sm text-[#705C53]">No tables found</p>
                <p className="text-xs text-[#C4B8AC] mt-1">
                  {statusFilter !== "ALL"
                    ? "Try changing the status filter"
                    : "Click empty cells on the grid to add tables"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {filteredTables.map((table) => {
                  const status = table.status || "AVAILABLE";
                  const colors = statusColors[status];

                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => setSelectedId(table.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-all duration-200 cursor-pointer ${
                        selectedId === table.id
                          ? "border-[#C86446] bg-[#FFF4F0]"
                          : "border-[#E8E0D8] bg-[#FDFBF7] hover:bg-[#F8F4EE]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3EFE8]">
                          <Armchair className="w-4 h-4 text-[#705C53]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[#000505]">
                            {table.label}
                          </span>
                          <span className="block text-xs text-[#C4B8AC]">
                            R{table.row} C{table.col} · {shapeLabels[table.shape]}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {viewMode === "view" && (
                          <span
                            className={`w-2 h-2 rounded-full ${colors.dot}`}
                            title={colors.label}
                          />
                        )}
                        <span className="flex items-center gap-1 text-xs text-[#705C53]">
                          <Users className="w-3.5 h-3.5" />
                          {table.seats}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* ── Booking Modal ── */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#FDFBF7] rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className={`${fraunces.className} text-lg font-bold text-[#000505]`}>
                Book Table{" "}
                {tables.find((t) => t.id === bookingTableId)?.label ?? ""}
              </h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-[#705C53] hover:text-[#000505] transition-colors cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                  Guest Name *
                </span>
                <input
                  type="text"
                  value={bookingForm.guestName}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, guestName: e.target.value }))
                  }
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                  Phone
                </span>
                <input
                  type="tel"
                  value={bookingForm.guestPhone}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, guestPhone: e.target.value }))
                  }
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                    Guests *
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={bookingForm.guestCount}
                    onChange={(e) =>
                      setBookingForm((f) => ({
                        ...f,
                        guestCount: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                    Date *
                  </span>
                  <input
                    type="date"
                    value={bookingForm.date}
                    onChange={(e) =>
                      setBookingForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                    Start Time *
                  </span>
                  <input
                    type="time"
                    value={bookingForm.startTime}
                    onChange={(e) =>
                      setBookingForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                    End Time
                  </span>
                  <input
                    type="time"
                    value={bookingForm.endTime}
                    onChange={(e) =>
                      setBookingForm((f) => ({ ...f, endTime: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                  Notes
                </span>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  placeholder="Special requests..."
                  className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200 resize-none"
                />
              </label>

              {bookingError && (
                <div className="flex items-center gap-2 text-sm text-[#A84C32] bg-[#FFF4F0] border border-[#F5D6CC] rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {bookingError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 border border-[#E8E0D8] bg-[#FDFBF7] text-[#705C53] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F3EFE8] transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBooking}
                  disabled={isBooking}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#C86446] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isBooking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}