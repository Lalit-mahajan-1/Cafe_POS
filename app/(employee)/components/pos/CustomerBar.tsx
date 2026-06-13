"use client";

import type { Customer } from "./pos-types";

type Props = {
  customer: Customer | null;
  onOpenCustomerModal: () => void;
};

export default function CustomerBar({ customer, onOpenCustomerModal }: Props) {
  return (
    <div className="rounded-lg bg-[#FDFBF7] p-5 shadow-sm ring-1 ring-[#E6DDD1]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#C86446]">
            Customer
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {customer
              ? `${customer.name} (${customer.phone || "No phone"})`
              : "No customer assigned"}
          </h2>
          {customer?._count?.orders !== undefined && (
            <p className="text-sm text-[#705C53]">
              {customer._count.orders} previous orders
            </p>
          )}
        </div>
        <button
          onClick={onOpenCustomerModal}
          className="rounded-md bg-[#000505] px-4 py-2 text-sm font-semibold text-[#FDFBF7] hover:bg-[#705C53] transition"
        >
          {customer ? "Change Customer" : "Assign Customer"}
        </button>
      </div>
    </div>
  );
}