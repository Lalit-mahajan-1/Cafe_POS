"use client";

import { FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import type { ProductForm, Category } from "./pos-types";

type Props = {
  open: boolean;
  form: ProductForm;
  categories: Category[];
  loading: boolean;
  onChange: (form: ProductForm) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export default function ProductFormModal({
  open,
  form,
  categories,
  loading,
  onChange,
  onSubmit,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl rounded-lg bg-[#FDFBF7] p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 className="text-xl font-bold">
            {form.id ? "Edit Product" : "Add Product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[#F3EFE8] rounded-lg"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            required
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Product name"
            className="rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
          />
          <input
            required
            list="category-options"
            value={form.category}
            onChange={(e) => onChange({ ...form, category: e.target.value })}
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
            value={form.price}
            onChange={(e) => onChange({ ...form, price: e.target.value })}
            placeholder="Price (₹)"
            className="rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
          />
          <input
            required
            value={form.unit}
            onChange={(e) => onChange({ ...form, unit: e.target.value })}
            placeholder="Unit (piece, kg, litre)"
            className="rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.tax}
            onChange={(e) => onChange({ ...form, tax: e.target.value })}
            placeholder="Tax %"
            className="rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
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
  );
}