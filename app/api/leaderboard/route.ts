import { NextResponse } from "next/server";
import { leaderboardService } from "@/services/leaderboard.service";

export async function GET() {
  try {
    const result = await leaderboardService.getTopUsers();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}