"use client";

import { useState, useEffect } from "react";
import { Fraunces } from "next/font/google";
import { Search, Plus, Coffee, X, Loader2 } from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

type Product = {
  name: string;
  category: string;
  price: string;
  tax: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    categoryId: "",
    newCategoryName: "",
    description: "",
    unit: "piece",
    tax: "0",
  });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        const mapped: Product[] = (data.products || []).map(
          (p: { name: string; price: number; tax: number; category: { name: string } }) => ({
            name: p.name,
            category: p.category?.name || "",
            price: `₹${Number(p.price).toFixed(2)}`,
            tax: p.tax || 0,
          })
        );
        setProducts(mapped);
      })
      .catch(() => setProducts([]))
      .finally(() => setPageLoading(false));
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!showModal) return;
    setCategoriesLoading(true);
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, [showModal]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      errs.price = "Price must be a positive number";
    
    if (isNewCategory) {
      if (!form.newCategoryName.trim()) errs.newCategoryName = "Category name is required";
    } else {
      if (!form.categoryId.trim()) errs.categoryId = "Category is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price),
          categoryId: isNewCategory ? undefined : form.categoryId.trim(),
          newCategoryName: isNewCategory ? form.newCategoryName.trim() : undefined,
          description: form.description.trim() || undefined,
          unit: form.unit,
          tax: Number(form.tax),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (typeof data.error === "object") {
          const fieldErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(data.error)) {
            fieldErrors[key] = (msgs as string[])[0];
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ form: data.error || "Failed to create product" });
        }
        return;
      }

      setProducts((prev) => [
        ...prev,
        {
          name: data.product.name,
          category: data.product.category?.name || (isNewCategory ? form.newCategoryName : form.categoryId),
          price: `₹${Number(data.product.price).toFixed(2)}`,
          tax: Number(data.product.tax || 0),
        },
      ]);
      setShowModal(false);
      resetForm();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      categoryId: "",
      newCategoryName: "",
      description: "",
      unit: "piece",
      tax: "0",
    });
    setErrors({});
    setIsNewCategory(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className={`${fraunces.className} text-xl font-bold text-[#000505]`}
          >
            Products
          </h1>
          <p className="text-sm text-[#705C53] mt-0.5">
            Manage your menu items
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-[#C86446] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4B8AC]" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
        />
      </div>

      <div
        className="bg-[#FDFBF7] rounded-xl overflow-hidden"
        style={{
          boxShadow:
            "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
        }}
      >
        {pageLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-[#C4B8AC]" />
          </div>
        ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E0D8]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">
                Product
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">
                Category
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">
                Price
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">
                Tax
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr
                key={product.name + product.category}
                className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/50 transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F3EFE8] flex items-center justify-center">
                      <Coffee className="w-4 h-4 text-[#705C53]" />
                    </div>
                    <span className="text-sm font-medium text-[#000505]">
                      {product.name}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-[#705C53]">
                  {product.category}
                </td>
                <td className="px-5 py-3 text-sm font-medium text-[#000505]">
                  {product.price}
                </td>
                <td className="px-5 py-3">
                  <span className="text-sm text-[#705C53]">
                    {product.tax}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => !submitting && setShowModal(false)}
        >
          <div className="fixed inset-0 bg-[#000505]/40 backdrop-blur-sm" />
          <div
            className="relative bg-[#FDFBF7] rounded-xl w-full max-w-lg mx-4 p-6"
            style={{
              boxShadow:
                "0 4px 8px rgba(112,92,83,0.08), 0 12px 40px rgba(112,92,83,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className={`${fraunces.className} text-lg font-bold text-[#000505]`}
              >
                Add Product
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={submitting}
                className="text-[#C4B8AC] hover:text-[#705C53] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.form && (
                <div className="bg-[#FFF4F0] border border-[#F5D6CC] rounded-lg px-4 py-2.5 text-sm text-[#A84C32]">
                  {errors.form}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                  placeholder="e.g. Cappuccino"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-[#A84C32]">{errors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                    placeholder="4.50"
                  />
                  {errors.price && (
                    <p className="mt-1 text-xs text-[#A84C32]">
                      {errors.price}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                    Tax (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.tax}
                    onChange={(e) =>
                      setForm({ ...form, tax: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                  Category
                </label>
                {isNewCategory ? (
                  <div>
                    <input
                      type="text"
                      value={form.newCategoryName}
                      onChange={(e) => setForm({ ...form, newCategoryName: e.target.value })}
                      placeholder="New category name"
                      className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                    />
                    {errors.newCategoryName && (
                      <p className="mt-1 text-xs text-[#A84C32]">{errors.newCategoryName}</p>
                    )}
                  </div>
                ) : categoriesLoading ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#C4B8AC]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading categories...
                  </div>
                ) : (
                  <div>
                    <select
                      value={form.categoryId}
                      onChange={(e) =>
                        setForm({ ...form, categoryId: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200 appearance-none"
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && (
                      <p className="mt-1 text-xs text-[#A84C32]">
                        {errors.categoryId}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setIsNewCategory(!isNewCategory)}
                    className="text-xs text-[#C86446] hover:underline cursor-pointer"
                  >
                    {isNewCategory ? "Choose existing category" : "Create new category"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                  Unit
                </label>
                <select
                  value={form.unit}
                  onChange={(e) =>
                    setForm({ ...form, unit: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200 appearance-none"
                >
                  <option value="piece">Piece</option>
                  <option value="kg">Kg</option>
                  <option value="litre">Litre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200 resize-none"
                  placeholder="Optional description"
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
                  className="flex-1 px-4 py-2.5 border border-[#E8E0D8] text-[#705C53] rounded-lg text-sm font-medium hover:bg-[#F3EFE8] transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#C86446] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Product"
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
