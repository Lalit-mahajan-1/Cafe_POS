"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Edit2,
  Loader2,
  Mail,
  Phone,
  Search,
  ShoppingBag,
  User,
  Users,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

type OrderSummary = {
  orderNumber: string;
  total: number;
  createdAt: string;
  status: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { orders: number };
  orders: OrderSummary[];
};

type EditForm = {
  name: string;
  phone: string;
  email: string;
};

type Props = {
  initialCustomers: Customer[];
};

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_STYLES: Record<string, string> = {
  PAID:      "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  DRAFT:     "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-700",
};

// ── Edit Dialog ───────────────────────────────────────────────────────────

function EditDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer;
  onClose: () => void;
  onSaved: (updated: Customer) => void;
}) {
  const [form, setForm] = useState<EditForm>({
    name:  customer.name,
    phone: customer.phone  ?? "",
    email: customer.email  ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => firstInputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const name  = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!name) {
      setError("Customer name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/pos/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || null, email: email || null }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Update failed. Please try again.");
        return;
      }

      onSaved(data.customer as Customer);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const isDirty =
    form.name.trim()  !== (customer.name        ) ||
    form.phone.trim() !== (customer.phone  ?? "") ||
    form.email.trim() !== (customer.email  ?? "");

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-dialog-title"
        className="w-full max-w-md rounded-2xl border border-[#E6DDD1] bg-[#FDFBF7] p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2
              id="edit-dialog-title"
              className="text-xl font-bold text-[#1F1815]"
            >
              Edit Customer
            </h2>
            <p className="mt-1 text-sm text-[#705C53]">
              ID:{" "}
              <span className="font-mono text-xs text-[#1F1815]">
                {customer.id.slice(0, 16)}…
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-[#F3EFE8] focus:outline-none focus:ring-4 focus:ring-[#C86446]/10"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-name"
              className="mb-2 block text-sm font-semibold text-[#1F1815]"
            >
              Full name <span className="text-[#C86446]">*</span>
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#705C53]" />
              <input
                ref={firstInputRef}
                id="edit-name"
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Full name"
                className="w-full rounded-xl border border-[#E6DDD1] bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#C86446] focus:ring-4 focus:ring-[#C86446]/10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-phone"
              className="mb-2 block text-sm font-semibold text-[#1F1815]"
            >
              Phone number
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#705C53]" />
              <input
                id="edit-phone"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="Phone number"
                className="w-full rounded-xl border border-[#E6DDD1] bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#C86446] focus:ring-4 focus:ring-[#C86446]/10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-email"
              className="mb-2 block text-sm font-semibold text-[#1F1815]"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#705C53]" />
              <input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="Email (optional)"
                className="w-full rounded-xl border border-[#E6DDD1] bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#C86446] focus:ring-4 focus:ring-[#C86446]/10"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#E6DDD1] px-4 py-3 text-sm font-semibold text-[#705C53] transition hover:bg-[#F3EFE8] focus:outline-none focus:ring-4 focus:ring-[#000505]/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isDirty}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#C86446] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#b8583d] disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-[#C86446]/30"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

// ── Customer Row ──────────────────────────────────────────────────────────

function CustomerRow({
  customer,
  onEdit,
}: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
}) {
  const lastOrder = customer.orders?.[0];

  return (
    <tr
      className="group cursor-pointer border-b border-[#F0EAE2] transition hover:bg-[#FAF7F2]"
      onClick={() => onEdit(customer)}
    >
      <td className="py-4 pl-6 pr-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F3EFE8] text-[#C86446]">
            <User className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#1F1815]">
              {customer.name}
            </p>
            <p className="truncate font-mono text-xs text-[#A89080]">
              {customer.id.slice(0, 16)}…
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-[#705C53]">
          <Phone className="size-3.5 shrink-0 text-[#C9B8A5]" />
          {customer.phone || (
            <span className="italic text-[#C9B8A5]">Not set</span>
          )}
        </div>
      </td>

      <td className="hidden px-4 py-4 lg:table-cell">
        <div className="flex items-center gap-2 text-sm text-[#705C53]">
          <Mail className="size-3.5 shrink-0 text-[#C9B8A5]" />
          {customer.email || (
            <span className="italic text-[#C9B8A5]">Not set</span>
          )}
        </div>
      </td>

      <td className="hidden px-4 py-4 sm:table-cell">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-3.5 shrink-0 text-[#C9B8A5]" />
          <span className="text-sm font-medium text-[#1F1815]">
            {customer._count.orders}
          </span>
          <span className="text-xs text-[#A89080]">
            {customer._count.orders === 1 ? "order" : "orders"}
          </span>
        </div>
      </td>

      <td className="hidden px-4 py-4 xl:table-cell">
        {lastOrder ? (
          <div>
            <p className="text-sm font-medium text-[#1F1815]">
              {formatCurrency(lastOrder.total)}
            </p>
            <div className="mt-1">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  STATUS_STYLES[lastOrder.status] ??
                  "bg-[#F3EFE8] text-[#705C53]"
                }`}
              >
                {lastOrder.status}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs italic text-[#C9B8A5]">No orders yet</span>
        )}
      </td>

      <td className="hidden px-4 py-4 md:table-cell">
        <span className="text-sm text-[#705C53]">
          {formatDate(customer.createdAt)}
        </span>
      </td>

      <td className="py-4 pl-4 pr-6">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(customer);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-[#E6DDD1] px-3 py-1.5 text-xs font-semibold text-[#705C53] opacity-0 transition hover:border-[#C86446] hover:text-[#C86446] group-hover:opacity-100 focus:opacity-100 focus:outline-none"
        >
          <Edit2 className="size-3" />
          Edit
        </button>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function CustomersClient({ initialCustomers }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [query,     setQuery]     = useState("");
  const [editing,   setEditing]   = useState<Customer | null>(null);
  const [toast,     setToast]     = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update state if props change (e.g. after revalidation)
  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

  const stats = useMemo(() => {
    const withPhone  = customers.filter((c) => c.phone).length;
    const withOrders = customers.filter((c) => c._count.orders > 0).length;
    return { total: customers.length, withPhone, withOrders };
  }, [customers]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSaved = useCallback(
    (updated: Customer) => {
      setCustomers((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setEditing(null);
      showToast(`${updated.name} updated successfully.`);
    },
    [showToast]
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F3EFE8] text-[#000505]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1F1815]">Customers</h1>
            <p className="mt-1.5 text-sm text-[#705C53]">
              View and manage all customer records.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatBadge label="Total"       value={stats.total}      />
            <StatBadge label="With phone"  value={stats.withPhone}  />
            <StatBadge label="Have orders" value={stats.withOrders} />
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#705C53]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone, or email…"
              className="w-full rounded-xl border border-[#E6DDD1] bg-[#FDFBF7] py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#C86446] focus:ring-4 focus:ring-[#C86446]/10"
            />
          </div>

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-xl border border-[#E6DDD1] bg-[#FDFBF7] p-3 text-[#705C53] transition hover:bg-[#F3EFE8]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-[#E6DDD1] bg-[#FDFBF7] shadow-sm">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E6DDD1] bg-[#F8F4EE]">
                    <th className="py-4 pl-6 pr-4 text-left text-xs font-bold uppercase tracking-widest text-[#705C53]">
                      Customer
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-widest text-[#705C53]">
                      Phone
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-bold uppercase tracking-widest text-[#705C53] lg:table-cell">
                      Email
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-bold uppercase tracking-widest text-[#705C53] sm:table-cell">
                      Orders
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-bold uppercase tracking-widest text-[#705C53] xl:table-cell">
                      Last Order
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-bold uppercase tracking-widest text-[#705C53] md:table-cell">
                      Since
                    </th>
                    <th className="py-4 pl-4 pr-6" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => (
                    <CustomerRow
                      key={customer.id}
                      customer={customer}
                      onEdit={setEditing}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState hasQuery={Boolean(query)} onClear={() => setQuery("")} />
          )}
        </div>

        {filtered.length > 0 && (
          <p className="mt-4 text-xs text-[#A89080]">
            Showing {filtered.length} of {customers.length} customer
            {customers.length !== 1 ? "s" : ""}
            {query ? ` matching "${query}"` : ""}
          </p>
        )}
      </div>

      {editing && (
        <EditDialog
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#1F1815] px-5 py-3 text-sm font-medium text-[#FDFBF7] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#E6DDD1] bg-[#FDFBF7] px-4 py-2.5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-[#C86446]">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold text-[#1F1815]">{value}</p>
    </div>
  );
}

function EmptyState({
  hasQuery,
  onClear,
}: {
  hasQuery: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-[#F3EFE8]">
        <Users className="size-7 text-[#C9B8A5]" />
      </span>
      <div>
        <p className="text-base font-semibold text-[#1F1815]">
          {hasQuery ? "No customers found" : "No customers yet"}
        </p>
        <p className="mt-1 text-sm text-[#705C53]">
          {hasQuery
            ? "Try a different name, phone, or email."
            : "Customers are created when orders are placed via the POS."}
        </p>
      </div>
      {hasQuery && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-[#E6DDD1] px-4 py-2 text-sm font-semibold text-[#705C53] transition hover:bg-[#F3EFE8]"
        >
          Clear search
        </button>
      )}
    </div>
  );
}