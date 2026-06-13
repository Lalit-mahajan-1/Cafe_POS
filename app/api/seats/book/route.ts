import { NextRequest, NextResponse } from "next/server";
import { seatService } from "@/services/seat.service";
import { bookSeatSchema } from "@/lib/validations/booking";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    // Must be logged in to book
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bookSeatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const booking = await seatService.bookSeat(parsed.data.seatId, user.id);
    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Booking failed" },
      { status: 400 }
    );
  }
}