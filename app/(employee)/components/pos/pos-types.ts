export type UserSummary = { name: string; email: string; role: "ADMIN" | "EMPLOYEE" };

export type Category = { id: string; name: string; color: string };

export type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  tax: number;
  description: string | null;
  category: Category;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  _count?: { orders: number };
};

export type CartItem = { product: Product; quantity: number };

export type ProductForm = {
  id?: string;
  name: string;
  category: string;
  price: string;
  unit: string;
  tax: string;
  description: string;
};

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

export type FloorTable = {
  id: string;
  label: string;
  row: number;
  col: number;
  seats: number;
  shape: string;
  status: TableStatus;
  activeOrder: ActiveOrder | null;
  todayBookings: {
    id: string;
    guestName: string | null;
    guestCount: number;
    startTime: string;
    endTime: string | null;
    customer: { id: string; name: string } | null;
  }[];
};

export type FloorPlan = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  tables: FloorTable[];
  summary: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
  };
};

export type CreatedOrder = {
  id: string;
  orderNumber: string;
  status: "DRAFT" | "PAID" | "CANCELLED" | "COMPLETED";
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  customer: Customer | null;
  table: { id: string; label: string } | null;
  employee: { name: string; email: string };
  items: {
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: Product;
  }[];
};

export type Totals = {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
};