export type TableShape = "round" | "square" | "booth";
export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";

export type ActiveOrder = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null } | null;
  employee: { id: string; name: string } | null;
};

export type TableBooking = {
  id: string;
  guestName: string | null;
  guestPhone: string | null;
  guestCount: number;
  date: string;
  startTime: string;
  endTime: string | null;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
};

export type FloorTable = {
  id: string;
  label: string;
  row: number;
  col: number;
  seats: number;
  width: number;
  height: number;
  shape: TableShape;
  status?: TableStatus;
  activeOrder?: ActiveOrder | null;
  todayBookings?: TableBooking[];
};

export type FloorSummary = {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
};

export type FloorPlan = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  tables: FloorTable[];
  summary?: FloorSummary;
};

export type BookingPayload = {
  tableId: string;
  customerId?: string;
  guestName?: string;
  guestPhone?: string;
  guestCount: number;
  date: string;
  startTime: string;
  endTime?: string;
  notes?: string;
};

const BASE = "/api/admin/floor-plan";

export const floorPlanService = {
  async get(): Promise<FloorPlan | null> {
    const res = await fetch(BASE, { cache: "no-store" });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
  },

  async save(payload: {
    rows: number;
    cols: number;
    tables: FloorTable[];
  }): Promise<FloorPlan> {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
  },

  async createBooking(payload: BookingPayload) {
    const res = await fetch(`${BASE}/booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
  },

  async getBookings(date?: string) {
    const params = date ? `?date=${date}` : "";
    const res = await fetch(`${BASE}/booking${params}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
  },

  async cancelBooking(id: string) {
    const res = await fetch(`${BASE}/booking?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json;
  },
};
