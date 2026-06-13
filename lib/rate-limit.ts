import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// Max 5 requests per minute per identifier
export const incrementLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "ratelimit:increment",
  analytics: true,
});