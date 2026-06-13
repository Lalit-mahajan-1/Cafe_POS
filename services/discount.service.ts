import { prisma } from "@/lib/prisma";

// ── Types ──────────────────────────────────────────────────────────────────────
export type CartItem = {
  productId: string;
  quantity: number;
};

export type DiscountResult = {
  discount: number;
  source: "COUPON" | "PROMOTION" | null;
  reason: string | null;
  couponId: string | null;
  promotionId: string | null;
  appliedLabel: string | null; // human readable for UI
};

export type RecalcResult = {
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  source: "COUPON" | "PROMOTION" | null;
  reason: string | null;
  couponId: string | null;
  promotionId: string | null;
  appliedLabel: string | null;
};

// ── Coupon Validation ──────────────────────────────────────────────────────────
export type CouponValidationResult =
  | { valid: true; coupon: { id: string; code: string; discountType: string; discountValue: number } }
  | { valid: false; error: string };

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!coupon) {
    return { valid: false, error: "Coupon not found" };
  }

  if (!coupon.isActive) {
    return { valid: false, error: "This coupon is no longer active" };
  }

  const now = new Date();

  if (coupon.validFrom > now) {
    return { valid: false, error: "This coupon is not yet valid" };
  }

  if (coupon.validTill && coupon.validTill < now) {
    return { valid: false, error: "This coupon has expired" };
  }

  if (coupon.maxUsage !== null && coupon.currentUsage >= coupon.maxUsage) {
    return { valid: false, error: "This coupon has reached its usage limit" };
  }

  if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      error: `Minimum order amount of ₹${coupon.minOrderAmount.toFixed(2)} required for this coupon`,
    };
  }

  return { valid: true, coupon };
}

// ── Calculate coupon discount amount ──────────────────────────────────────────
export function calcCouponDiscount(
  coupon: { discountType: string; discountValue: number },
  subtotal: number
): number {
  let discount =
    coupon.discountType === "PERCENTAGE"
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;

  // Never allow discount > subtotal
  return Math.min(discount, subtotal);
}

// ── Find best auto promotion ───────────────────────────────────────────────────
export async function findBestPromotion(
  cartItems: CartItem[],
  subtotal: number
): Promise<{
  promotion: {
    id: string;
    name: string;
    appliesTo: string;
    discountType: string;
    discountValue: number;
    minOrderAmount: number | null;
    productId: string | null;
    minQuantity: number | null;
  } | null;
  discount: number;
}> {
  const now = new Date();

  const promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      OR: [{ validTill: null }, { validTill: { gte: now } }],
    },
  });

  if (promotions.length === 0) return { promotion: null, discount: 0 };

  let bestPromotion: (typeof promotions)[0] | null = null;
  let bestDiscount = 0;

  for (const promo of promotions) {
    let eligible = false;
    let promoDiscount = 0;

    if (promo.appliesTo === "ORDER") {
      // Check min order amount
      if (
        promo.minOrderAmount !== null &&
        subtotal >= promo.minOrderAmount
      ) {
        eligible = true;
      }
    } else if (promo.appliesTo === "PRODUCT") {
      // Check product quantity in cart
      if (promo.productId && promo.minQuantity !== null) {
        const cartItem = cartItems.find(
          (i) => i.productId === promo.productId
        );
        if (cartItem && cartItem.quantity >= promo.minQuantity) {
          eligible = true;
        }
      }
    }

    if (eligible) {
      promoDiscount =
        promo.discountType === "PERCENTAGE"
          ? (subtotal * promo.discountValue) / 100
          : promo.discountValue;

      // Cap at subtotal
      promoDiscount = Math.min(promoDiscount, subtotal);

      if (promoDiscount > bestDiscount) {
        bestDiscount = promoDiscount;
        bestPromotion = promo;
      }
    }
  }

  return { promotion: bestPromotion, discount: bestDiscount };
}

// ── Main recalculate function ──────────────────────────────────────────────────
export async function recalculateCart(
  cartItems: CartItem[],
  couponCode?: string | null
): Promise<RecalcResult> {
  if (cartItems.length === 0) {
    return {
      subtotal: 0,
      taxAmount: 0,
      discount: 0,
      total: 0,
      source: null,
      reason: null,
      couponId: null,
      promotionId: null,
      appliedLabel: null,
    };
  }

  // ── Fetch products ───────────────────────────────────────────────────────
  const productIds = cartItems.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  if (products.length !== productIds.length) {
    throw new Error("One or more products not found");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // ── Calculate subtotal + tax ─────────────────────────────────────────────
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of cartItems) {
    const product = productMap.get(item.productId)!;
    const lineTotal = product.price * item.quantity;
    const lineTax = (lineTotal * product.tax) / 100;
    subtotal += lineTotal;
    taxAmount += lineTax;
  }

  // ── Find best promotion ──────────────────────────────────────────────────
  const { promotion, discount: promoDiscount } = await findBestPromotion(
    cartItems,
    subtotal
  );

  // ── Validate coupon ──────────────────────────────────────────────────────
  let couponDiscount = 0;
  let couponResult: CouponValidationResult | null = null;

  if (couponCode) {
    couponResult = await validateCoupon(couponCode, subtotal);
    if (couponResult.valid) {
      couponDiscount = calcCouponDiscount(couponResult.coupon, subtotal);
    }
  }

  // ── Best discount wins ───────────────────────────────────────────────────
  let finalDiscount = 0;
  let source: "COUPON" | "PROMOTION" | null = null;
  let reason: string | null = null;
  let couponId: string | null = null;
  let promotionId: string | null = null;
  let appliedLabel: string | null = null;

  if (couponDiscount > 0 || promoDiscount > 0) {
    if (couponDiscount >= promoDiscount) {
      // Coupon wins
      finalDiscount = couponDiscount;
      source = "COUPON";
      reason = couponCode!.toUpperCase();
      couponId = couponResult!.valid ? couponResult.coupon.id : null;
      appliedLabel = `Coupon ${reason}: -₹${finalDiscount.toFixed(2)}`;
    } else {
      // Promotion wins
      finalDiscount = promoDiscount;
      source = "PROMOTION";
      reason = promotion!.name;
      promotionId = promotion!.id;
      appliedLabel = `${promotion!.name}: -₹${finalDiscount.toFixed(2)}`;
    }
  }

  const total = Math.max(0, subtotal + taxAmount - finalDiscount);

  return {
    subtotal,
    taxAmount,
    discount: finalDiscount,
    total,
    source,
    reason,
    couponId,
    promotionId,
    appliedLabel,
  };
}