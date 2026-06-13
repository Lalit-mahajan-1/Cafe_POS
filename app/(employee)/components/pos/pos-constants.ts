import type { ProductForm, TableStatus } from "./pos-types";

export const emptyProductForm: ProductForm = {
  name: "",
  category: "",
  price: "",
  unit: "piece",
  tax: "5",
  description: "",
};

export const paymentLabels = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
} as const;

export type PaymentMethod = keyof typeof paymentLabels;

export const statusConfig: Record<
  TableStatus,
  {
    bg: string;
    border: string;
    text: string;
    dot: string;
    gridBg: string;
    gridBorder: string;
    gridText: string;
    label: string;
  }
> = {
  AVAILABLE: {
    bg: "bg-emerald-50",
    border: "border-emerald-400",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    gridBg: "bg-emerald-100",
    gridBorder: "border-emerald-400",
    gridText: "text-emerald-800",
    label: "Available",
  },
  OCCUPIED: {
    bg: "bg-red-50",
    border: "border-red-400",
    text: "text-red-700",
    dot: "bg-red-500",
    gridBg: "bg-red-100",
    gridBorder: "border-red-400",
    gridText: "text-red-800",
    label: "Occupied",
  },
  RESERVED: {
    bg: "bg-amber-50",
    border: "border-amber-400",
    text: "text-amber-700",
    dot: "bg-amber-500",
    gridBg: "bg-amber-100",
    gridBorder: "border-amber-400",
    gridText: "text-amber-800",
    label: "Reserved",
  },
};

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);