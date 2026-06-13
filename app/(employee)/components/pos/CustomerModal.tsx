"use client";

import { Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  mode: "lookup" | "new";
  phoneLookup: string;
  newCustomer: { name: string; phone: string; email: string };
  loading: boolean;
  message: string;
  onModeChange: (mode: "lookup" | "new") => void;
  onPhoneChange: (phone: string) => void;
  onNewCustomerChange: (data: { name: string; phone: string; email: string }) => void;
  onLookup: () => void;
  onCreate: () => void;
  onClose: () => void;
};

export default function CustomerModal({
  open,
  mode,
  phoneLookup,
  newCustomer,
  loading,
  message,
  onModeChange,
  onPhoneChange,
  onNewCustomerChange,
  onLookup,
  onCreate,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <section className="w-full max-w-lg rounded-lg bg-[#FDFBF7] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold">Customer Details</h2>
            <p className="mt-1 text-sm text-[#705C53]">
              Search existing or create new customer.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F3EFE8] rounded-lg"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#F3EFE8] p-1 mb-5">
          <button
            onClick={() => onModeChange("lookup")}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === "lookup" ? "bg-[#FDFBF7] shadow-sm" : "text-[#705C53]"
            }`}
          >
            Existing
          </button>
          <button
            onClick={() => onModeChange("new")}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === "new" ? "bg-[#FDFBF7] shadow-sm" : "text-[#705C53]"
            }`}
          >
            New
          </button>
        </div>

        {mode === "lookup" ? (
          <div className="space-y-3">
            <input
              value={phoneLookup}
              onChange={(e) => onPhoneChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onLookup()}
              placeholder="Customer phone number"
              className="w-full rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
            />
            <button
              onClick={onLookup}
              disabled={loading}
              className="w-full rounded-md bg-[#000505] px-4 py-2.5 font-semibold text-[#FDFBF7] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Find Customer
            </button>
            {message && <p className="text-sm text-[#705C53]">{message}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={newCustomer.name}
              onChange={(e) =>
                onNewCustomerChange({ ...newCustomer, name: e.target.value })
              }
              placeholder="Full name"
              className="w-full rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
            />
            <input
              value={newCustomer.phone}
              onChange={(e) =>
                onNewCustomerChange({ ...newCustomer, phone: e.target.value })
              }
              placeholder="Phone number"
              className="w-full rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
            />
            <input
              value={newCustomer.email}
              onChange={(e) =>
                onNewCustomerChange({ ...newCustomer, email: e.target.value })
              }
              placeholder="Email (optional)"
              className="w-full rounded-md border border-[#E6DDD1] px-3 py-2.5 outline-none focus:border-[#C86446] text-sm"
            />
            <button
              onClick={onCreate}
              disabled={loading}
              className="w-full rounded-md bg-[#C86446] px-4 py-2.5 font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create Customer
            </button>
          </div>
        )}
      </section>
    </div>
  );
}