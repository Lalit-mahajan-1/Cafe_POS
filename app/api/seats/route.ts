import { NextResponse } from "next/server";
import { seatService } from "@/services/seat.service";

export async function GET() {
  try {
    const seats = await seatService.getAllSeats();
    return NextResponse.json({ seats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}