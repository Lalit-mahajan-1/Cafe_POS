"use client";

import { useEffect, useMemo, useState } from "react";
import { Fraunces } from "next/font/google";
import {
  AlertCircle,
  BadgePercent,
  CalendarDays,
  CircleDollarSign,
  Edit3,
  Hash,
  Loader2,
  Percent,
  Plus,
  Search,
  Sparkles,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

// ── Types ──────────────────────────────────────────────────────────────────────
type DiscountType = "PERCENTAGE" | "FIXED";

type Coupon = {
  id: string;
  name: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number | null;
  validFrom: string;
  validTill: string | null;
  maxUsage: number | null;
  currentUsage: number;
  isActive: boolean;
  description: string | null;
  createdAt: string;
};

type CouponForm = {
  name: string;
  code: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string;
  validFrom: string;
  validTill: string;
  maxUsage: string;
  description: string;
};

type ModalMode = "create" | "edit";

// ── Helpers ────────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = (): CouponForm => ({
  name: "",
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderAmount: "",
  validFrom: today(),
  validTill: "",
  maxUsage: "",
  description: "",
});

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const isExpired = (validTill: string | null) => {
  if (!validTill) return false;
  return new Date(validTill) < new Date();
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Load coupons ─────────────────────────────────────────────────────────────
  const loadCoupons = async () => {
    setLoading(true);
    setGlobalError("");
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load coupons");
      setCoupons(data.coupons || []);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Unable to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  // ── Filter ────────────────────────────────────────────────────────────────────
  const filteredCoupons = useMemo(() => {
    let list = coupons;

    if (filterStatus === "ACTIVE") list = list.filter((c) => c.isActive);
    if (filterStatus === "INACTIVE") list = list.filter((c) => !c.isActive);

    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((c) =>
        [c.name, c.code, c.description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }

    return list;
  }, [coupons, search, filterStatus]);

  // ── Validation ────────────────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) errs.name = "Coupon name is required";

    if (!form.code.trim()) {
      errs.code = "Coupon code is required";
    } else if (!/^[A-Z0-9_-]{2,20}$/.test(form.code.trim().toUpperCase())) {
      errs.code = "Code must be 2-20 chars: letters, numbers, - or _ only";
    } else if (
      modalMode === "create" &&
      coupons.some((c) => c.code.toUpperCase() === form.code.trim().toUpperCase())
    ) {
      errs.code = "This coupon code already exists";
    }

    const val = Number(form.discountValue);
    if (!form.discountValue || val <= 0) {
      errs.discountValue = "Discount value must be greater than 0";
    } else if (form.discountType === "PERCENTAGE" && val > 100) {
      errs.discountValue = "Percentage cannot exceed 100%";
    }

    if (form.minOrderAmount && Number(form.minOrderAmount) < 0) {
      errs.minOrderAmount = "Must be 0 or more";
    }

    if (form.maxUsage && Number(form.maxUsage) < 1) {
      errs.maxUsage = "Must be at least 1";
    }

    if (form.validTill && form.validFrom && form.validTill <= form.validFrom) {
      errs.validTill = "Expiry must be after start date";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Open modal ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm());
    setFormErrors({});
    setGlobalError("");
    setModalMode("create");
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (coupon: Coupon) => {
    setForm({
      name: coupon.name,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderAmount: coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : "",
      validFrom: coupon.validFrom.split("T")[0],
      validTill: coupon.validTill ? coupon.validTill.split("T")[0] : "",
      maxUsage: coupon.maxUsage != null ? String(coupon.maxUsage) : "",
      description: coupon.description ?? "",
    });
    setFormErrors({});
    setGlobalError("");
    setModalMode("edit");
    setEditingId(coupon.id);
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setFormErrors({});
    setGlobalError("");
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setGlobalError("");

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
      validFrom: form.validFrom || today(),
      validTill: form.validTill || null,
      maxUsage: form.maxUsage ? Number(form.maxUsage) : null,
      description: form.description.trim() || null,
    };

    try {
      if (modalMode === "create") {
        const res = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create coupon");

        setCoupons((prev) => [data.coupon, ...prev]);
        setSuccessMsg(`Coupon "${data.coupon.code}" created!`);
      } else {
        const res = await fetch(`/api/admin/coupons/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update coupon");

        setCoupons((prev) =>
          prev.map((c) => (c.id === editingId ? data.coupon : c))
        );
        setSuccessMsg(`Coupon "${data.coupon.code}" updated!`);
      }

      setShowModal(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────────
  const toggleStatus = async (coupon: Coupon) => {
    const next = !coupon.isActive;

    // Optimistic update
    setCoupons((prev) =>
      prev.map((c) => (c.id === coupon.id ? { ...c, isActive: next } : c))
    );

    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? data.coupon : c))
      );
    } catch (err) {
      // Revert
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: coupon.isActive } : c))
      );
      setGlobalError(err instanceof Error ? err.message : "Failed to update coupon");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;

    setDeleting(coupon.id);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      setSuccessMsg(`Coupon "${coupon.code}" deleted`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to delete coupon");
    } finally {
      setDeleting(null);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: coupons.length,
    active: coupons.filter((c) => c.isActive && !isExpired(c.validTill)).length,
    expired: coupons.filter((c) => isExpired(c.validTill)).length,
    totalUsage: coupons.reduce((sum, c) => sum + c.currentUsage, 0),
  }), [coupons]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className={`${fraunces.className} text-xl font-bold text-[#000505]`}>
            Coupons & Promotions
          </h1>
          <p className="mt-0.5 text-sm text-[#705C53]">
            Create and manage coupon codes for your POS checkout
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#C86446] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#B55A3E] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Coupon
        </button>
      </div>

      {/* ── Global messages ── */}
      {globalError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#F5D6CC] bg-[#FFF4F0] px-4 py-3 text-sm text-[#A84C32]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {globalError}
          <button onClick={() => setGlobalError("")} className="ml-auto cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ {successMsg}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total Coupons", value: stats.total, icon: TicketPercent, color: "text-[#C86446]" },
          { label: "Active", value: stats.active, icon: Sparkles, color: "text-emerald-600" },
          { label: "Expired", value: stats.expired, icon: CalendarDays, color: "text-red-500" },
          { label: "Total Used", value: stats.totalUsage, icon: Hash, color: "text-[#705C53]" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#E8E0D8] bg-[#FDFBF7] p-4 shadow-[0_2px_4px_rgba(112,92,83,0.04)]"
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-[#705C53]">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#000505]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search + Filter ── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B8AC]" />
          <input
            type="text"
            placeholder="Search by name, code, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] py-2.5 pl-10 pr-4 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[#E8E0D8] bg-[#F3EFE8] p-1">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                filterStatus === s
                  ? "bg-[#FDFBF7] text-[#000505] shadow-sm"
                  : "text-[#705C53] hover:text-[#000505]"
              }`}
            >
              {s === "ALL" ? "All" : s === "ACTIVE" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-xl border border-[#E8E0D8] bg-[#FDFBF7] shadow-[0_2px_4px_rgba(112,92,83,0.04),0_6px_20px_rgba(112,92,83,0.06)]">
        <div className="border-b border-[#E8E0D8] px-5 py-4 flex items-center gap-2">
          <TicketPercent className="h-4 w-4 text-[#C86446]" />
          <h2 className="text-sm font-semibold text-[#000505]">
            Coupon Codes
          </h2>
          <span className="ml-auto text-xs text-[#705C53] bg-[#F3EFE8] px-2 py-0.5 rounded-full">
            {filteredCoupons.length} shown
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E0D8] bg-[#F3EFE8]/50">
                {["Name / Code", "Discount", "Min Order", "Usage", "Validity", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {!loading && filteredCoupons.map((coupon) => {
                const expired = isExpired(coupon.validTill);
                const effectiveActive = coupon.isActive && !expired;

                return (
                  <tr
                    key={coupon.id}
                    className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/40 transition-colors"
                  >
                    {/* Name / Code */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3EFE8]">
                          <Sparkles className="h-4 w-4 text-[#705C53]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#000505]">
                            {coupon.name}
                          </p>
                          <p className="text-xs font-mono text-[#C86446] font-bold">
                            {coupon.code}
                          </p>
                          {coupon.description && (
                            <p className="text-xs text-[#C4B8AC] mt-0.5 max-w-[160px] truncate">
                              {coupon.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Discount */}
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 text-sm font-semibold text-[#000505]">
                        {coupon.discountType === "PERCENTAGE" ? (
                          <>
                            <Percent className="h-3.5 w-3.5 text-[#C86446]" />
                            {coupon.discountValue}% OFF
                          </>
                        ) : (
                          <>
                            <CircleDollarSign className="h-3.5 w-3.5 text-[#C86446]" />
                            ₹{coupon.discountValue} OFF
                          </>
                        )}
                      </span>
                    </td>

                    {/* Min Order */}
                    <td className="px-5 py-3 text-sm text-[#705C53]">
                      {coupon.minOrderAmount
                        ? `₹${coupon.minOrderAmount}`
                        : <span className="text-[#C4B8AC]">None</span>}
                    </td>

                    {/* Usage */}
                    <td className="px-5 py-3">
                      <span className="text-sm text-[#705C53]">
                        {coupon.currentUsage}
                        {coupon.maxUsage !== null && (
                          <span className="text-[#C4B8AC]"> / {coupon.maxUsage}</span>
                        )}
                      </span>
                      {coupon.maxUsage !== null && (
                        <div className="mt-1 h-1.5 w-16 rounded-full bg-[#E8E0D8]">
                          <div
                            className="h-1.5 rounded-full bg-[#C86446]"
                            style={{
                              width: `${Math.min(100, (coupon.currentUsage / coupon.maxUsage) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </td>

                    {/* Validity */}
                    <td className="px-5 py-3">
                      <p className="text-xs text-[#705C53]">
                        From: {formatDate(coupon.validFrom)}
                      </p>
                      <p className={`text-xs mt-0.5 ${expired ? "text-red-500 font-semibold" : "text-[#705C53]"}`}>
                        {coupon.validTill
                          ? `Till: ${formatDate(coupon.validTill)}`
                          : <span className="text-[#C4B8AC]">No expiry</span>}
                      </p>
                      {expired && (
                        <span className="text-[10px] font-bold text-red-500 uppercase">
                          Expired
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                            effectiveActive
                              ? "bg-emerald-50 text-emerald-700"
                              : expired
                              ? "bg-red-50 text-red-600"
                              : "bg-[#F3EFE8] text-[#705C53]"
                          }`}
                        >
                          {effectiveActive ? "Active" : expired ? "Expired" : "Inactive"}
                        </span>
                        <button
                          onClick={() => toggleStatus(coupon)}
                          disabled={expired}
                          className="text-xs font-medium text-[#C86446] hover:text-[#B55A3E] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-left"
                        >
                          {coupon.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(coupon)}
                          className="rounded-md p-1.5 text-[#705C53] hover:bg-[#F3EFE8] hover:text-[#000505] transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)}
                          disabled={deleting === coupon.id}
                          className="rounded-md p-1.5 text-[#C86446] hover:bg-[#FFF4F0] transition cursor-pointer disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === coupon.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#705C53]">
              <Loader2 className="h-4 w-4 animate-spin text-[#C86446]" />
              Loading coupons...
            </div>
          )}

          {/* Empty */}
          {!loading && filteredCoupons.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3EFE8]">
                <BadgePercent className="h-6 w-6 text-[#C4B8AC]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#705C53]">
                  {search || filterStatus !== "ALL" ? "No coupons match your filters" : "No coupons yet"}
                </p>
                <p className="text-xs text-[#C4B8AC] mt-1">
                  {search || filterStatus !== "ALL"
                    ? "Try adjusting your search or filter"
                    : "Click Add Coupon to create your first one"}
                </p>
              </div>
              {!search && filterStatus === "ALL" && (
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 rounded-lg bg-[#C86446] px-4 py-2 text-sm font-medium text-white hover:bg-[#B55A3E] transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add First Coupon
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="fixed inset-0 bg-[#000505]/40 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-lg rounded-xl bg-[#FDFBF7] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className={`${fraunces.className} text-lg font-bold text-[#000505]`}>
                {modalMode === "create" ? "Create Coupon" : "Edit Coupon"}
              </h2>
              <button
                onClick={closeModal}
                disabled={submitting}
                className="text-[#C4B8AC] hover:text-[#705C53] transition cursor-pointer disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Global form error */}
            {globalError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#F5D6CC] bg-[#FFF4F0] px-4 py-3 text-sm text-[#A84C32]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {globalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  Coupon Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Welcome Discount"
                  className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-[#A84C32]">{formErrors.name}</p>
                )}
              </div>

              {/* Code */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. WELCOME20"
                  disabled={modalMode === "edit"} // code is immutable after creation
                  className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm font-mono text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15 disabled:bg-[#F3EFE8] disabled:text-[#705C53]"
                />
                {formErrors.code && (
                  <p className="mt-1 text-xs text-[#A84C32]">{formErrors.code}</p>
                )}
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                    Discount Type *
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({ ...form, discountType: e.target.value as DiscountType })
                    }
                    className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                    Value {form.discountType === "PERCENTAGE" ? "(%)" : "(₹)"} *
                  </label>
                  <div className="relative">
                    {form.discountType === "PERCENTAGE" ? (
                      <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B8AC]" />
                    ) : (
                      <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B8AC]" />
                    )}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                      placeholder={form.discountType === "PERCENTAGE" ? "20" : "100"}
                      className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] py-2.5 pl-10 pr-4 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                    />
                  </div>
                  {formErrors.discountValue && (
                    <p className="mt-1 text-xs text-[#A84C32]">{formErrors.discountValue}</p>
                  )}
                </div>
              </div>

              {/* Min Order + Max Usage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                    placeholder="0 = no minimum"
                    className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                  />
                  {formErrors.minOrderAmount && (
                    <p className="mt-1 text-xs text-[#A84C32]">{formErrors.minOrderAmount}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                    Max Usage
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.maxUsage}
                    onChange={(e) => setForm({ ...form, maxUsage: e.target.value })}
                    placeholder="Leave blank = unlimited"
                    className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                  />
                  {formErrors.maxUsage && (
                    <p className="mt-1 text-xs text-[#A84C32]">{formErrors.maxUsage}</p>
                  )}
                </div>
              </div>

              {/* Valid From + Till */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                    Valid Till
                  </label>
                  <input
                    type="date"
                    value={form.validTill}
                    onChange={(e) => setForm({ ...form, validTill: e.target.value })}
                    placeholder="No expiry"
                    className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                  />
                  {formErrors.validTill && (
                    <p className="mt-1 text-xs text-[#A84C32]">{formErrors.validTill}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional note for this coupon"
                  className="w-full resize-none rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-[#E8E0D8] px-4 py-2.5 text-sm font-medium text-[#705C53] hover:bg-[#F3EFE8] transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#C86446] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#B55A3E] transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {modalMode === "create" ? "Creating..." : "Saving..."}
                    </>
                  ) : (
                    modalMode === "create" ? "Create Coupon" : "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}