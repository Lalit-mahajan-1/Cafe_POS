"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Loader2, Search, X } from "lucide-react";
import type { Customer } from "./pos-types";

type Props = {
  open: boolean;
  mode: "lookup" | "new";
  phoneLookup: string;
  newCustomer: { name: string; phone: string; email: string };
  loading: boolean;
  message: string;
  existingCustomers: Customer[];
  onModeChange: (mode: "lookup" | "new") => void;
  onPhoneChange: (phone: string) => void;
  onNewCustomerChange: (data: {
    name: string;
    phone: string;
    email: string;
  }) => void;
  onSelectExistingCustomer: (customer: Customer) => void;
  onCreate: () => void;
  onClose: () => void;
};

const normalizePhone = (value: string) => value.replace(/\D/g, "");

export default function CustomerModal({
  open,
  mode,
  phoneLookup,
  newCustomer,
  loading,
  message,
  existingCustomers,
  onModeChange,
  onPhoneChange,
  onNewCustomerChange,
  onSelectExistingCustomer,
  onCreate,
  onClose,
}: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const lookupRef = useRef<HTMLDivElement>(null);

  const customersWithPhone = useMemo(
    () => existingCustomers.filter((customer) => Boolean(customer.phone)),
    [existingCustomers]
  );

  const filteredCustomers = useMemo(() => {
    const query = normalizePhone(phoneLookup);

    if (!query) return customersWithPhone;

    return customersWithPhone.filter((customer) =>
      normalizePhone(customer.phone ?? "").startsWith(query)
    );
  }, [customersWithPhone, phoneLookup]);

  useEffect(() => {
    setActiveIndex(0);
  }, [phoneLookup, mode]);

  useEffect(() => {
    if (!open) {
      setShowDropdown(false);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (mode !== "lookup") {
      setShowDropdown(false);
    }
  }, [mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        lookupRef.current &&
        !lookupRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleSelectCustomer = (customer: Customer) => {
    onPhoneChange(customer.phone ?? "");
    onSelectExistingCustomer(customer);
    setShowDropdown(false);
    onClose();
  };

  const handleLookupKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setShowDropdown(true);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!filteredCustomers.length) return;
      setActiveIndex((prev) => (prev + 1) % filteredCustomers.length);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!filteredCustomers.length) return;
      setActiveIndex(
        (prev) => (prev - 1 + filteredCustomers.length) % filteredCustomers.length
      );
    }

    if (e.key === "Enter" && filteredCustomers[activeIndex]) {
      e.preventDefault();
      handleSelectCustomer(filteredCustomers[activeIndex]);
    }

    if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
        className="w-full max-w-lg rounded-2xl border border-[#E6DDD1] bg-[#FDFBF7] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id="customer-modal-title"
              className="text-xl font-bold text-[#1F1815]"
            >
              Customer Details
            </h2>
            <p className="mt-1 text-sm text-[#705C53]">
              Search an existing customer or create a new one.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-[#F3EFE8] focus:outline-none focus:ring-4 focus:ring-[#C86446]/10"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-[#F3EFE8] p-1">
          <button
            type="button"
            onClick={() => onModeChange("lookup")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === "lookup"
                ? "bg-[#1F1815] text-[#FDFBF7] shadow-sm"
                : "text-[#1F1815] hover:text-[#705C53]"
            }`}
          >
            Existing
          </button>

          <button
            type="button"
            onClick={() => onModeChange("new")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === "new"
                ? "bg-[#1F1815] text-[#FDFBF7] shadow-sm"
                : "text-[#1F1815] hover:text-[#705C53]"
            }`}
          >
            New
          </button>
        </div>

        {mode === "lookup" ? (
          <div className="space-y-3">
            <div ref={lookupRef} className="relative">
              <label
                htmlFor="customer-phone-lookup"
                className="mb-2 block text-sm font-semibold text-[#1F1815]"
              >
                Customer phone number
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#705C53]" />

                <input
                  id="customer-phone-lookup"
                  type="tel"
                  inputMode="numeric"
                  value={phoneLookup}
                  onChange={(e) => {
                    onPhoneChange(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onClick={() => setShowDropdown(true)}
                  onKeyDown={handleLookupKeyDown}
                  placeholder="Start typing phone number"
                  autoComplete="off"
                  className="w-full rounded-xl border border-[#E6DDD1] bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-[#C86446] focus:ring-4 focus:ring-[#C86446]/10"
                />

                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-[#705C53]" />
                )}
              </div>

              {showDropdown && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[#E6DDD1] bg-white shadow-lg">
                  <div className="max-h-72 overflow-y-auto py-1">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer, index) => {
                        const isActive = index === activeIndex;

                        return (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleSelectCustomer(customer)}
                            className={`w-full px-4 py-3 text-left transition ${
                              isActive ? "bg-[#F8F3EC]" : "hover:bg-[#FAF7F2]"
                            }`}
                          >
                            <p className="text-sm font-semibold text-[#1F1815]">
                              {customer.phone}
                            </p>
                            <p className="mt-0.5 text-xs text-[#705C53]">
                              {customer.name}
                            </p>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm font-medium text-[#1F1815]">
                          No customers found
                        </p>
                        <p className="mt-1 text-xs text-[#705C53]">
                          Try another phone number or switch to New.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-[#705C53]">
              Click a result to assign instantly. You can also use ↑ ↓ and Enter.
            </p>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              onCreate();
            }}
          >
            <div>
              <label
                htmlFor="new-customer-name"
                className="mb-2 block text-sm font-semibold text-[#1F1815]"
              >
                Full name
              </label>
              <input
                id="new-customer-name"
                type="text"
                value={newCustomer.name}
                onChange={(e) =>
                  onNewCustomerChange({
                    ...newCustomer,
                    name: e.target.value,
                  })
                }
                placeholder="Full name"
                className="w-full rounded-xl border border-[#E6DDD1] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#C86446] focus:ring-4 focus:ring-[#C86446]/10"
              />
            </div>

            <div>
              <label
                htmlFor="new-customer-phone"
                className="mb-2 block text-sm font-semibold text-[#1F1815]"
              >
                Phone number
              </label>
              <input
                id="new-customer-phone"
                type="tel"
                value={newCustomer.phone}
                onChange={(e) =>
                  onNewCustomerChange({
                    ...newCustomer,
                    phone: e.target.value,
                  })
                }
                placeholder="Phone number"
                className="w-full rounded-xl border border-[#E6DDD1] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#C86446] focus:ring-4 focus:ring-[#C86446]/10"
              />
            </div>

            <div>
              <label
                htmlFor="new-customer-email"
                className="mb-2 block text-sm font-semibold text-[#1F1815]"
              >
                Email
              </label>
              <input
                id="new-customer-email"
                type="email"
                value={newCustomer.email}
                onChange={(e) =>
                  onNewCustomerChange({
                    ...newCustomer,
                    email: e.target.value,
                  })
                }
                placeholder="Email (optional)"
                className="w-full rounded-xl border border-[#E6DDD1] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#C86446] focus:ring-4 focus:ring-[#C86446]/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C86446] px-4 py-3 font-semibold text-white transition hover:bg-[#b8583d] disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create Customer
            </button>
          </form>
        )}

        {message && <p className="mt-4 text-sm text-[#705C53]">{message}</p>}
      </section>
    </div>
  );
}