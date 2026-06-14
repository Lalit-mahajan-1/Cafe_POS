"use client";

import type { Customer } from "./pos-types";

type Props = {
  customer: Customer | null;
  onOpenCustomerModal: () => void;
};

export default function CustomerBar({
  customer,
  onOpenCustomerModal,
}: Props) {
  return (
    <section className="rounded-2xl border border-[#E6DDD1] bg-[#FDFBF7] p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C86446]">
              Customer
            </p>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                customer
                  ? "bg-[#EAF6EF] text-[#2F6B45]"
                  : "bg-[#F3EFE8] text-[#705C53]"
              }`}
            >
              {customer ? "Assigned" : "Not assigned"}
            </span>
          </div>

          <h2 className="mt-2 truncate text-lg font-semibold text-[#1F1815]">
            {customer ? customer.name : "No customer assigned"}
          </h2>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#705C53]">
            <span>{customer?.phone || "No phone number"}</span>

            {customer?._count?.orders !== undefined && (
              <>
                <span className="hidden sm:inline text-[#C9B8A5]">•</span>
                <span>{customer._count.orders} previous orders</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCustomerModal}
          className="inline-flex items-center justify-center rounded-xl bg-[#000505] px-4 py-2.5 text-sm font-semibold text-[#FDFBF7] transition hover:bg-[#705C53] focus:outline-none focus:ring-4 focus:ring-[#000505]/10"
        >
          {customer ? "Change Customer" : "Assign Customer"}
        </button>
      </div>
    </section>
  );
}