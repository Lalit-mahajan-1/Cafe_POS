"use client";

import { useState, useEffect, useRef } from "react";
import { Fraunces } from "next/font/google";
import {
  Search,
  Plus,
  Coffee,
  X,
  Loader2,
  ImagePlus,
  Trash2,
  Pencil,
  AlertTriangle,
} from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

type Product = {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  price: string;
  rawPrice: number;
  tax: number;
  image: string | null;
  description: string;
  unit: string;
};

type Category = { id: string; name: string };

const fieldCls =
  "w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200";

/* ─── Delete Confirm Modal ────────────────────────────────────────────── */
function DeleteConfirmModal({
  product,
  onClose,
  onDeleted,
}: {
  product: Product;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete product.");
        return;
      }
      onDeleted(product.id);
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => !deleting && onClose()}
    >
      <div className="fixed inset-0 bg-[#000505]/40 backdrop-blur-sm" />
      <div
        className="relative bg-[#FDFBF7] rounded-xl w-full max-w-sm mx-4 p-6"
        style={{
          boxShadow:
            "0 4px 8px rgba(112,92,83,0.08), 0 12px 40px rgba(112,92,83,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + heading */}
        <div className="flex flex-col items-center text-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-[#FFF4F0] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#C86446]" />
          </div>
          <div>
            <h2
              className={`${fraunces.className} text-lg font-bold text-[#000505]`}
            >
              Delete product?
            </h2>
            <p className="text-sm text-[#705C53] mt-1">
              <span className="font-medium text-[#000505]">{product.name}</span>{" "}
              will be permanently removed. This cannot be undone.
            </p>
          </div>
        </div>

        {/* Error from service (e.g. used in orders) */}
        {error && (
          <div className="mb-4 bg-[#FFF4F0] border border-[#F5D6CC] rounded-lg px-4 py-2.5 text-sm text-[#A84C32]">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 border border-[#E8E0D8] text-[#705C53] rounded-lg text-sm font-medium hover:bg-[#F3EFE8] transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 bg-[#C86446] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Product Modal (add / edit) ──────────────────────────────────────── */
function ProductModal({
  mode,
  initial,
  categories,
  categoriesLoading,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: Product;
  categories: Category[];
  categoriesLoading: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    price: initial?.rawPrice?.toString() ?? "",
    categoryId: initial?.categoryId ?? "",
    newCategoryName: "",
    description: initial?.description ?? "",
    unit: initial?.unit ?? "piece",
    tax: initial?.tax?.toString() ?? "0",
  });
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initial?.image ?? null
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setErrors((p) => ({ ...p, image: "Only JPG, PNG, or WebP images are allowed." }));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrors((p) => ({ ...p, image: "Image must be smaller than 4 MB." }));
      return;
    }
    setErrors((p) => { const n = { ...p }; delete n.image; return n; });
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
      let uploadedImagePath: string | null | undefined =
        mode === "edit" ? initial?.image ?? null : undefined;

      if (imageFile) {
        setImageUploading(true);
        const fd = new FormData();
        fd.append("file", imageFile);
        fd.append("name", form.name.trim());
        const uploadRes = await fetch("/api/products/upload-image", {
          method: "POST",
          body: fd,
        });
        const uploadData = await uploadRes.json();
        setImageUploading(false);
        if (!uploadRes.ok) {
          setErrors({ form: uploadData.error || "Image upload failed." });
          setSubmitting(false);
          return;
        }
        uploadedImagePath = uploadData.path;
      } else if (mode === "edit" && imagePreview === null) {
        uploadedImagePath = null;
      }

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || undefined,
        unit: form.unit,
        tax: Number(form.tax),
        image: uploadedImagePath,
      };

      if (isNewCategory) {
        payload.newCategoryName = form.newCategoryName.trim();
      } else {
        payload.categoryId = form.categoryId.trim();
      }

      const url =
        mode === "edit" ? `/api/products/${initial!.id}` : "/api/products";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          setErrors({ form: data.error || "Failed to save product" });
        }
        return;
      }

      const p = data.product;
      onSave({
        id: p.id,
        name: p.name,
        category: p.category?.name ?? "",
        categoryId: p.category?.id ?? form.categoryId,
        price: `₹${Number(p.price).toFixed(2)}`,
        rawPrice: Number(p.price),
        tax: Number(p.tax ?? 0),
        image: p.image ?? uploadedImagePath ?? null,
        description: p.description ?? "",
        unit: p.unit ?? "piece",
      });
      onClose();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
      setImageUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => !submitting && onClose()}
    >
      <div className="fixed inset-0 bg-[#000505]/40 backdrop-blur-sm" />
      <div
        className="relative bg-[#FDFBF7] rounded-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
        style={{
          boxShadow:
            "0 4px 8px rgba(112,92,83,0.08), 0 12px 40px rgba(112,92,83,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className={`${fraunces.className} text-lg font-bold text-[#000505]`}>
            {mode === "edit" ? "Edit Product" : "Add Product"}
          </h2>
          <button
            onClick={onClose}
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

          {/* Image */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
              Product Image
            </label>
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-[#E8E0D8] bg-[#F3EFE8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-[#000505]/60 hover:bg-[#000505]/80 text-white rounded-full p-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-lg border-2 border-dashed border-[#E8E0D8] bg-[#FDFBF7] hover:border-[#C86446] hover:bg-[#FFF4F0] transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#F3EFE8] group-hover:bg-[#F5D6CC] flex items-center justify-center transition-colors">
                  <ImagePlus className="w-4 h-4 text-[#705C53] group-hover:text-[#C86446]" />
                </div>
                <span className="text-sm text-[#C4B8AC] group-hover:text-[#705C53] transition-colors">
                  Click to upload image
                </span>
                <span className="text-xs text-[#C4B8AC]">JPG, PNG, WebP · max 4 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
            {errors.image && (
              <p className="mt-1 text-xs text-[#A84C32]">{errors.image}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={fieldCls}
              placeholder="e.g. Cappuccino"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[#A84C32]">{errors.name}</p>
            )}
          </div>

          {/* Price + Tax */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={fieldCls}
                placeholder="80"
              />
              {errors.price && (
                <p className="mt-1 text-xs text-[#A84C32]">{errors.price}</p>
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
                onChange={(e) => setForm({ ...form, tax: e.target.value })}
                className={fieldCls}
                placeholder="5"
              />
            </div>
          </div>

          {/* Category */}
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
                  className={fieldCls}
                />
                {errors.newCategoryName && (
                  <p className="mt-1 text-xs text-[#A84C32]">{errors.newCategoryName}</p>
                )}
              </div>
            ) : categoriesLoading ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#C4B8AC]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading categories…
              </div>
            ) : (
              <div>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className={`${fieldCls} appearance-none`}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-xs text-[#A84C32]">{errors.categoryId}</p>
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

          {/* Unit */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
              Unit
            </label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className={`${fieldCls} appearance-none`}
            >
              <option value="piece">Piece</option>
              <option value="kg">Kg</option>
              <option value="litre">Litre</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className={`${fieldCls} resize-none`}
              placeholder="Optional description"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
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
                  {imageUploading ? "Uploading…" : mode === "edit" ? "Saving…" : "Creating…"}
                </>
              ) : mode === "edit" ? (
                "Save Changes"
              ) : (
                "Create Product"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────── */
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Product | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        const mapped: Product[] = (data.products || []).map(
          (p: {
            id: string;
            name: string;
            price: number;
            tax: number;
            image: string | null;
            description: string | null;
            unit: string;
            category: { id: string; name: string };
          }) => ({
            id: p.id,
            name: p.name,
            category: p.category?.name ?? "",
            categoryId: p.category?.id ?? "",
            price: `₹${Number(p.price).toFixed(2)}`,
            rawPrice: Number(p.price),
            tax: p.tax ?? 0,
            image: p.image ?? null,
            description: p.description ?? "",
            unit: p.unit ?? "piece",
          })
        );
        setProducts(mapped);
      })
      .catch(() => setProducts([]))
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    if (!modalMode) return;
    setCategoriesLoading(true);
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, [modalMode]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditTarget(undefined); setModalMode("add"); };
  const openEdit = (product: Product) => { setEditTarget(product); setModalMode("edit"); };
  const closeModal = () => setModalMode(null);

  const handleSave = (updated: Product) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  };

  const handleDeleted = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`${fraunces.className} text-xl font-bold text-[#000505]`}>
            Products
          </h1>
          <p className="text-sm text-[#705C53] mt-0.5">Manage your menu items</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#C86446] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4B8AC]" />
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
        />
      </div>

      {/* Table */}
      <div
        className="bg-[#FDFBF7] rounded-xl overflow-hidden"
        style={{
          boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
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
                {["Product", "Category", "Price", "Tax", ""].map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#C4B8AC]">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/50 transition-colors group"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-[#F3EFE8] flex items-center justify-center overflow-hidden shrink-0">
                          {product.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Coffee className="w-4 h-4 text-[#705C53]" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-[#000505]">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#705C53]">{product.category}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#000505]">{product.price}</td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-[#705C53]">{product.tax}%</span>
                    </td>
                    {/* Actions — visible on row hover */}
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2  group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => openEdit(product)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E0D8] text-xs font-medium text-[#705C53] hover:border-[#C86446] hover:text-[#C86446] hover:bg-[#FFF4F0] transition-all duration-150 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E0D8] text-xs font-medium text-[#705C53] hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit / Add modal */}
      {modalMode && (
        <ProductModal
          mode={modalMode}
          initial={editTarget}
          categories={categories}
          categoriesLoading={categoriesLoading}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}