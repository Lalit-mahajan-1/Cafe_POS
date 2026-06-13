"use client";

import { useEffect, useMemo, useState } from "react";
import { Fraunces } from "next/font/google";
import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  Percent,
  Plus,
  Search,
  Sparkles,
  TicketPercent,
  X,
} from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

type CouponType = "percentage" | "fixed";

type Coupon = {
  id: string;
  code: string | null;
  kind: "COUPON" | "PRODUCT" | "ORDER";
  valueType: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderAmount: number | null;
  minQuantity: number | null;
  productId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

type CouponForm = {
  code: string;
  type: CouponType;
  value: string;
  minOrder: string;
  expiresAt: string;
  description: string;
};

const formatDate = (value: string) => {
  if (!value) return "No expiry";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CouponForm>({
    code: "",
    type: "percentage",
    value: "",
    minOrder: "",
    expiresAt: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCoupons = async () => {
      try {
        const res = await fetch("/api/admin/discounts");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load discounts");
        setCoupons(data.discounts || []);
      } catch {
        setCoupons([]);
      }
    };

    loadCoupons();
  }, []);

  const filteredCoupons = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return coupons;

    return coupons.filter((coupon) => {
      const searchText = [coupon.code, coupon.description].filter(Boolean).join(" ").toLowerCase();
      return searchText.includes(term);
    });
  }, [coupons, search]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.code.trim()) {
      nextErrors.code = "Coupon code is required";
    } else if (
      coupons.some(
        (coupon) => (coupon.code || "").toLowerCase() === form.code.trim().toLowerCase()
      )
    ) {
      nextErrors.code = "This coupon code already exists";
    }

    if (!form.value || Number(form.value) <= 0) {
      nextErrors.value = "Discount value must be greater than zero";
    } else if (form.type === "percentage" && Number(form.value) > 100) {
      nextErrors.value = "Percentage discount cannot exceed 100";
    }

    if (!form.minOrder || Number(form.minOrder) < 0) {
      nextErrors.minOrder = "Minimum order must be zero or more";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setForm({
      code: "",
      type: "percentage",
      value: "",
      minOrder: "",
      expiresAt: "",
      description: "",
    });
    setErrors({});
  };

  const handleCreateCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "COUPON",
          code: form.code.trim().toUpperCase(),
          valueType: form.type === "percentage" ? "PERCENTAGE" : "FIXED",
          value: Number(form.value),
          minOrderAmount: Number(form.minOrder || 0),
          description: form.description.trim() || "New coupon",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create coupon");

      setCoupons((current) => [data.discount, ...current]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Unable to create coupon" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className={`${fraunces.className} text-xl font-bold text-[#000505]`}>
            Coupons
          </h1>
          <p className="mt-0.5 text-sm text-[#705C53]">
            Create and manage promotional offers for your cafe
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#C86446] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-[#B55A3E] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Coupon
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-[#E8E0D8] bg-[#FDFBF7] p-4 shadow-[0_2px_4px_rgba(112,92,83,0.04),0_6px_20px_rgba(112,92,83,0.06)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B8AC]" />
          <input
            type="text"
            placeholder="Search coupons..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] py-2.5 pl-10 pr-4 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-xl border border-[#E8E0D8] bg-[#FDFBF7] shadow-[0_2px_4px_rgba(112,92,83,0.04),0_6px_20px_rgba(112,92,83,0.06)]">
          <div className="border-b border-[#E8E0D8] px-5 py-4">
            <div className="flex items-center gap-2">
              <TicketPercent className="h-4 w-4 text-[#C86446]" />
              <h2 className="text-sm font-semibold text-[#000505]">Active offers</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E0D8] bg-[#F3EFE8]/50">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]">Code</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]">Discount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]">Min order</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-[#F3EFE8] p-2 text-[#C86446]">
                          <Percent className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#000505]">{coupon.code}</p>
                          <p className="text-xs text-[#C4B8AC]">{coupon.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#705C53]">
                      {coupon.valueType === "PERCENTAGE" ? `${coupon.value}%` : `₹${coupon.value}`}
                    </td>
                    <td className="px-5 py-3 text-sm text-[#705C53]">₹{coupon.minOrderAmount ?? 0}</td>
                    <td className="px-5 py-3 text-sm text-[#705C53]">{formatDate(coupon.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCoupons.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-[#705C53]">
                No coupons matched your search.
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#FDFBF7] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#000505]">Create coupon</h2>
                <p className="mt-1 text-sm text-[#705C53]">Add a new discount code for your cafe.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-2 hover:bg-[#F3EFE8]">
                <X className="h-5 w-5 text-[#705C53]" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#000505]">Coupon code</label>
                <input
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value })}
                  className="w-full rounded-lg border border-[#E8E0D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C86446]"
                  placeholder="SAVE10"
                />
                {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#000505]">Type</label>
                  <select
                    value={form.type}
                    onChange={(event) => setForm({ ...form, type: event.target.value as CouponType })}
                    className="w-full rounded-lg border border-[#E8E0D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C86446]"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#000505]">Discount {form.type === "percentage" ? "(%)" : "(₹)"}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.value}
                    onChange={(event) => setForm({ ...form, value: event.target.value })}
                    className="w-full rounded-lg border border-[#E8E0D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C86446]"
                  />
                  {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#000505]">Minimum order</label>
                <input
                  type="number"
                  min="0"
                  value={form.minOrder}
                  onChange={(event) => setForm({ ...form, minOrder: event.target.value })}
                  className="w-full rounded-lg border border-[#E8E0D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C86446]"
                />
                {errors.minOrder && <p className="mt-1 text-sm text-red-600">{errors.minOrder}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#000505]">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="w-full rounded-lg border border-[#E8E0D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C86446]"
                  rows={3}
                  placeholder="Weekend special"
                />
              </div>

              {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-[#E8E0D8] px-4 py-2 text-sm font-medium text-[#705C53]">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-[#C86446] px-4 py-2 text-sm font-medium text-white">
                  {submitting ? "Creating..." : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
