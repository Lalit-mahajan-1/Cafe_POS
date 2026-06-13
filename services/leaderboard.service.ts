import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const CACHE_KEY = "leaderboard:top10";
const CACHE_TTL = 30; // seconds

export const leaderboardService = {
  /**
   * Get top 10 users by score.
   * Tries cache first, falls back to DB.
   */
  async getTopUsers() {
    // 1. Try cache
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      console.log("✅ CACHE HIT — served from Redis");
      return { source: "cache", users: cached };
    }

    // 2. Cache miss → query DB
    console.log("❌ CACHE MISS — querying DB");
    const users = await prisma.user.findMany({
      select: { id: true, name: true, score: true, avatar: true },
      orderBy: { score: "desc" },
      take: 10,
    });

    // 3. Store in cache for next time (30 sec)
    await redis.set(CACHE_KEY, JSON.stringify(users), { ex: CACHE_TTL });

    return { source: "db", users };
  },

  /**
   * Increment user score by 1.
   * Invalidates cache so next read is fresh.
   */
  async incrementScore(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { score: { increment: 1 } },
      select: { id: true, name: true, score: true },
    });

    // Invalidate cache so leaderboard refreshes
    await redis.del(CACHE_KEY);
    console.log("🗑️  Cache invalidated after score update");

    return user;
  },
};