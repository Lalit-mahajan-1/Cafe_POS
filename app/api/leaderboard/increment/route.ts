import { NextResponse } from "next/server";
import { leaderboardService } from "@/services/leaderboard.service";
import { getCurrentUser } from "@/lib/auth/session";
import { incrementLimiter } from "@/lib/rate-limit";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    // 🛡️ Rate limit check
    const { success, remaining, reset } = await incrementLimiter.limit(user.id);

    if (!success) {
      const resetIn = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Try again in ${resetIn}s`,
          remaining,
        },
        { status: 429 } // Too Many Requests
      );
    }

    const updated = await leaderboardService.incrementScore(user.id);

    return NextResponse.json({
      success: true,
      user: updated,
      rateLimit: { remaining, resetIn: Math.ceil((reset - Date.now()) / 1000) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}