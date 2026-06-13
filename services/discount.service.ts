import { prisma } from "@/lib/prisma";

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
  appliedLabel: string | null;
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

export type CouponValidationResult =
  | {
      valid: true;
      coupon: {
        id: string;
        code: string;
        discountType: string;
        discountValue: number;
      };
    }
  | { valid: false; error: string };

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!coupon) return { valid: false, error: "Coupon not found" };
  if (!coupon.isActive) return { valid: false, error: "This coupon is no longer active" };

  const now = new Date();

  if (coupon.validFrom > now)
    return { valid: false, error: "This coupon is not yet valid" };

  if (coupon.validTill && coupon.validTill < now)
    return { valid: false, error: "This coupon has expired" };

  if (coupon.maxUsage !== null && coupon.currentUsage >= coupon.maxUsage)
    return { valid: false, error: "This coupon has reached its usage limit" };

  if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount)
    return {
      valid: false,
      error: `Minimum order of ₹${coupon.minOrderAmount.toFixed(2)} required`,
    };

  return { valid: true, coupon };
}

export function calcCouponDiscount(
  coupon: { discountType: string; discountValue: number },
  subtotal: number
): number {
  const discount =
    coupon.discountType === "PERCENTAGE"
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;
  return Math.min(discount, subtotal);
}

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
  // Guard: prisma.promotion may not exist if client wasn't regenerated
  if (!prisma.promotion) {
    return { promotion: null, discount: 0 };
  }

  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validTill: null }, { validTill: { gte: now } }],
      },
    });

    if (!promotions.length) return { promotion: null, discount: 0 };

    let bestPromotion: (typeof promotions)[0] | null = null;
    let bestDiscount = 0;

    for (const promo of promotions) {
      let eligible = false;

      if (promo.appliesTo === "ORDER") {
        if (promo.minOrderAmount === null || subtotal >= promo.minOrderAmount) {
          eligible = true;
        }
      } else if (promo.appliesTo === "PRODUCT") {
        if (promo.productId && promo.minQuantity !== null) {
          const cartItem = cartItems.find((i) => i.productId === promo.productId);
          if (cartItem && cartItem.quantity >= promo.minQuantity) {
            eligible = true;
          }
        }
      }

      if (eligible) {
        const promoDiscount = Math.min(
          promo.discountType === "PERCENTAGE"
            ? (subtotal * promo.discountValue) / 100
            : promo.discountValue,
          subtotal
        );

        if (promoDiscount > bestDiscount) {
          bestDiscount = promoDiscount;
          bestPromotion = promo;
        }
      }
    }

    return { promotion: bestPromotion, discount: bestDiscount };
  } catch {
    // If promotion table doesn't exist yet, skip silently
    return { promotion: null, discount: 0 };
  }
}

export async function recalculateCart(
  cartItems: CartItem[],
  couponCode?: string | null
): Promise<RecalcResult> {
  if (!cartItems.length) {
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
    const foundIds = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !foundIds.has(id));
    throw new Error(`Products not found: ${missing.join(", ")}`);
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // ── Calculate subtotal + tax ─────────────────────────────────────────────
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of cartItems) {
    const product = productMap.get(item.productId)!;
    const lineTotal = product.price * item.quantity;
    subtotal += lineTotal;
    taxAmount += (lineTotal * product.tax) / 100;
  }

  // ── Find best promotion ──────────────────────────────────────────────────
  const { promotion, discount: promoDiscount } = await findBestPromotion(
    cartItems,
    subtotal
  );

  // ── Validate coupon ──────────────────────────────────────────────────────
  let couponDiscount = 0;
  let couponResult: CouponValidationResult | null = null;

  if (couponCode?.trim()) {
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
      finalDiscount = couponDiscount;
      source = "COUPON";
      reason = couponCode!.trim().toUpperCase();
      couponId = couponResult?.valid ? couponResult.coupon.id : null;
      appliedLabel = `Coupon ${reason}: -₹${finalDiscount.toFixed(2)}`;
    } else {
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