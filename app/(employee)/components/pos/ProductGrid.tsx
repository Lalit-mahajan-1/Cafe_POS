"use client";

import { useMemo, useState } from "react";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import type { Product, Category, FloorTable } from "./pos-types";
import { formatMoney } from "./pos-constants";

type Props = {
  products: Product[];
  categories: Category[];
  selectedTable: FloorTable | null;
  isTakeout: boolean;
  onAddToCart: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddProduct: () => void;
};

export default function ProductGrid({
  products,
  categories,
  selectedTable,
  isTakeout,
  onAddToCart,
  onEditProduct,
  onDeleteProduct,
  onAddProduct,
}: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const canAdd =
    isTakeout || (selectedTable && selectedTable.status === "AVAILABLE");

  const buttonLabel = !isTakeout && !selectedTable
    ? "Select table first"
    : !isTakeout && selectedTable?.status !== "AVAILABLE"
    ? "Table unavailable"
    : "Add to Order";

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

  return (
    <div className="rounded-lg bg-[#FDFBF7] p-5 shadow-sm ring-1 ring-[#E6DDD1]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#C86446]">
            Products
          </p>
          <h2 className="mt-1 text-lg font-semibold">Menu</h2>
        </div>
        <button
          onClick={onAddProduct}
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
              categoryFilter === cat.id ? { backgroundColor: cat.color } : {}
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
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
                  onClick={() => onEditProduct(product)}
                  className="rounded-md p-1.5 text-[#705C53] hover:bg-[#F3EFE8]"
                >
                  <Edit3 className="size-3.5" />
                </button>
                <button
                  onClick={() => onDeleteProduct(product.id)}
                  className="rounded-md p-1.5 text-[#C86446] hover:bg-[#F3EFE8]"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            <button
              onClick={() => onAddToCart(product)}
              disabled={!canAdd}
              className="mt-3 w-full rounded-md bg-[#000505] px-3 py-2 text-sm font-semibold text-[#FDFBF7] hover:bg-[#705C53] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {buttonLabel}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}