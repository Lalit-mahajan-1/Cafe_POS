"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import type {
  CartItem,
  Category,
  CreatedOrder,
  Customer,
  FloorPlan,
  FloorTable,
  Product,
  ProductForm,
  Promotion,
  UserSummary,
} from "./pos-types";
import { emptyProductForm, type PaymentMethod } from "./pos-constants";

import POSHeader from "./POSHeader";
import POSMessage from "./POSMessage";
import TableSelector from "./TableSelector";
import CustomerBar from "./CustomerBar";
import ProductGrid from "./ProductGrid";
import ProductFormModal from "./ProductFormModal";
import CustomerModal from "./CustomerModal";
import CartSidebar from "./CartSidebar";
import OrderSuccessModal from "./OrderSuccessModal";

export default function POSClient({ user }: { user: UserSummary }) {
  // ── Floor state ──────────────────────────────────────────────────────────
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [selectedTable, setSelectedTable] = useState<FloorTable | null>(null);
  const [isTakeout, setIsTakeout] = useState(false);
  const [showFloorModal, setShowFloorModal] = useState(true);
  const [floorLoading, setFloorLoading] = useState(true);
  const [floorError, setFloorError] = useState<string | null>(null);

  // ── POS state ────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [phoneLookup, setPhoneLookup] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [customerMode, setCustomerMode] = useState<"lookup" | "new">("lookup");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [couponCode, setCouponCode] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ── Debounced customer search ────────────────────────────────────────────
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCustomers = useCallback(async (query: string) => {
    // If empty query, load top 4 recent customers
    const endpoint = query.trim()
      ? `/api/pos/customers?phone=${encodeURIComponent(query.trim())}&limit=4`
      : `/api/pos/customers?limit=4`;

    setCustomerSearchLoading(true);
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setCustomerSearchResults(data.customers || []);
    } catch {
      setCustomerSearchResults([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  }, []);

  // Trigger search whenever phoneLookup changes (debounced 300ms)
  useEffect(() => {
    if (!showCustomerDialog || customerMode !== "lookup") return;

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(() => {
      void searchCustomers(phoneLookup);
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [phoneLookup, showCustomerDialog, customerMode, searchCustomers]);

  // Load initial results when modal opens in lookup mode
  useEffect(() => {
    if (showCustomerDialog && customerMode === "lookup") {
      void searchCustomers(phoneLookup);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCustomerDialog, customerMode]);

  // ── Load floor plan ──────────────────────────────────────────────────────
  const loadFloorPlan = useCallback(async () => {
    setFloorLoading(true);
    setFloorError(null);
    try {
      const res = await fetch("/api/pos/floor");
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load floor");
      setFloorPlan(json.data);
      setSelectedTable((current) => {
        if (!current || !json.data) return current;
        return (
          json.data.tables.find((t: FloorTable) => t.id === current.id) ??
          current
        );
      });
    } catch (err) {
      setFloorError(
        err instanceof Error ? err.message : "Could not load floor plan"
      );
    } finally {
      setFloorLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void loadFloorPlan(), 0);
    const interval = setInterval(() => void loadFloorPlan(), 5000);
    return () => {
      window.clearTimeout(id);
      clearInterval(interval);
    };
  }, [loadFloorPlan]);

  // ── Load products and promotions ─────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/products");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load products");
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to load products"
      );
    }
  }, []);

  const loadPromotions = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/promotions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load promotions");
      setPromotions(data.promotions || []);
    } catch (err) {
      console.error("[loadPromotions]", err);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadProducts();
      void loadPromotions();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadProducts, loadPromotions]);

  // ── Totals ───────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (s, i) => s + i.product.price * i.quantity,
      0
    );
    const taxAmount = cart.reduce(
      (s, i) => s + (i.product.price * i.quantity * i.product.tax) / 100,
      0
    );
    const total = Math.max(0, subtotal + taxAmount);
    return { subtotal, taxAmount, discountAmount: 0, total };
  }, [cart]);

  // ── Table selection ──────────────────────────────────────────────────────
  const handleTableSelect = (table: FloorTable) => {
    setIsTakeout(false);
    setSelectedTable(table);
    if (table.status === "AVAILABLE") setShowFloorModal(false);
  };

  const handleTakeout = () => {
    setSelectedTable(null);
    setIsTakeout(true);
    setShowFloorModal(false);
  };

  // ── Cart ─────────────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart((items) => {
      const existing = items.find((i) => i.product.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...items, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((items) => items.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((items) =>
      items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      )
    );
  };

  // ── Customer ─────────────────────────────────────────────────────────────
  const handleSelectExistingCustomer = (selectedCustomer: Customer) => {
    setCustomer(selectedCustomer);
    setPhoneLookup("");
    setCustomerSearchResults([]);
    setMessage("");
    setShowCustomerDialog(false);
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
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Customer creation failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCustomerModal = () => {
    setPhoneLookup("");
    setCustomerSearchResults([]);
    setMessage("");
    setShowCustomerDialog(true);
  };

  // ── Product CRUD ──────────────────────────────────────────────────────────
  const openProductDialog = (product?: Product) => {
    setProductForm(
      product
        ? {
            id: product.id,
            name: product.name,
            category: product.category.name,
            price: String(product.price),
            unit: product.unit,
            tax: String(product.tax),
            description: product.description || "",
          }
        : emptyProductForm
    );
    setProductDialogOpen(true);
  };

  const saveProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const url = productForm.id
        ? `/api/pos/products/${productForm.id}`
        : "/api/pos/products";
      const res = await fetch(url, {
        method: productForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save product");
      await loadProducts();
      setProductDialogOpen(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Product save failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pos/products/${productId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to delete product");
      setCart((items) => items.filter((i) => i.product.id !== productId));
      await loadProducts();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Product delete failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Confirm order ─────────────────────────────────────────────────────────
  const confirmOrderWithPromotion = async (promotionId?: string) => {
    if (!isTakeout && !selectedTable) {
      setShowFloorModal(true);
      return;
    }
    if (!isTakeout && selectedTable?.status !== "AVAILABLE") {
      setMessage(`Table ${selectedTable?.label} is not available.`);
      return;
    }
    if (!cart.length) {
      setMessage("Add at least one product to the order.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload: any = {
        customerId: customer?.id ?? null,
        tableId: isTakeout ? null : selectedTable!.id,
        paymentMethod,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      if (couponCode.trim()) {
        payload.couponCode = couponCode.trim();
      } else if (promotionId) {
        payload.promotionId = promotionId;
      }

      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}) — invalid response`);
      }

      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Order failed (${res.status})`
        );
      }

      setCreatedOrder(data.order as CreatedOrder);
      await loadFloorPlan();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Order creation failed";
      console.error("[confirmOrder]", err);
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Mark paid ─────────────────────────────────────────────────────────────
  const markOrderPaid = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pos/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");
      setCreatedOrder(data.order as CreatedOrder);
      await loadFloorPlan();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Failed to mark as paid"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── New order reset ───────────────────────────────────────────────────────
  const startNewOrder = () => {
    setCart([]);
    setCustomer(null);
    setCreatedOrder(null);
    setCouponCode("");
    setSelectedTable(null);
    setIsTakeout(false);
    setShowFloorModal(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F3EFE8] text-[#000505]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 print:hidden">
        <POSHeader
          user={user}
          selectedTable={selectedTable}
          isTakeout={isTakeout}
          onOpenFloorModal={() => setShowFloorModal(true)}
          onNewOrder={startNewOrder}
        />

        <POSMessage message={message} onDismiss={() => setMessage("")} />

        {!selectedTable && !isTakeout && !showFloorModal && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            No table selected. Please select a table or choose takeout.
            <button
              onClick={() => setShowFloorModal(true)}
              className="ml-auto font-semibold underline"
            >
              Select Table
            </button>
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div className="space-y-5">
            <CustomerBar
              customer={customer}
              onOpenCustomerModal={handleOpenCustomerModal}
            />
            <ProductGrid
              products={products}
              categories={categories}
              selectedTable={selectedTable}
              isTakeout={isTakeout}
              onAddToCart={addToCart}
              onEditProduct={openProductDialog}
              onDeleteProduct={deleteProduct}
              onAddProduct={() => openProductDialog()}
            />
          </div>

          <CartSidebar
            cart={cart}
            selectedTable={selectedTable}
            isTakeout={isTakeout}
            customer={customer}
            couponCode={couponCode}
            paymentMethod={paymentMethod}
            totals={totals}
            promotions={promotions}
            loading={loading}
            onUpdateQuantity={updateQuantity}
            onCouponChange={setCouponCode}
            onPaymentChange={setPaymentMethod}
            onConfirmOrder={(promotionId?: string) => {
              confirmOrderWithPromotion(promotionId);
            }}
          />
        </section>
      </div>

      <TableSelector
        open={showFloorModal}
        floorPlan={floorPlan}
        floorLoading={floorLoading}
        floorError={floorError}
        selectedTable={selectedTable}
        isTakeout={isTakeout}
        onSelectTable={handleTableSelect}
        onTakeout={handleTakeout}
        onRefresh={loadFloorPlan}
        onClose={() => setShowFloorModal(false)}
      />

      <CustomerModal
        open={showCustomerDialog}
        mode={customerMode}
        phoneLookup={phoneLookup}
        newCustomer={newCustomer}
        loading={customerSearchLoading}
        message={message}
        existingCustomers={customerSearchResults}
        onModeChange={setCustomerMode}
        onPhoneChange={setPhoneLookup}
        onNewCustomerChange={setNewCustomer}
        onSelectExistingCustomer={handleSelectExistingCustomer}
        onCreate={createCustomer}
        onClose={() => setShowCustomerDialog(false)}
      />

      <ProductFormModal
        open={productDialogOpen}
        form={productForm}
        categories={categories}
        loading={loading}
        onChange={setProductForm}
        onSubmit={saveProduct}
        onClose={() => setProductDialogOpen(false)}
      />

      <OrderSuccessModal
        order={createdOrder}
        loading={loading}
        onMarkPaid={markOrderPaid}
        onNewOrder={startNewOrder}
      />
    </main>
  );
}