type AppliedCoupon = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  label: string;
};

const couponPresets: Record<string, AppliedCoupon> = {
  SAVE10: { code: "SAVE10", type: "percent", value: 10, label: "10% off subtotal" },
  FLAT5: { code: "FLAT5", type: "fixed", value: 5, label: "Flat ₹5 off" },
  WELCOME15: { code: "WELCOME15", type: "percent", value: 15, label: "15% off subtotal" },
};

const calculateCouponDiscount = (subtotal: number, coupon: AppliedCoupon | null) => {
  if (!coupon) return 0;
  if (coupon.type === "percent") {
    return subtotal * (coupon.value / 100);
  }
  return coupon.value;
};

// In your POS component state:
// const [couponCode, setCouponCode] = useState("");
// const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

// In the totals memo:
// const couponDiscountAmount = calculateCouponDiscount(subtotal, appliedCoupon);
// const discountAmount = Math.max(0, (Number(discount) || 0) + couponDiscountAmount);
// const total = Math.max(0, subtotal + taxAmount - discountAmount);

// Add this UI block in the bill/sidebar:
<div className="mt-5 rounded-lg border border-[#705C53]/30 bg-[#F3EFE8] p-3">
  <div className="flex items-center gap-2 text-sm font-semibold text-[#000505]">
    <TicketPercent className="size-4 text-[#C86446]" />
    Coupon
  </div>
  <div className="mt-3 flex gap-2">
    <input
      value={couponCode}
      onChange={(event) => setCouponCode(event.target.value)}
      placeholder="SAVE10"
      className="w-full rounded-md border border-[#E6DDD1] bg-[#FDFBF7] px-3 py-2 text-sm text-[#000505] outline-none"
    />
    <button
      onClick={() => {
        const normalizedCode = couponCode.trim().toUpperCase();
        if (!normalizedCode) {
          setAppliedCoupon(null);
          return;
        }

        const coupon = couponPresets[normalizedCode] || null;
        if (!coupon) {
          setAppliedCoupon(null);
          return;
        }

        setAppliedCoupon(coupon);
      }}
      className="rounded-md bg-[#000505] px-3 py-2 text-sm font-semibold text-[#FDFBF7] transition hover:bg-[#705C53]"
    >
      Apply
    </button>
  </div>
  {appliedCoupon ? (
    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#C86446]">
      <Sparkles className="size-3" />
      {appliedCoupon.code} · {appliedCoupon.label}
    </div>
  ) : (
    <p className="mt-2 text-xs text-[#705C53]">Try SAVE10, FLAT5, or WELCOME15.</p>
  )}
</div>
