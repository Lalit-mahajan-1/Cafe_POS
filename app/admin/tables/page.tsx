"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

type TableShape = "round" | "square" | "booth";

type FloorTable = {
  id: string;
  label: string;
  row: number;
  col: number;
  seats: number;
  width: number;
  height: number;
  shape: TableShape;
};

type FloorPlan = {
  rows: number;
  cols: number;
  tables: FloorTable[];
};

const STORAGE_KEY = "cafe-pos-admin-floor-plan";
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

const clampDimension = (value: number) =>
  Math.min(MAX_GRID_SIZE, Math.max(1, Number.isFinite(value) ? value : 1));

const makeTableId = () =>
  `table-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const nextTableLabel = (tables: FloorTable[]) => {
  const used = new Set(tables.map((table) => table.label.toUpperCase()));
  let index = 1;

  while (used.has(`T${index}`)) index += 1;

  return `T${index}`;
};

const sortTables = (tables: FloorTable[]) =>
  [...tables].sort((a, b) => a.row - b.row || a.col - b.col);

export default function TablesPage() {
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [tables, setTables] = useState<FloorTable[]>(defaultTables);
  const [selectedId, setSelectedId] = useState(defaultTables[0]?.id ?? "");
  const [savedAt, setSavedAt] = useState("Not saved yet");

  useEffect(() => {
    const loadSavedPlan = window.setTimeout(() => {
      const savedPlan = window.localStorage.getItem(STORAGE_KEY);
      if (!savedPlan) return;

      try {
        const parsed = JSON.parse(savedPlan) as FloorPlan;
        const savedTables = Array.isArray(parsed.tables)
          ? parsed.tables
          : defaultTables;

        setRows(clampDimension(parsed.rows));
        setCols(clampDimension(parsed.cols));
        setTables(savedTables);
        setSelectedId(savedTables[0]?.id ?? "");
        setSavedAt("Loaded from this browser");
      } catch {
        setSavedAt("Saved layout could not be loaded");
      }
    }, 0);

    return () => window.clearTimeout(loadSavedPlan);
  }, []);

  const sortedTables = useMemo(() => sortTables(tables), [tables]);
  const selectedTable = tables.find((table) => table.id === selectedId) ?? null;
  const occupiedCells = useMemo(
    () => new Map(tables.map((table) => [`${table.row}-${table.col}`, table])),
    [tables]
  );

  const handleGridSizeChange = (axis: "rows" | "cols", value: string) => {
    const dimension = clampDimension(Number(value));

    if (axis === "rows") {
      setRows(dimension);
      setTables((current) => current.filter((table) => table.row <= dimension));
      return;
    }

    setCols(dimension);
    setTables((current) => current.filter((table) => table.col <= dimension));
  };

  const handleCellClick = (row: number, col: number) => {
    const existing = occupiedCells.get(`${row}-${col}`);

    if (existing) {
      setSelectedId(existing.id);
      return;
    }

    const newTable: FloorTable = {
      id: makeTableId(),
      label: nextTableLabel(tables),
      row,
      col,
      seats: 4,
      width: 2,
      height: 2,
      shape: "round",
    };

    setTables((current) => sortTables([...current, newTable]));
    setSelectedId(newTable.id);
  };

  const updateSelectedTable = <K extends keyof FloorTable>(
    key: K,
    value: FloorTable[K]
  ) => {
    if (!selectedTable) return;

    setTables((current) =>
      current.map((table) =>
        table.id === selectedTable.id ? { ...table, [key]: value } : table
      )
    );
  };

  const removeSelectedTable = () => {
    if (!selectedTable) return;

    setTables((current) => current.filter((table) => table.id !== selectedTable.id));
    setSelectedId("");
  };

  const savePlan = () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ rows, cols, tables } satisfies FloorPlan)
    );
    setSavedAt(`Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  };

  const resetPlan = () => {
    setRows(10);
    setCols(10);
    setTables(defaultTables);
    setSelectedId(defaultTables[0]?.id ?? "");
    setSavedAt("Reset in editor");
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className={`${fraunces.className} text-xl font-bold text-[#000505]`}>
            Tables
          </h1>
          <p className="text-sm text-[#705C53] mt-0.5">
            Design the floor grid and assign table positions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={resetPlan}
            className="flex items-center gap-2 border border-[#E8E0D8] bg-[#FDFBF7] text-[#705C53] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F3EFE8] transition-all duration-200 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={savePlan}
            className="flex items-center gap-2 bg-[#C86446] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Layout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <section
          className="bg-[#FDFBF7] rounded-lg p-5"
          style={{
            boxShadow:
              "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
          }}
        >
          <div className="flex flex-col gap-4 mb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
                Floor Grid
              </h2>
              <p className="text-sm text-[#705C53] mt-1">
                Click any empty dot to create the next table number.
              </p>
            </div>

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
                  onChange={(event) => handleGridSizeChange("rows", event.target.value)}
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
                  onChange={(event) => handleGridSizeChange("cols", event.target.value)}
                  className="w-24 px-3 py-2 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                />
              </label>
            </div>
          </div>

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

                  return (
                    <button
                      key={`${row}-${col}`}
                      type="button"
                      onClick={() => handleCellClick(row, col)}
                      aria-label={
                        table
                          ? `Select ${table.label} at row ${row}, column ${col}`
                          : `Create table at row ${row}, column ${col}`
                      }
                      className={`aspect-square min-h-11 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer ${
                        table
                          ? isSelected
                            ? "border-[#C86446] bg-[#C86446] text-white shadow-[0_8px_18px_rgba(200,100,70,0.22)]"
                            : "border-[#E4B9AA] bg-[#FFF4F0] text-[#A84C32] hover:border-[#C86446]"
                          : "border-dashed border-[#D9CEC3] bg-[#FDFBF7] text-[#C4B8AC] hover:border-[#C86446] hover:text-[#C86446]"
                      }`}
                    >
                      {table ? table.label : ""}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#705C53] md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-[#C86446]" />
              <span>
                {rows} x {cols} grid
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-[#C86446]" />
              <span>{tables.length} tables placed</span>
            </div>
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-[#C86446]" />
              <span>{savedAt}</span>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section
            className="bg-[#FDFBF7] rounded-lg p-5"
            style={{
              boxShadow:
                "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
            }}
          >
            <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
              Table Details
            </h2>
            <p className="text-sm text-[#705C53] mt-1">
              Select a dot to edit the assigned table.
            </p>

            {selectedTable ? (
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                    Table Name
                  </span>
                  <input
                    type="text"
                    value={selectedTable.label}
                    onChange={(event) =>
                      updateSelectedTable("label", event.target.value.toUpperCase())
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
                      onChange={(event) =>
                        updateSelectedTable("seats", Math.max(1, Number(event.target.value)))
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
                      onChange={(event) =>
                        updateSelectedTable("shape", event.target.value as TableShape)
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
                      onChange={(event) =>
                        updateSelectedTable("width", Math.max(1, Number(event.target.value)))
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
                      onChange={(event) =>
                        updateSelectedTable("height", Math.max(1, Number(event.target.value)))
                      }
                      className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                    />
                  </label>
                </div>

                <div className="rounded-lg border border-[#E8E0D8] bg-[#F8F4EE] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">
                        Preview
                      </p>
                      <p className="text-sm text-[#705C53] mt-1">
                        Row {selectedTable.row}, column {selectedTable.col}
                      </p>
                    </div>
                    <div
                      className={`flex items-center justify-center bg-[#C86446] text-white font-bold text-sm ${shapeStyles[selectedTable.shape]}`}
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
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-[#D9CEC3] bg-[#F8F4EE] px-4 py-8 text-center">
                <Maximize2 className="w-5 h-5 text-[#C4B8AC] mx-auto mb-2" />
                <p className="text-sm text-[#705C53]">No table selected</p>
              </div>
            )}
          </section>

          <section
            className="bg-[#FDFBF7] rounded-lg p-5"
            style={{
              boxShadow:
                "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
            }}
          >
            <h2 className={`${fraunces.className} text-base font-bold text-[#000505]`}>
              Assigned Tables
            </h2>

            <div className="mt-4 space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {sortedTables.map((table) => (
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
                        R{table.row} C{table.col} - {shapeLabels[table.shape]}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-[#705C53]">
                    <Users className="w-3.5 h-3.5" />
                    {table.seats}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
