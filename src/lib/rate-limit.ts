import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null; // skip rate limiting if not configured (dev)

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: false,
  });

  return ratelimit;
}

/**
 * Check rate limit for a given user ID.
 * Returns { success: true } if within limits or if Redis is not configured.
 */
export async function checkRateLimit(
  userId: string
): Promise<{ success: boolean; reset?: number }> {
  const rl = getRatelimit();
  if (!rl) return { success: true };

  const { success, reset } = await rl.limit(`ai:${userId}`);
  return { success, reset };
}
