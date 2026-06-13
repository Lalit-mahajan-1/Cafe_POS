import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/sessions";
import { recalculateCart, CartItem } from "@/services/discount.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items, couponCode } = body as {
      items: CartItem[];
      couponCode?: string | null;
    };

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "items must be an array" },
        { status: 400 }
      );
    }

    const result = await recalculateCart(items, couponCode);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[POST /api/pos/cart/recalculate]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to recalculate cart",
      },
      { status: 500 }
    );
  }
}