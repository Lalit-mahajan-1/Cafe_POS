import { CheckCircle2, Printer, X } from "lucide-react";
import { formatMoney } from "./pos-constants";

type InvoiceOrder = {
  orderNumber: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  discountReason: string | null;
  total: number;
  paymentMethod: string | null;
  createdAt: string;
  customer: { name: string; phone: string | null; email: string | null } | null;
  table: { label: string } | null;
  items: {
    product: { name: string };
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
};

type Props = {
  order: InvoiceOrder;
  employeeName: string;
  onClose: () => void;
};

const formatTime = (dateStr: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateStr));

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr));

export default function InvoiceReceipt({ order, employeeName, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300 print:bg-white print:relative print:block print:p-0 print:z-0 print:inset-auto">
      <section
        id="print-receipt-modal"
        className="relative w-full max-w-xl rounded-xl bg-[#FDFBF7] border border-[#705C53] p-6 text-[#000505] shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200 print:border-none print:shadow-none print:max-h-none print:p-0 print:m-0 print:w-full print:bg-white print:text-black print:overflow-visible"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-md p-1.5 text-[#705C53] hover:bg-[#F3EFE8] transition cursor-pointer print:hidden"
          aria-label="Close invoice"
        >
          <X className="size-5" />
        </button>

        {/* Receipt Header */}
        <div className="border-b border-dashed border-[#705C53]/40 pb-5 text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 print:hidden">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#000505]">RECEIPT / INVOICE</h2>
          <p className="text-sm text-[#705C53] mt-1">Order Ref: {order.orderNumber}</p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 py-5 text-sm border-b border-dashed border-[#705C53]/40">
          <div>
            <p className="text-[#705C53] text-xs uppercase tracking-wider font-semibold">Date & Time</p>
            <p className="font-semibold text-[#000505] mt-0.5">
              {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-[#705C53] text-xs uppercase tracking-wider font-semibold">Attended By</p>
            <p className="font-semibold text-[#000505] mt-0.5">{employeeName}</p>
          </div>
          <div>
            <p className="text-[#705C53] text-xs uppercase tracking-wider font-semibold">Table / Seating</p>
            <p className="font-semibold text-[#000505] mt-0.5">
              {order.table?.label ? `Table ${order.table.label}` : "Takeout Order"}
            </p>
          </div>
          <div>
            <p className="text-[#705C53] text-xs uppercase tracking-wider font-semibold">Payment Details</p>
            <p className="font-semibold text-[#000505] mt-0.5 uppercase">
              {order.paymentMethod || "N/A"}
            </p>
          </div>
          {order.customer && (
            <div className="col-span-2">
              <p className="text-[#705C53] text-xs uppercase tracking-wider font-semibold">Customer info</p>
              <p className="font-semibold text-[#000505] mt-0.5">
                {order.customer.name} {order.customer.phone ? `(${order.customer.phone})` : ""}
              </p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="py-5">
          <p className="text-xs uppercase tracking-wider font-semibold text-[#705C53] mb-3">Order items</p>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold text-[#000505]">{item.product.name}</p>
                  <p className="text-xs text-[#705C53]">
                    {formatMoney(item.unitPrice)} each × {item.quantity}
                  </p>
                </div>
                <strong className="font-semibold text-[#000505]">
                  {formatMoney(item.lineTotal)}
                </strong>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="border-t border-dashed border-[#705C53]/40 pt-4 space-y-2.5 text-sm">
          <div className="flex justify-between text-[#705C53]">
            <span>Subtotal</span>
            <span className="font-semibold">{formatMoney(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#705C53]">
            <span>Taxes & GST</span>
            <span className="font-semibold">{formatMoney(order.taxAmount)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount {order.discountReason ? `(${order.discountReason})` : ""}</span>
              <span className="font-semibold">-{formatMoney(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#705C53] pt-4 text-lg font-bold text-[#000505]">
            <span>Grand Total</span>
            <span>{formatMoney(order.total)}</span>
          </div>
        </div>

        {/* Invoice QR Code */}
        <div className="mt-4 flex flex-col items-center justify-center p-3 bg-[#F8F4EE] rounded-lg border border-[#E6DDD1]">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
              `Order: ${order.orderNumber}\nTotal: ${formatMoney(order.total)}\nPayment: ${order.paymentMethod || "N/A"}\nTable: ${order.table?.label || "Walk-in"}`
            )}`}
            alt="Invoice QR Code"
            className="w-28 h-28 border border-[#E6DDD1] p-1.5 bg-white"
          />
          <p className="text-[10px] text-[#705C53] mt-1.5 font-bold uppercase tracking-wider">Digital Receipt QR</p>
        </div>

        {/* Dialog Actions */}
        <div className="mt-6 flex gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-[#705C53] hover:bg-[#F3EFE8] px-4 py-3 text-sm font-semibold text-[#000505] transition cursor-pointer"
          >
            <Printer className="size-4" />
            Print Receipt
          </button>
        </div>
      </section>
    </div>
  );
}
