import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/sessions";
import { validateCoupon, calcCouponDiscount } from "@/services/discount.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { couponCode, subtotal } = body as {
      couponCode: string;
      subtotal: number;
    };

    if (!couponCode?.trim()) {
      return NextResponse.json(
        { error: "Coupon code is required" },
        { status: 400 }
      );
    }

    if (!subtotal || subtotal <= 0) {
      return NextResponse.json(
        { error: "Invalid subtotal" },
        { status: 400 }
      );
    }

    const result = await validateCoupon(couponCode, subtotal);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      );
    }

    const discount = calcCouponDiscount(result.coupon, subtotal);

    return NextResponse.json({
      valid: true,
      couponId: result.coupon.id,
      code: result.coupon.code,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
      discount,
      message: `Coupon applied: -₹${discount.toFixed(2)}`,
    });
  } catch (error) {
    console.error("[POST /api/pos/coupon/apply]", error);
    return NextResponse.json(
      { error: "Failed to apply coupon" },
      { status: 500 }
    );
  }
}