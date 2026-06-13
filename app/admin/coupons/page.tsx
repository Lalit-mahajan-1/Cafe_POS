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
  Zap
} from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

// ── Types ──────────────────────────────────────────────────────────────────────
type DiscountType = "PERCENTAGE" | "FIXED";
type PromotionTarget = "ORDER" | "PRODUCT";

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

type Promotion = {
  id: string;
  name: string;
  appliesTo: PromotionTarget;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number | null;
  productId: string | null;
  product?: { id: string; name: string; price: number } | null;
  minQuantity: number | null;
  validFrom: string;
  validTill: string | null;
  isActive: boolean;
  description: string | null;
  createdAt: string;
};

type DiscountItem = 
  | (Coupon & { itemType: "COUPON" }) 
  | (Promotion & { itemType: "PROMOTION" });

type CouponForm = {
  itemType: "COUPON" | "PROMOTION";
  name: string;
  code: string;
  appliesTo: PromotionTarget;
  productId: string;
  minQuantity: string;
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
  itemType: "COUPON",
  name: "",
  code: "",
  appliesTo: "ORDER",
  productId: "",
  minQuantity: "",
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
  const [items, setItems] = useState<DiscountItem[]>([]);
  const [products, setProducts] = useState<{id: string, name: string}[]>([]);
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

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    setGlobalError("");
    try {
      const [cRes, pRes, prodRes] = await Promise.all([
        fetch("/api/admin/coupons"),
        fetch("/api/admin/promotions"),
        fetch("/api/pos/products")
      ]);
      const cData = await cRes.json();
      const pData = await pRes.json();
      const prodData = await prodRes.json();
      
      setProducts(prodData.products || []);

      const cList: DiscountItem[] = (cData.coupons || []).map((c: any) => ({...c, itemType: "COUPON"}));
      const pList: DiscountItem[] = (pData.promotions || []).map((p: any) => ({...p, itemType: "PROMOTION"}));
      
      const allItems = [...cList, ...pList].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(allItems);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Filter ────────────────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let list = items;

    if (filterStatus === "ACTIVE") list = list.filter((c) => c.isActive);
    if (filterStatus === "INACTIVE") list = list.filter((c) => !c.isActive);

    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((c) => {
        const code = c.itemType === "COUPON" ? c.code : "Auto";
        return [c.name, code, c.description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
    }

    return list;
  }, [items, search, filterStatus]);

  // ── Validation ────────────────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) errs.name = "Name is required";

    if (form.itemType === "COUPON") {
      if (!form.code.trim()) {
        errs.code = "Coupon code is required";
      } else if (!/^[A-Z0-9_-]{2,20}$/.test(form.code.trim().toUpperCase())) {
        errs.code = "Code must be 2-20 chars: letters, numbers, - or _ only";
      } else if (
        modalMode === "create" &&
        items.some((c) => c.itemType === "COUPON" && c.code.toUpperCase() === form.code.trim().toUpperCase())
      ) {
        errs.code = "This coupon code already exists";
      }
    }

    const val = Number(form.discountValue);
    if (!form.discountValue || val <= 0) {
      errs.discountValue = "Discount value must be greater than 0";
    } else if (form.discountType === "PERCENTAGE" && val > 100) {
      errs.discountValue = "Percentage cannot exceed 100%";
    }

    if (form.itemType === "PROMOTION") {
      if (form.appliesTo === "ORDER") {
        if (!form.minOrderAmount || Number(form.minOrderAmount) <= 0) {
          errs.minOrderAmount = "Order amount must be > 0";
        }
      } else if (form.appliesTo === "PRODUCT") {
        if (!form.productId) {
          errs.productId = "Please select a product";
        }
        if (!form.minQuantity || Number(form.minQuantity) < 1) {
          errs.minQuantity = "Quantity must be at least 1";
        }
      }
    } else {
      // COUPON
      if (form.minOrderAmount && Number(form.minOrderAmount) < 0) {
        errs.minOrderAmount = "Must be 0 or more";
      }
      if (form.maxUsage && Number(form.maxUsage) < 1) {
        errs.maxUsage = "Must be at least 1";
      }
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

  const openEdit = (item: DiscountItem) => {
    setForm({
      itemType: item.itemType,
      name: item.name,
      code: item.itemType === "COUPON" ? item.code : "",
      appliesTo: item.itemType === "PROMOTION" ? item.appliesTo : "ORDER",
      productId: item.itemType === "PROMOTION" && item.productId ? item.productId : "",
      minQuantity: item.itemType === "PROMOTION" && item.minQuantity ? String(item.minQuantity) : "",
      discountType: item.discountType,
      discountValue: String(item.discountValue),
      minOrderAmount: item.minOrderAmount != null ? String(item.minOrderAmount) : "",
      validFrom: item.validFrom.split("T")[0],
      validTill: item.validTill ? item.validTill.split("T")[0] : "",
      maxUsage: item.itemType === "COUPON" && item.maxUsage != null ? String(item.maxUsage) : "",
      description: item.description ?? "",
    });
    setFormErrors({});
    setGlobalError("");
    setModalMode("edit");
    setEditingId(item.id);
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

    const isCoupon = form.itemType === "COUPON";
    const endpoint = isCoupon ? "/api/admin/coupons" : "/api/admin/promotions";

    const payload: any = {
      name: form.name.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      validFrom: form.validFrom || today(),
      validTill: form.validTill || null,
      description: form.description.trim() || null,
    };

    if (isCoupon) {
      payload.code = form.code.trim().toUpperCase();
      payload.minOrderAmount = form.minOrderAmount ? Number(form.minOrderAmount) : null;
      payload.maxUsage = form.maxUsage ? Number(form.maxUsage) : null;
    } else {
      payload.appliesTo = form.appliesTo;
      if (form.appliesTo === "ORDER") {
        payload.minOrderAmount = Number(form.minOrderAmount);
      } else {
        payload.productId = form.productId;
        payload.minQuantity = Number(form.minQuantity);
      }
    }

    try {
      if (modalMode === "create") {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create");

        const newItem = { ...(isCoupon ? data.coupon : data.promotion), itemType: form.itemType };
        setItems((prev) => [newItem, ...prev]);
        setSuccessMsg(`${isCoupon ? "Coupon" : "Promotion"} created!`);
      } else {
        const res = await fetch(`${endpoint}/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update");

        const updatedItem = { ...(isCoupon ? data.coupon : data.promotion), itemType: form.itemType };
        setItems((prev) => prev.map((c) => (c.id === editingId ? updatedItem : c)));
        setSuccessMsg(`${isCoupon ? "Coupon" : "Promotion"} updated!`);
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
  const toggleStatus = async (item: DiscountItem) => {
    const next = !item.isActive;
    setItems((prev) => prev.map((c) => (c.id === item.id ? { ...c, isActive: next } : c)));

    try {
      const endpoint = item.itemType === "COUPON" ? `/api/admin/coupons/${item.id}` : `/api/admin/promotions/${item.id}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      const updated = { ...(item.itemType === "COUPON" ? data.coupon : data.promotion), itemType: item.itemType };
      setItems((prev) => prev.map((c) => (c.id === item.id ? updated : c)));
    } catch (err) {
      setItems((prev) => prev.map((c) => (c.id === item.id ? { ...c, isActive: item.isActive } : c)));
      setGlobalError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (item: DiscountItem) => {
    const label = item.itemType === "COUPON" ? item.code : item.name;
    if (!confirm(`Delete ${item.itemType.toLowerCase()} "${label}"? This cannot be undone.`)) return;

    setDeleting(item.id);
    try {
      const endpoint = item.itemType === "COUPON" ? `/api/admin/coupons/${item.id}` : `/api/admin/promotions/${item.id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      setItems((prev) => prev.filter((c) => c.id !== item.id));
      setSuccessMsg(`Deleted "${label}"`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((c) => c.isActive && !isExpired(c.validTill)).length,
    expired: items.filter((c) => isExpired(c.validTill)).length,
    totalUsage: items.reduce((sum, c) => sum + (c.itemType === "COUPON" ? c.currentUsage : 0), 0),
  }), [items]);

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
            Create manual coupon codes or automated promotional discounts
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#C86446] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#B55A3E] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Discount
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
          { label: "Total Discounts", value: stats.total, icon: TicketPercent, color: "text-[#C86446]" },
          { label: "Active", value: stats.active, icon: Sparkles, color: "text-emerald-600" },
          { label: "Expired", value: stats.expired, icon: CalendarDays, color: "text-red-500" },
          { label: "Coupon Uses", value: stats.totalUsage, icon: Hash, color: "text-[#705C53]" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#E8E0D8] bg-[#FDFBF7] p-4 shadow-[0_2px_4px_rgba(112,92,83,0.04)]">
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
                filterStatus === s ? "bg-[#FDFBF7] text-[#000505] shadow-sm" : "text-[#705C53] hover:text-[#000505]"
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
          <h2 className="text-sm font-semibold text-[#000505]">Discounts</h2>
          <span className="ml-auto text-xs text-[#705C53] bg-[#F3EFE8] px-2 py-0.5 rounded-full">
            {filteredItems.length} shown
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E0D8] bg-[#F3EFE8]/50">
                {["Type / Name", "Discount", "Rule", "Usage / Status", "Validity", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!loading && filteredItems.map((item) => {
                const expired = isExpired(item.validTill);
                const effectiveActive = item.isActive && !expired;
                const isCoupon = item.itemType === "COUPON";

                return (
                  <tr key={item.id} className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isCoupon ? "bg-amber-100 text-amber-600" : "bg-purple-100 text-purple-600"}`}>
                          {isCoupon ? <TicketPercent className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#000505]">{item.name}</p>
                          <p className="text-xs font-mono text-[#705C53]">
                            {isCoupon ? `Code: ${item.code}` : "Automated Promotion"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 text-sm font-semibold text-[#000505]">
                        {item.discountType === "PERCENTAGE" ? (
                          <><Percent className="h-3.5 w-3.5 text-[#C86446]" />{item.discountValue}% OFF</>
                        ) : (
                          <><CircleDollarSign className="h-3.5 w-3.5 text-[#C86446]" />₹{item.discountValue} OFF</>
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-sm text-[#705C53]">
                      {isCoupon ? (
                        item.minOrderAmount ? `Min order: ₹${item.minOrderAmount}` : "No min order"
                      ) : (
                        item.appliesTo === "ORDER" 
                          ? `Min order: ₹${item.minOrderAmount}` 
                          : `Min qty: ${item.minQuantity} of ${item.product?.name || 'Product'}`
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5">
                        <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          effectiveActive ? "bg-emerald-50 text-emerald-700" : expired ? "bg-red-50 text-red-600" : "bg-[#F3EFE8] text-[#705C53]"
                        }`}>
                          {effectiveActive ? "Active" : expired ? "Expired" : "Inactive"}
                        </span>
                        {isCoupon && item.maxUsage !== null && (
                          <span className="text-xs text-[#705C53] mt-1">{item.currentUsage} / {item.maxUsage} used</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      <p className="text-xs text-[#705C53]">From: {formatDate(item.validFrom)}</p>
                      <p className={`text-xs mt-0.5 ${expired ? "text-red-500 font-semibold" : "text-[#705C53]"}`}>
                        {item.validTill ? `Till: ${formatDate(item.validTill)}` : "No expiry"}
                      </p>
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleStatus(item)}
                          disabled={expired}
                          className="rounded-md p-1.5 text-[#705C53] hover:bg-[#F3EFE8] hover:text-[#000505] transition cursor-pointer"
                          title={item.isActive ? "Disable" : "Enable"}
                        >
                          {item.isActive ? <X className="h-3.5 w-3.5" /> : <CheckCircleIcon className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => openEdit(item)} className="rounded-md p-1.5 text-[#705C53] hover:bg-[#F3EFE8] hover:text-[#000505] transition cursor-pointer">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item)} disabled={deleting === item.id} className="rounded-md p-1.5 text-[#C86446] hover:bg-[#FFF4F0] transition cursor-pointer">
                          {deleting === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {loading && (
            <div className="flex justify-center py-16 text-sm text-[#705C53]">
              <Loader2 className="h-4 w-4 animate-spin text-[#C86446] mr-2" /> Loading...
            </div>
          )}
          {!loading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-[#705C53]">
              <TicketPercent className="h-6 w-6 text-[#C4B8AC] mb-2" />
              No discounts found.
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="fixed inset-0 bg-[#000505]/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl rounded-xl bg-[#FDFBF7] p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className={`${fraunces.className} text-lg font-bold text-[#000505]`}>
                {modalMode === "create" ? "Create Discount" : "Edit Discount"}
              </h2>
              <button onClick={closeModal} disabled={submitting} className="text-[#C4B8AC] hover:text-[#705C53] transition cursor-pointer disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            {globalError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#F5D6CC] bg-[#FFF4F0] px-4 py-3 text-sm text-[#A84C32]">
                <AlertCircle className="h-4 w-4 shrink-0" />{globalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Type Toggle (Only on Create) */}
              {modalMode === "create" && (
                <div className="flex bg-[#F3EFE8] rounded-lg p-1 mb-4">
                  <button type="button" onClick={() => setForm({...form, itemType: "COUPON"})} className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${form.itemType === "COUPON" ? "bg-white shadow-sm text-[#000505]" : "text-[#705C53]"}`}>
                    Manual Code
                  </button>
                  <button type="button" onClick={() => setForm({...form, itemType: "PROMOTION"})} className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${form.itemType === "PROMOTION" ? "bg-white shadow-sm text-[#000505]" : "text-[#705C53]"}`}>
                    Automated Promotion
                  </button>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm" />
                {formErrors.name && <p className="mt-1 text-xs text-[#A84C32]">{formErrors.name}</p>}
              </div>

              {/* Conditional Fields based on Type */}
              {form.itemType === "COUPON" ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Coupon Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} disabled={modalMode === "edit"} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm font-mono disabled:bg-[#F3EFE8]" />
                  {formErrors.code && <p className="mt-1 text-xs text-[#A84C32]">{formErrors.code}</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Promotion Target *</label>
                    <select value={form.appliesTo} onChange={(e) => setForm({...form, appliesTo: e.target.value as PromotionTarget})} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm">
                      <option value="ORDER">Entire Order (Cart Subtotal)</option>
                      <option value="PRODUCT">Specific Product (Quantity)</option>
                    </select>
                  </div>
                  
                  {form.appliesTo === "ORDER" ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Min Order Amount (₹) *</label>
                      <input type="number" min="1" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm" />
                      {formErrors.minOrderAmount && <p className="mt-1 text-xs text-[#A84C32]">{formErrors.minOrderAmount}</p>}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Product *</label>
                        <select value={form.productId} onChange={(e) => setForm({...form, productId: e.target.value})} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm">
                          <option value="">Select a product...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {formErrors.productId && <p className="mt-1 text-xs text-[#A84C32]">{formErrors.productId}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Min Quantity *</label>
                        <input type="number" min="1" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm" />
                        {formErrors.minQuantity && <p className="mt-1 text-xs text-[#A84C32]">{formErrors.minQuantity}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Discount Type *</label>
                  <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as DiscountType })} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm">
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Value {form.discountType === "PERCENTAGE" ? "(%)" : "(₹)"} *</label>
                  <input type="number" min="0" step="0.01" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm" />
                  {formErrors.discountValue && <p className="mt-1 text-xs text-[#A84C32]">{formErrors.discountValue}</p>}
                </div>
              </div>

              {/* Coupon specific settings */}
              {form.itemType === "COUPON" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Min Order (₹)</label>
                    <input type="number" min="0" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm" placeholder="0 = no minimum" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Max Usage</label>
                    <input type="number" min="1" value={form.maxUsage} onChange={(e) => setForm({ ...form, maxUsage: e.target.value })} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm" placeholder="Blank = unlimited" />
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Valid From *</label>
                  <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Valid Till</label>
                  <input type="date" value={form.validTill} onChange={(e) => setForm({ ...form, validTill: e.target.value })} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm" />
                </div>
              </div>

              {/* Desc */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm" />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-[#E8E0D8] pt-4">
                <button type="button" onClick={closeModal} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#705C53] hover:bg-[#F3EFE8] transition">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-[#C86446] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A84F38] transition disabled:opacity-50 flex items-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple icon for enable/disable
function CheckCircleIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}