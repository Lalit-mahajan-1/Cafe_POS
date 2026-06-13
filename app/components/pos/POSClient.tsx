"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type UserSummary = {
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
};

type Category = {
  id: string;
  name: string;
  color: string;
};

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
  orders?: { orderNumber: string; total: number; createdAt: string }[];
};

type CartItem = {
  product: Product;
  quantity: number;
};

type ProductForm = {
  id?: string;
  name: string;
  category: string;
  price: string;
  unit: string;
  tax: string;
  description: string;
};

type CreatedOrder = {
  id: string;
  orderNumber: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  customer: Customer | null;
  employee: { name: string; email: string };
  items: {
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: Product;
  }[];
};

const emptyProductForm: ProductForm = {
  name: "",
  category: "",
  price: "",
  unit: "piece",
  tax: "5",
  description: "",
};

const tableOptions = ["Counter", "T01", "T02", "T03", "T04", "T05", "T06", "Takeaway"];
const paymentLabels = { cash: "Cash", card: "Card", upi: "UPI" };

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

export default function POSClient({ user }: { user: UserSummary }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState("Counter");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [phoneLookup, setPhoneLookup] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });
  const [customerMode, setCustomerMode] = useState<"lookup" | "new">("lookup");
  const [showCustomerDialog, setShowCustomerDialog] = useState(true);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [enabledPayments, setEnabledPayments] = useState({ cash: true, card: true, upi: true });
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("upi");
  const [discount, setDiscount] = useState("0");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const loadProducts = async () => {
    const res = await fetch("/api/pos/products");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to load products");
    setProducts(data.products || []);
    setCategories(data.categories || []);
  };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/pos/products")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load products");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setProducts(data.products || []);
        setCategories(data.categories || []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMessage(err instanceof Error ? err.message : "Unable to load POS data");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      [product.name, product.category.name, product.description || ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [products, search]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const taxAmount = cart.reduce(
      (sum, item) => sum + (item.product.price * item.quantity * item.product.tax) / 100,
      0,
    );
    const discountAmount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal + taxAmount - discountAmount);

    return { subtotal, taxAmount, discountAmount, total };
  }, [cart, discount]);

  const addToCart = (product: Product) => {
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...items, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((items) => items.filter((item) => item.product.id !== productId));
      return;
    }

    setCart((items) =>
      items.map((item) => (item.product.id === productId ? { ...item, quantity } : item)),
    );
  };

  const lookupCustomer = async () => {
    if (!phoneLookup.trim()) {
      setMessage("Enter customer phone number first.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/pos/customers?phone=${encodeURIComponent(phoneLookup.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to find customer");

      if (data.customer) {
        setCustomer(data.customer);
        setShowCustomerDialog(false);
      } else {
        setCustomerMode("new");
        setNewCustomer((current) => ({ ...current, phone: phoneLookup.trim() }));
        setMessage("No existing customer found. Add new customer details.");
      }
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Customer creation failed");
    } finally {
      setLoading(false);
    }
  };

  const openProductDialog = (product?: Product) => {
    if (product) {
      setProductForm({
        id: product.id,
        name: product.name,
        category: product.category.name,
        price: String(product.price),
        unit: product.unit,
        tax: String(product.tax),
        description: product.description || "",
      });
    } else {
      setProductForm(emptyProductForm);
    }
    setProductDialogOpen(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const url = productForm.id ? `/api/pos/products/${productForm.id}` : "/api/pos/products";
      const res = await fetch(url, {
        method: productForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save product");

      await loadProducts();
      setProductDialogOpen(false);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Product save failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/pos/products/${productId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to delete product");

      setCart((items) => items.filter((item) => item.product.id !== productId));
      await loadProducts();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Product delete failed");
    } finally {
      setLoading(false);
    }
  };

  const togglePayment = (method: "cash" | "card" | "upi") => {
    setEnabledPayments((current) => {
      const next = { ...current, [method]: !current[method] };
      if (!next[paymentMethod]) {
        const fallback = (Object.keys(next) as ("cash" | "card" | "upi")[]).find((key) => next[key]);
        if (fallback) setPaymentMethod(fallback);
      }
      return next;
    });
  };

  const confirmOrder = async () => {
    if (!customer) {
      setShowCustomerDialog(true);
      setMessage("Confirm customer details before billing.");
      return;
    }

    if (!cart.length) {
      setMessage("Add at least one product to bill.");
      return;
    }

    if (!enabledPayments[paymentMethod]) {
      setMessage("Choose an enabled payment method.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          table: selectedTable,
          paymentMethod,
          discount: totals.discountAmount,
          items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create order");

      setCreatedOrder(data.order);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Order creation failed");
    } finally {
      setLoading(false);
    }
  };

  const cancelSession = () => {
    setCart([]);
    setCustomer(null);
    setPhoneLookup("");
    setNewCustomer({ name: "", phone: "", email: "" });
    setCreatedOrder(null);
    router.push("/dashboard");
  };

  const getInvoice = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-[#F3EFE8] text-[#000505]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg bg-[#FDFBF7] p-5 shadow-sm ring-1 ring-[#E6DDD1] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#705C53]">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Cafe POS Terminal</h1>
            <p className="mt-2 text-[#705C53]">
              Employee: {user.name} | {user.role} | Customer-first billing workflow
            </p>
          </div>
          <button
            onClick={cancelSession}
            className="rounded-md border border-[#C86446] px-4 py-2 text-sm font-semibold text-[#C86446] transition hover:bg-[#C86446] hover:text-white"
          >
            Cancel POS
          </button>
        </header>

        {message && (
          <div className="rounded-lg border border-[#DFA18F] bg-[#FDFBF7] px-4 py-3 text-sm text-[#705C53]">
            {message}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <div className="rounded-lg bg-[#FDFBF7] p-5 shadow-sm ring-1 ring-[#E6DDD1]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C86446]">
                    Customer and table
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {customer ? `${customer.name} (${customer.phone || "No phone"})` : "Customer not confirmed"}
                  </h2>
                  <p className="mt-1 text-sm text-[#705C53]">
                    {customer?._count?.orders
                      ? `${customer._count.orders} previous orders connected to this phone.`
                      : "Find an existing customer or create a new one before billing."}
                  </p>
                </div>
                <button
                  onClick={() => setShowCustomerDialog(true)}
                  className="rounded-md bg-[#000505] px-4 py-2 text-sm font-semibold text-[#FDFBF7] transition hover:bg-[#705C53]"
                >
                  Change customer
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {tableOptions.map((table) => (
                  <button
                    key={table}
                    onClick={() => setSelectedTable(table)}
                    className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                      selectedTable === table
                        ? "bg-[#C86446] text-white"
                        : "bg-[#F3EFE8] text-[#705C53] hover:bg-[#E6DDD1]"
                    }`}
                  >
                    {table}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-[#FDFBF7] p-5 shadow-sm ring-1 ring-[#E6DDD1]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C86446]">
                    Products
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">Menu and product controls</h2>
                </div>
                <button
                  onClick={() => openProductDialog()}
                  className="inline-flex items-center gap-2 rounded-md bg-[#C86446] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A84F38]"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add product
                </button>
              </div>

              <label className="mt-4 flex items-center gap-2 rounded-md border border-[#E6DDD1] bg-[#F3EFE8] px-3 py-2 text-sm">
                <Search className="size-4 text-[#705C53]" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, category, or description"
                  className="w-full bg-transparent outline-none"
                />
              </label>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {filteredProducts.map((product) => (
                  <article key={product.id} className="rounded-lg border border-[#E6DDD1] bg-[#FDFBF7] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-[#F3EFE8] px-2 py-1 text-xs font-semibold text-[#705C53]">
                          {product.category.name}
                        </span>
                        <h3 className="mt-3 font-semibold">{product.name}</h3>
                        <p className="mt-1 text-sm text-[#705C53]">{product.description || "No description"}</p>
                        <p className="mt-2 text-sm font-semibold">
                          {formatMoney(product.price)} / {product.unit} | Tax {product.tax}%
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openProductDialog(product)}
                          className="rounded-md p-2 text-[#705C53] hover:bg-[#F3EFE8]"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Edit3 className="size-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="rounded-md p-2 text-[#C86446] hover:bg-[#F3EFE8]"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      className="mt-4 w-full rounded-md bg-[#000505] px-3 py-2 text-sm font-semibold text-[#FDFBF7] transition hover:bg-[#705C53]"
                    >
                      Add to order
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-lg bg-[#000505] p-5 text-[#FDFBF7] shadow-sm">
            <h2 className="text-xl font-semibold">Current Bill</h2>
            <p className="mt-1 text-sm text-[#F3EFE8]/70">Table: {selectedTable}</p>

            <div className="mt-5 space-y-3">
              {cart.length === 0 && <p className="text-sm text-[#F3EFE8]/70">No products added yet.</p>}
              {cart.map((item) => (
                <div key={item.product.id} className="rounded-lg bg-white/10 p-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.product.name}</p>
                      <p className="text-xs text-[#F3EFE8]/65">{formatMoney(item.product.price)} each</p>
                    </div>
                    <p className="font-semibold">{formatMoney(item.product.price * item.quantity)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="grid size-8 place-items-center rounded-md bg-[#705C53]"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="grid size-8 place-items-center rounded-md bg-[#705C53]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <label className="mt-5 block text-sm font-semibold">
              Discount
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                className="mt-2 w-full rounded-md border border-[#705C53] bg-[#FDFBF7] px-3 py-2 text-[#000505] outline-none"
              />
            </label>

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(totals.subtotal)}</strong></div>
              <div className="flex justify-between"><span>Tax</span><strong>{formatMoney(totals.taxAmount)}</strong></div>
              <div className="flex justify-between"><span>Discount</span><strong>{formatMoney(totals.discountAmount)}</strong></div>
              <div className="flex justify-between border-t border-[#705C53] pt-3 text-lg">
                <span>Total</span><strong>{formatMoney(totals.total)}</strong>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold">Payment methods</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(Object.keys(paymentLabels) as ("cash" | "card" | "upi")[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => togglePayment(method)}
                    className={`rounded-md px-3 py-2 text-xs font-semibold ${
                      enabledPayments[method] ? "bg-[#C86446] text-white" : "bg-[#705C53] text-[#F3EFE8]/60"
                    }`}
                  >
                    {paymentLabels[method]} {enabledPayments[method] ? "On" : "Off"}
                  </button>
                ))}
              </div>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as "cash" | "card" | "upi")}
                className="mt-3 w-full rounded-md border border-[#705C53] bg-[#FDFBF7] px-3 py-2 text-[#000505]"
              >
                {(Object.keys(paymentLabels) as ("cash" | "card" | "upi")[])
                  .filter((method) => enabledPayments[method])
                  .map((method) => (
                    <option key={method} value={method}>{paymentLabels[method]}</option>
                  ))}
              </select>
            </div>

            <button
              onClick={confirmOrder}
              disabled={loading}
              className="mt-5 w-full rounded-md bg-[#C86446] px-4 py-3 font-semibold text-white transition hover:bg-[#A84F38] disabled:opacity-60"
            >
              Confirm and show summary
            </button>
          </aside>
        </section>
      </div>

      {showCustomerDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <section className="w-full max-w-lg rounded-lg bg-[#FDFBF7] p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Customer details</h2>
                <p className="mt-1 text-sm text-[#705C53]">
                  Enter phone number first. Existing customers connect to their last matching database entry.
                </p>
              </div>
              {customer && (
                <button onClick={() => setShowCustomerDialog(false)} className="rounded-md p-2 hover:bg-[#F3EFE8]">
                  <X className="size-5" />
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-[#F3EFE8] p-1">
              <button
                onClick={() => setCustomerMode("lookup")}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${customerMode === "lookup" ? "bg-[#FDFBF7]" : "text-[#705C53]"}`}
              >
                Existing user
              </button>
              <button
                onClick={() => setCustomerMode("new")}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${customerMode === "new" ? "bg-[#FDFBF7]" : "text-[#705C53]"}`}
              >
                New user
              </button>
            </div>

            {customerMode === "lookup" ? (
              <div className="mt-5 space-y-3">
                <input
                  value={phoneLookup}
                  onChange={(event) => setPhoneLookup(event.target.value)}
                  placeholder="Customer phone number"
                  className="w-full rounded-md border border-[#E6DDD1] px-3 py-2 outline-none focus:border-[#C86446]"
                />
                <button
                  onClick={lookupCustomer}
                  disabled={loading}
                  className="w-full rounded-md bg-[#000505] px-4 py-2 font-semibold text-[#FDFBF7] disabled:opacity-60"
                >
                  Find customer
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <input
                  value={newCustomer.name}
                  onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })}
                  placeholder="Customer name"
                  className="w-full rounded-md border border-[#E6DDD1] px-3 py-2 outline-none focus:border-[#C86446]"
                />
                <input
                  value={newCustomer.phone}
                  onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })}
                  placeholder="Phone number"
                  className="w-full rounded-md border border-[#E6DDD1] px-3 py-2 outline-none focus:border-[#C86446]"
                />
                <input
                  value={newCustomer.email}
                  onChange={(event) => setNewCustomer({ ...newCustomer, email: event.target.value })}
                  placeholder="Email"
                  className="w-full rounded-md border border-[#E6DDD1] px-3 py-2 outline-none focus:border-[#C86446]"
                />
                <button
                  onClick={createCustomer}
                  disabled={loading}
                  className="w-full rounded-md bg-[#C86446] px-4 py-2 font-semibold text-white disabled:opacity-60"
                >
                  Confirm customer
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {productDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <form onSubmit={saveProduct} className="w-full max-w-2xl rounded-lg bg-[#FDFBF7] p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{productForm.id ? "Edit product" : "Add product"}</h2>
                <p className="mt-1 text-sm text-[#705C53]">Name, category, price, unit, tax, and description.</p>
              </div>
              <button type="button" onClick={() => setProductDialogOpen(false)} className="rounded-md p-2 hover:bg-[#F3EFE8]">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Name" className="rounded-md border border-[#E6DDD1] px-3 py-2 outline-none focus:border-[#C86446]" />
              <input required list="category-options" value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} placeholder="Category" className="rounded-md border border-[#E6DDD1] px-3 py-2 outline-none focus:border-[#C86446]" />
              <datalist id="category-options">
                {categories.map((category) => <option key={category.id} value={category.name} />)}
              </datalist>
              <input required type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} placeholder="Price" className="rounded-md border border-[#E6DDD1] px-3 py-2 outline-none focus:border-[#C86446]" />
              <input required value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })} placeholder="Unit of Measure" className="rounded-md border border-[#E6DDD1] px-3 py-2 outline-none focus:border-[#C86446]" />
              <input required type="number" min="0" step="0.01" value={productForm.tax} onChange={(event) => setProductForm({ ...productForm, tax: event.target.value })} placeholder="Tax %" className="rounded-md border border-[#E6DDD1] px-3 py-2 outline-none focus:border-[#C86446]" />
              <textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="Description" rows={3} className="rounded-md border border-[#E6DDD1] px-3 py-2 outline-none focus:border-[#C86446] md:col-span-2" />
            </div>

            <button disabled={loading} className="mt-5 w-full rounded-md bg-[#C86446] px-4 py-3 font-semibold text-white disabled:opacity-60">
              Save product
            </button>
          </form>
        </div>
      )}

      {createdOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <section className="w-full max-w-2xl rounded-lg bg-[#FDFBF7] p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#C86446]">
                  <CheckCircle2 className="size-4" />
                  Order completed
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{createdOrder.orderNumber}</h2>
                <p className="mt-1 text-sm text-[#705C53]">
                  {createdOrder.customer?.name} | {createdOrder.paymentMethod?.toUpperCase()} | Table {selectedTable}
                </p>
              </div>
              <button onClick={() => router.push("/dashboard")} className="rounded-md p-2 hover:bg-[#F3EFE8]">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-[#E6DDD1]">
              {createdOrder.items.map((item) => (
                <div key={item.product.id} className="flex justify-between border-b border-[#E6DDD1] px-4 py-3 text-sm last:border-b-0">
                  <span>{item.product.name} x {item.quantity}</span>
                  <strong>{formatMoney(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(createdOrder.subtotal)}</strong></div>
              <div className="flex justify-between"><span>Tax</span><strong>{formatMoney(createdOrder.taxAmount)}</strong></div>
              <div className="flex justify-between"><span>Discount</span><strong>{formatMoney(createdOrder.discount)}</strong></div>
              <div className="flex justify-between border-t border-[#E6DDD1] pt-3 text-lg"><span>Total</span><strong>{formatMoney(createdOrder.total)}</strong></div>
            </div>

            <button
              onClick={getInvoice}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#000505] px-4 py-3 font-semibold text-[#FDFBF7] transition hover:bg-[#705C53]"
            >
              <FileText className="size-4" />
              Get Invoice
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
