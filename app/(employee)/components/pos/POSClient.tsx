"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Coffee,
  Edit3,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  AlertCircle,
  RefreshCw,
  Sparkles,
  TicketPercent,
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────
type UserSummary = { name: string; email: string; role: "ADMIN" | "EMPLOYEE" };
type Category = { id: string; name: string; color: string };
type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  tax: number;
  description: string | null;
  category: Category;
};
type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  _count?: { orders: number };
};
type CartItem = { product: Product; quantity: number };
type ProductForm = {
  id?: string;
  name: string;
  category: string;
  price: string;
  unit: string;
  tax: string;
  description: string;
};
type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";
type ActiveOrder = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null } | null;
  employee: { id: string; name: string } | null;
};
type FloorTable = {
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
type FloorPlan = {
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
type CreatedOrder = {
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

// ── Constants ──────────────────────────────────────────────────────────────────
const emptyProductForm: ProductForm = {
  name: "", category: "", price: "", unit: "piece", tax: "5", description: "",
};

const paymentLabels = { cash: "Cash", card: "Card", upi: "UPI" };

const statusConfig = {
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

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

// ── Main Component ─────────────────────────────────────────────────────────────
export default function POSClient({ user }: { user: UserSummary }) {
  // ── Floor State ────────────────────────────────────────────────────────────
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [selectedTable, setSelectedTable] = useState<FloorTable | null>(null);
  const [showFloorModal, setShowFloorModal] = useState(true);
  const [floorLoading, setFloorLoading] = useState(true);
  const [floorError, setFloorError] = useState<string | null>(null);

  // ── POS State ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [phoneLookup, setPhoneLookup] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });
  const [customerMode, setCustomerMode] = useState<"lookup" | "new">("lookup");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("cash");
  const [discount, setDiscount] = useState("0");
  const [couponCode, setCouponCode] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // ── Load Floor Plan ────────────────────────────────────────────────────────
  const loadFloorPlan = useCallback(async () => {
    setFloorLoading(true);
    setFloorError(null);
    try {
      const res = await fetch("/api/pos/floor");
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load floor");
      setFloorPlan(json.data);
      setSelectedTable((current) => {
        if (!current || !json.data) return current;
        return (
          json.data.tables.find((table: FloorTable) => table.id === current.id) ??
          current
        );
      });
    } catch (err) {
      setFloorError(err instanceof Error ? err.message : "Could not load floor plan");
    } finally {
      setFloorLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadFloorPlan();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadFloorPlan]);

  // ── Load Products ──────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/products");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load products");
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to load products");
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProducts]);

  // ── Filtered Products ──────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = products;

    if (categoryFilter !== "ALL") {
      list = list.filter((p) => p.category.id === categoryFilter);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((p) =>
        [p.name, p.category.name, p.description || ""]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    return list;
  }, [products, search, categoryFilter]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity, 0
    );
    const taxAmount = cart.reduce(
      (sum, item) =>
        sum + (item.product.price * item.quantity * item.product.tax) / 100,
      0
    );
    const discountAmount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal + taxAmount - discountAmount);
    return { subtotal, taxAmount, discountAmount, total };
  }, [cart, discount]);

  // ── Table Selection ────────────────────────────────────────────────────────
  const handleTableSelect = (table: FloorTable) => {
    if (table.status === "OCCUPIED") {
      // Show occupied table info — can view or reassign
      setSelectedTable(table);
      setShowFloorModal(false);
      return;
    }
    setSelectedTable(table);
    setShowFloorModal(false);
  };

  // ── Cart ───────────────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart((items) => {
      const existing = items.find((i) => i.product.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((items) => items.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((items) =>
      items.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  // ── Customer ───────────────────────────────────────────────────────────────
  const lookupCustomer = async () => {
    if (!phoneLookup.trim()) {
      setMessage("Enter customer phone number first.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/pos/customers?phone=${encodeURIComponent(phoneLookup.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to find customer");

      if (data.customer) {
        setCustomer(data.customer);
        setShowCustomerDialog(false);
      } else {
        setCustomerMode("new");
        setNewCustomer((c) => ({ ...c, phone: phoneLookup.trim() }));
        setMessage("No customer found. Fill in details to create one.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Customer lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/pos/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create customer");
      setCustomer(data.customer);
      setShowCustomerDialog(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Customer creation failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Product CRUD ───────────────────────────────────────────────────────────
  const openProductDialog = (product?: Product) => {
    setProductForm(
      product
        ? {
            id: product.id,
            name: product.name,
            category: product.category.name,
            price: String(product.price),
            unit: product.unit,
            tax: String(product.tax),
            description: product.description || "",
          }
        : emptyProductForm
    );
    setProductDialogOpen(true);
  };

  const saveProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const url = productForm.id
        ? `/api/pos/products/${productForm.id}`
        : "/api/pos/products";
      const res = await fetch(url, {
        method: productForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save product");
      await loadProducts();
      setProductDialogOpen(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Product save failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pos/products/${productId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to delete product");
      setCart((items) => items.filter((i) => i.product.id !== productId));
      await loadProducts();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Product delete failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Confirm Order ──────────────────────────────────────────────────────────
  const confirmOrder = async () => {
    if (!selectedTable) {
      setShowFloorModal(true);
      return;
    }
    if (selectedTable.status !== "AVAILABLE") {
      setMessage(`Table ${selectedTable.label} is not available.`);
      return;
    }
    if (!cart.length) {
      setMessage("Add at least one product to the order.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer?.id || null,
          tableId: selectedTable.id,
          paymentMethod,
          discount: totals.discountAmount,
          couponCode: couponCode.trim() || null,
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order creation failed");
      setCreatedOrder(data.order);

      // Refresh floor plan to show table as occupied
      await loadFloorPlan();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Order creation failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Mark Order as Paid ─────────────────────────────────────────────────────
  const markOrderPaid = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pos/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");
      setCreatedOrder(data.order);
      await loadFloorPlan();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to mark as paid");
    } finally {
      setLoading(false);
    }
  };

  // ── New Order (reset) ──────────────────────────────────────────────────────
  const startNewOrder = () => {
    setCart([]);
    setCustomer(null);
    setCreatedOrder(null);
    setDiscount("0");
    setCouponCode("");
    setSelectedTable(null);
    setShowFloorModal(true);
  };

  // ── Floor Grid Cell ────────────────────────────────────────────────────────
  const getGridCellStyle = (table: FloorTable, isSelected: boolean) => {
    const config = statusConfig[table.status];
    if (isSelected) {
      return "border-[#C86446] bg-[#C86446] text-white shadow-lg scale-105";
    }
    return `${config.gridBorder} ${config.gridBg} ${config.gridText} hover:shadow-md hover:scale-105`;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F3EFE8] text-[#000505]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">

        {/* ── Header ── */}
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

          <div className="flex items-center gap-3">
            {/* Table indicator */}
            {selectedTable && (
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
              onClick={() => setShowFloorModal(true)}
              className="flex items-center gap-2 rounded-md border border-[#E6DDD1] px-4 py-2 text-sm font-semibold text-[#705C53] hover:bg-[#F3EFE8] transition"
            >
              <MapPin className="size-4" />
              {selectedTable ? "Change Table" : "Select Table"}
            </button>

            <button
              onClick={startNewOrder}
              className="rounded-md border border-[#C86446] px-4 py-2 text-sm font-semibold text-[#C86446] transition hover:bg-[#C86446] hover:text-white"
            >
              New Order
            </button>
          </div>
        </header>

        {/* ── Message ── */}
        {message && (
          <div className="flex items-center gap-2 rounded-lg border border-[#DFA18F] bg-[#FFF4F0] px-4 py-3 text-sm text-[#705C53]">
            <AlertCircle className="size-4 text-[#C86446] shrink-0" />
            {message}
            <button
              onClick={() => setMessage("")}
              className="ml-auto text-[#705C53] hover:text-[#000505]"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* ── No Table Warning ── */}
        {!selectedTable && !showFloorModal && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            No table selected. Please select a table to start taking orders.
            <button
              onClick={() => setShowFloorModal(true)}
              className="ml-auto font-semibold underline"
            >
              Select Table
            </button>
          </div>
        )}

        {/* ── Main POS Grid ── */}
        <section className="grid gap-6 xl:grid-cols-[1fr_400px]">

          {/* ── Left: Products ── */}
          <div className="space-y-5">
            {/* Customer bar */}
            <div className="rounded-lg bg-[#FDFBF7] p-5 shadow-sm ring-1 ring-[#E6DDD1]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#C86446]">
                    Customer
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {customer
                      ? `${customer.name} (${customer.phone || "No phone"})`
                      : "No customer assigned"}
                  </h2>
                  {customer?._count?.orders !== undefined && (
                    <p className="text-sm text-[#705C53]">
                      {customer._count.orders} previous orders
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowCustomerDialog(true)}
                  className="rounded-md bg-[#000505] px-4 py-2 text-sm font-semibold text-[#FDFBF7] hover:bg-[#705C53] transition"
                >
                  {customer ? "Change Customer" : "Assign Customer"}
                </button>
              </div>
            </div>

            {/* Products */}
            <div className="rounded-lg bg-[#FDFBF7] p-5 shadow-sm ring-1 ring-[#E6DDD1]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#C86446]">
                    Products
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Menu</h2>
                </div>
                <button
                  onClick={() => openProductDialog()}
                  className="inline-flex items-center gap-2 rounded-md bg-[#C86446] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A84F38] transition"
                >
                  <Plus className="size-4" />
                  Add Product
                </button>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 rounded-md border border-[#E6DDD1] bg-[#F3EFE8] px-3 py-2 text-sm mb-4">
                <Search className="size-4 text-[#705C53]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-transparent outline-none"
                />
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                <button
                  onClick={() => setCategoryFilter("ALL")}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    categoryFilter === "ALL"
                      ? "bg-[#C86446] text-white"
                      : "bg-[#F3EFE8] text-[#705C53] hover:bg-[#E6DDD1]"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      categoryFilter === cat.id
                        ? "text-white"
                        : "bg-[#F3EFE8] text-[#705C53] hover:bg-[#E6DDD1]"
                    }`}
                    style={
                      categoryFilter === cat.id
                        ? { backgroundColor: cat.color }
                        : {}
                    }
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Product Grid */}
              <div className="grid gap-3 md:grid-cols-2">
                {filteredProducts.length === 0 && (
                  <p className="col-span-2 text-sm text-[#705C53] text-center py-8">
                    No products found.
                  </p>
                )}
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="rounded-lg border border-[#E6DDD1] bg-[#FDFBF7] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white mb-2"
                          style={{ backgroundColor: product.category.color }}
                        >
                          {product.category.name}
                        </span>
                        <h3 className="font-semibold truncate">{product.name}</h3>
                        <p className="mt-1 text-xs text-[#705C53] line-clamp-2">
                          {product.description || "No description"}
                        </p>
                        <p className="mt-2 text-sm font-bold text-[#C86446]">
                          {formatMoney(product.price)}{" "}
                          <span className="text-xs font-normal text-[#705C53]">
                            / {product.unit} · {product.tax}% tax
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openProductDialog(product)}
                          className="rounded-md p-1.5 text-[#705C53] hover:bg-[#F3EFE8]"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="rounded-md p-1.5 text-[#C86446] hover:bg-[#F3EFE8]"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={!selectedTable || selectedTable.status !== "AVAILABLE"}
                      className="mt-3 w-full rounded-md bg-[#000505] px-3 py-2 text-sm font-semibold text-[#FDFBF7] hover:bg-[#705C53] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {!selectedTable
                        ? "Select table first"
                        : selectedTable.status !== "AVAILABLE"
                        ? "Table unavailable"
                        : "Add to Order"}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Cart / Bill ── */}
          <aside className="h-fit rounded-lg bg-[#000505] p-5 text-[#FDFBF7] shadow-sm sticky top-5">
            {/* Table info */}
            <div className="mb-4 pb-4 border-b border-[#705C53]">
              <h2 className="text-xl font-semibold">Current Order</h2>
              {selectedTable ? (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      statusConfig[selectedTable.status].dot
                    }`}
                  />
                  <span className="text-sm text-[#F3EFE8]/80">
                    {selectedTable.label} · {selectedTable.seats} seats ·{" "}
                    {statusConfig[selectedTable.status].label}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-sm text-[#F3EFE8]/60">
                  No table selected
                </p>
              )}
              {customer && (
                <p className="mt-1 text-sm text-[#F3EFE8]/70">
                  Customer: {customer.name}
                </p>
              )}
            </div>

            {/* Cart Items */}
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {cart.length === 0 && (
                <p className="text-sm text-[#F3EFE8]/60 text-center py-4">
                  No products added yet.
                </p>
              )}
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="rounded-lg bg-white/10 p-3"
                >
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-[#F3EFE8]/65">
                        {formatMoney(item.product.price)} each
                      </p>
                    </div>
                    <p className="font-bold shrink-0">
                      {formatMoney(item.product.price * item.quantity)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="grid size-7 place-items-center rounded-md bg-[#705C53] hover:bg-[#C86446] transition text-sm font-bold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="grid size-7 place-items-center rounded-md bg-[#705C53] hover:bg-[#C86446] transition text-sm font-bold"
                    >
                      +
                    </button>
                    <button
                      onClick={() => updateQuantity(item.product.id, 0)}
                      className="ml-auto text-[#F3EFE8]/50 hover:text-red-400 transition"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Discount */}
            <label className="mt-4 block text-sm font-semibold">
              Discount (₹)
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-[#705C53] bg-[#FDFBF7] px-3 py-2 text-[#000505] outline-none text-sm"
              />
            </label>

            {/* Coupon */}
            <div className="mt-4 rounded-lg border border-[#705C53]/40 bg-[#F3EFE8] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#000505]">
                <TicketPercent className="size-4 text-[#C86446]" />
                Coupon
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="SAVE10"
                  className="w-full rounded-md border border-[#E6DDD1] bg-[#FDFBF7] px-3 py-2 text-sm text-[#000505] outline-none"
                />
                {couponCode.trim() && (
                  <button
                    onClick={() => setCouponCode("")}
                    className="rounded-md bg-[#705C53] px-3 py-2 text-sm font-semibold text-[#FDFBF7] transition hover:bg-[#C86446]"
                  >
                    Clear
                  </button>
                )}
              </div>
              {couponCode.trim() && (
                <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#C86446]">
                  <Sparkles className="size-3" />
                  {couponCode.trim().toUpperCase()} will be applied at checkout
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-[#F3EFE8]/70">
                <span>Subtotal</span>
                <span>{formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#F3EFE8]/70">
                <span>Tax</span>
                <span>{formatMoney(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-[#F3EFE8]/70">
                <span>Discount</span>
                <span>-{formatMoney(totals.discountAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-[#705C53] pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatMoney(totals.total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="mt-4">
              <p className="text-sm font-semibold mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(paymentLabels) as ("cash" | "card" | "upi")[]).map(
                  (method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                        paymentMethod === method
                          ? "bg-[#C86446] text-white"
                          : "bg-[#705C53]/50 text-[#F3EFE8]/70 hover:bg-[#705C53]"
                      }`}
                    >
                      {paymentLabels[method]}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Confirm */}
            <button
              onClick={confirmOrder}
              disabled={
                loading ||
                !selectedTable ||
                selectedTable.status !== "AVAILABLE" ||
                cart.length === 0
              }
              className="mt-5 w-full rounded-md bg-[#C86446] px-4 py-3 font-semibold text-white hover:bg-[#A84F38] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Order"
              )}
            </button>

            {selectedTable?.status === "OCCUPIED" && selectedTable.activeOrder && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-xs text-red-300 font-semibold mb-1">
                  Active Order on this table
                </p>
                <p className="text-xs text-[#F3EFE8]/70">
                  {selectedTable.activeOrder.orderNumber} ·{" "}
                  {formatMoney(selectedTable.activeOrder.total)}
                </p>
                {selectedTable.activeOrder.customer && (
                  <p className="text-xs text-[#F3EFE8]/70">
                    {selectedTable.activeOrder.customer.name}
                  </p>
                )}
              </div>
            )}
          </aside>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FLOOR SELECTION MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showFloorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-[#FDFBF7] rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-[#FDFBF7] border-b border-[#E6DDD1] px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <div>
                <h2 className="text-xl font-bold text-[#000505]">
                  Select a Table
                </h2>
                <p className="text-sm text-[#705C53] mt-0.5">
                  Choose an available table to start taking orders
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadFloorPlan}
                  disabled={floorLoading}
                  className="flex items-center gap-1.5 text-sm text-[#705C53] hover:text-[#000505] transition px-3 py-1.5 rounded-lg hover:bg-[#F3EFE8]"
                >
                  <RefreshCw
                    className={`size-4 ${floorLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
                {selectedTable && (
                  <button
                    onClick={() => setShowFloorModal(false)}
                    className="p-2 hover:bg-[#F3EFE8] rounded-lg transition"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
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
                    Ask admin to set up the floor plan
                  </p>
                </div>
              )}

              {/* Floor Plan */}
              {!floorLoading && floorPlan && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {(
                      [
                        {
                          label: "Total",
                          count: floorPlan.summary.total,
                          color: "bg-[#C86446]",
                        },
                        {
                          label: "Available",
                          count: floorPlan.summary.available,
                          color: "bg-emerald-500",
                        },
                        {
                          label: "Occupied",
                          count: floorPlan.summary.occupied,
                          color: "bg-red-500",
                        },
                        {
                          label: "Reserved",
                          count: floorPlan.summary.reserved,
                          color: "bg-amber-500",
                        },
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
                          const isSelected = selectedTable?.id === table?.id;

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
                              onClick={() => handleTableSelect(table)}
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
                                  {table.status === "OCCUPIED"
                                    ? "Busy"
                                    : "Booked"}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Table Detail on Selection */}
                  {selectedTable && (
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
                            {selectedTable.seats} seats · Row{" "}
                            {selectedTable.row}, Col {selectedTable.col}
                          </p>

                          {/* Occupied: show order info */}
                          {selectedTable.status === "OCCUPIED" &&
                            selectedTable.activeOrder && (
                              <div className="mt-2 text-sm text-red-700">
                                <p className="font-semibold">
                                  Order:{" "}
                                  {selectedTable.activeOrder.orderNumber}
                                </p>
                                <p>
                                  Total:{" "}
                                  {formatMoney(
                                    selectedTable.activeOrder.total
                                  )}
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

                          {/* Reserved: show booking info */}
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
                            onClick={() => setShowFloorModal(false)}
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
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CUSTOMER MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showCustomerDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <section className="w-full max-w-lg rounded-lg bg-[#FDFBF7] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold">Customer Details</h2>
                <p className="mt-1 text-sm text-[#705C53]">
                  Search existing or create new customer.
                </p>
              </div>
              <button
                onClick={() => setShowCustomerDialog(false)}
                className="p-2 hover:bg-[#F3EFE8] rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#F3EFE8] p-1 mb-5">
              <button
                onClick={() => setCustomerMode("lookup")}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  customerMode === "lookup"
                    ? "bg-[#FDFBF7] shadow-sm"
                    : "text-[#705C53]"
                }`}
              >
                Existing
              </button>
              <button
                onClick={() => setCustomerMode("new")}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  customerMode === "new"
                    ? "bg-[#FDFBF7] shadow-sm"
                    : "text-[#705C53]"
                }`}
              >
                New
              </button>
            </div>

            {customerMode === "lookup" ? (
              <div className="space-y-3">
                <input
                  value={phoneLookup}
                  onChange={(e) => setPhoneLookup(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
                  placeholder="Customer phone number"
                  className="w-full rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
                />
                <button
                  onClick={lookupCustomer}
                  disabled={loading}
                  className="w-full rounded-md bg-[#000505] px-4 py-2.5 font-semibold text-[#FDFBF7] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Find Customer
                </button>
                {message && (
                  <p className="text-sm text-[#705C53]">{message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  placeholder="Full name"
                  className="w-full rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
                />
                <input
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  placeholder="Phone number"
                  className="w-full rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
                />
                <input
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  placeholder="Email (optional)"
                  className="w-full rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
                />
                <button
                  onClick={createCustomer}
                  disabled={loading}
                  className="w-full rounded-md bg-[#C86446] px-4 py-2.5 font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Create Customer
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PRODUCT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {productDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <form
            onSubmit={saveProduct}
            className="w-full max-w-2xl rounded-lg bg-[#FDFBF7] p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <h2 className="text-xl font-bold">
                {productForm.id ? "Edit Product" : "Add Product"}
              </h2>
              <button
                type="button"
                onClick={() => setProductDialogOpen(false)}
                className="p-2 hover:bg-[#F3EFE8] rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                required
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
                placeholder="Product name"
                className="rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
              />
              <input
                required
                list="category-options"
                value={productForm.category}
                onChange={(e) =>
                  setProductForm({ ...productForm, category: e.target.value })
                }
                placeholder="Category"
                className="rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: e.target.value })
                }
                placeholder="Price (₹)"
                className="rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
              />
              <input
                required
                value={productForm.unit}
                onChange={(e) =>
                  setProductForm({ ...productForm, unit: e.target.value })
                }
                placeholder="Unit (piece, kg, litre)"
                className="rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
              />
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={productForm.tax}
                onChange={(e) =>
                  setProductForm({ ...productForm, tax: e.target.value })
                }
                placeholder="Tax %"
                className="rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
              />
              <textarea
                value={productForm.description}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    description: e.target.value,
                  })
                }
                placeholder="Description (optional)"
                rows={3}
                className="rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm md:col-span-2 resize-none"
              />
            </div>

            <button
              disabled={loading}
              className="mt-5 w-full rounded-md bg-[#C86446] px-4 py-3 font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Save Product
            </button>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ORDER SUCCESS MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {createdOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <section className="w-full max-w-2xl rounded-lg bg-[#FDFBF7] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#C86446]">
                  <CheckCircle2 className="size-4" />
                  Order Created
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {createdOrder.orderNumber}
                </h2>
                <p className="mt-1 text-sm text-[#705C53]">
                  {createdOrder.table?.label} ·{" "}
                  {createdOrder.paymentMethod?.toUpperCase()} ·{" "}
                  {createdOrder.customer?.name || "Walk-in"}
                </p>
              </div>
              <button
                onClick={startNewOrder}
                className="p-2 hover:bg-[#F3EFE8] rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Items */}
            <div className="rounded-lg border border-[#E6DDD1] divide-y divide-[#E6DDD1]">
              {createdOrder.items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex justify-between px-4 py-3 text-sm"
                >
                  <span>
                    {item.product.name} × {item.quantity}
                  </span>
                  <strong>{formatMoney(item.lineTotal)}</strong>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-[#705C53]">
                <span>Subtotal</span>
                <span>{formatMoney(createdOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#705C53]">
                <span>Tax</span>
                <span>{formatMoney(createdOrder.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-[#705C53]">
                <span>Discount</span>
                <span>-{formatMoney(createdOrder.discount)}</span>
              </div>
              <div className="flex justify-between border-t border-[#E6DDD1] pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatMoney(createdOrder.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 rounded-md border border-[#E6DDD1] px-4 py-2.5 text-sm font-semibold text-[#705C53] hover:bg-[#F3EFE8] transition"
              >
                <FileText className="size-4" />
                Print Receipt
              </button>
              <button
                onClick={() => markOrderPaid(createdOrder.id)}
                disabled={loading || createdOrder.status === "PAID"}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {createdOrder.status === "PAID" ? "Paid ✓" : "Mark as Paid"}
              </button>
            </div>

            {createdOrder.status === "PAID" && (
              <button
                onClick={startNewOrder}
                className="mt-3 w-full rounded-md bg-[#C86446] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#B55A3E] transition"
              >
                Start New Order →
              </button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
