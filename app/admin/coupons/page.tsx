"use client";

import { useMemo, useState } from "react";
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
type CouponStatus = "active" | "inactive";

type Coupon = {
  id: number;
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  expiresAt: string;
  status: CouponStatus;
  description: string;
};

type CouponForm = {
  code: string;
  type: CouponType;
  value: string;
  minOrder: string;
  expiresAt: string;
  description: string;
};

const initialCoupons: Coupon[] = [
  {
    id: 1,
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    minOrder: 15,
    expiresAt: "2026-08-31",
    status: "active",
    description: "10% off your first order",
  },
  {
    id: 2,
    code: "COFFEE5",
    type: "fixed",
    value: 5,
    minOrder: 20,
    expiresAt: "2026-07-15",
    status: "active",
    description: "Flat $5 discount on coffee orders",
  },
];

const formatDate = (value: string) => {
  if (!value) return "No expiry";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
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

  const filteredCoupons = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return coupons;

    return coupons.filter((coupon) => {
      return (
        coupon.code.toLowerCase().includes(term) ||
        coupon.description.toLowerCase().includes(term)
      );
    });
  }, [coupons, search]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.code.trim()) {
      nextErrors.code = "Coupon code is required";
    } else if (coupons.some((coupon) => coupon.code.toLowerCase() === form.code.trim().toLowerCase())) {
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

  const handleCreateCoupon = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    const newCoupon: Coupon = {
      id: Date.now(),
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrder: Number(form.minOrder || 0),
      expiresAt: form.expiresAt,
      status: "active",
      description: form.description.trim() || "New coupon",
    };

    setCoupons((current) => [newCoupon, ...current]);
    setShowModal(false);
    resetForm();
    setSubmitting(false);
  };

  const toggleCouponStatus = (id: number) => {
    setCoupons((current) =>
      current.map((coupon) =>
        coupon.id === id
          ? {
              ...coupon,
              status: coupon.status === "active" ? "inactive" : "active",
            }
          : coupon
      )
    );
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
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]">
                    Code
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]">
                    Discount
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]">
                    Min order
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]">
                    Expires
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#C4B8AC]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3EFE8]">
                          <Sparkles className="h-4 w-4 text-[#705C53]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#000505]">{coupon.code}</p>
                          <p className="text-xs text-[#C4B8AC]">{coupon.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#705C53]">
                      {coupon.type === "percentage" ? `${coupon.value}%` : `$${coupon.value}`}
                    </td>
                    <td className="px-5 py-3 text-sm text-[#705C53]">
                      ${coupon.minOrder}
                    </td>
                    <td className="px-5 py-3 text-sm text-[#705C53]">
                      {formatDate(coupon.expiresAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            coupon.status === "active"
                              ? "bg-[#EAF7ED] text-[#2F7A44]"
                              : "bg-[#F3EFE8] text-[#705C53]"
                          }`}
                        >
                          {coupon.status === "active" ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => toggleCouponStatus(coupon.id)}
                          className="text-xs font-medium text-[#C86446] hover:text-[#B55A3E] cursor-pointer"
                        >
                          {coupon.status === "active" ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCoupons.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <AlertCircle className="h-5 w-5 text-[#C4B8AC]" />
                <p className="text-sm text-[#705C53]">No coupons matched your search.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#E8E0D8] bg-[#FDFBF7] p-5 shadow-[0_2px_4px_rgba(112,92,83,0.04),0_6px_20px_rgba(112,92,83,0.06)]">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-[#C86446]" />
            <h2 className="text-sm font-semibold text-[#000505]">Coupon presets</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm text-[#705C53]">
            <div className="rounded-lg border border-[#E8E0D8] bg-[#F3EFE8]/50 p-3">
              <p className="font-semibold text-[#000505]">Seasonal promo</p>
              <p className="mt-1">Use a percentage discount for happy hours or seasonal events.</p>
            </div>
            <div className="rounded-lg border border-[#E8E0D8] bg-[#F3EFE8]/50 p-3">
              <p className="font-semibold text-[#000505]">Flat rebate</p>
              <p className="mt-1">Great for loyalty offers and bundles with a minimum order.</p>
            </div>
            <div className="rounded-lg border border-[#E8E0D8] bg-[#F3EFE8]/50 p-3">
              <p className="font-semibold text-[#000505]">Expiry tracking</p>
              <p className="mt-1">Set an expiry date to make promos automatically expire later.</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => !submitting && setShowModal(false)}>
          <div className="fixed inset-0 bg-[#000505]/40 backdrop-blur-sm" />
          <div
            className="relative mx-4 w-full max-w-lg rounded-xl bg-[#FDFBF7] p-6"
            style={{ boxShadow: "0 4px 8px rgba(112,92,83,0.08), 0 12px 40px rgba(112,92,83,0.12)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className={`${fraunces.className} text-lg font-bold text-[#000505]`}>
                Add Coupon
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={submitting}
                className="text-[#C4B8AC] transition-colors hover:text-[#705C53] disabled:opacity-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              {errors.code && (
                <div className="rounded-lg border border-[#F5D6CC] bg-[#FFF4F0] px-4 py-2.5 text-sm text-[#A84C32]">
                  {errors.code}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  Coupon code
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value })}
                  placeholder="e.g. SUMMER20"
                  className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(event) => setForm({ ...form, type: event.target.value as CouponType })}
                    className="w-full appearance-none rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                    Discount {form.type === "percentage" ? "(%)" : "($)"}
                  </label>
                  <div className="relative">
                    {form.type === "percentage" ? (
                      <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B8AC]" />
                    ) : (
                      <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B8AC]" />
                    )}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.value}
                      onChange={(event) => setForm({ ...form, value: event.target.value })}
                      className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] py-2.5 pl-10 pr-4 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                      placeholder={form.type === "percentage" ? "10" : "5"}
                    />
                  </div>
                  {errors.value && <p className="mt-1 text-xs text-[#A84C32]">{errors.value}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                    Minimum order ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minOrder}
                    onChange={(event) => setForm({ ...form, minOrder: event.target.value })}
                    className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                    placeholder="0"
                  />
                  {errors.minOrder && <p className="mt-1 text-xs text-[#A84C32]">{errors.minOrder}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                    Expiry date
                  </label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B8AC]" />
                    <input
                      type="date"
                      value={form.expiresAt}
                      onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
                      className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] py-2.5 pl-10 pr-4 text-sm text-[#000505] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="w-full resize-none rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3.5 py-2.5 text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                  placeholder="Add a short note for the promotion"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-[#E8E0D8] px-4 py-2.5 text-sm font-medium text-[#705C53] transition-all duration-200 hover:bg-[#F3EFE8] disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#C86446] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#B55A3E] disabled:opacity-50 cursor-pointer"
                >
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
