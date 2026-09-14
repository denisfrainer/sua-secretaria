/**
 * In-Memory Sliding Window IP Rate Limiter
 * Protects promotional endpoints against automated bot attacks and prize stock depletion.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitConfig {
  maxRequests: number; // Max requests allowed within window
  windowMs: number;    // Window size in milliseconds
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 5,              // 5 spin attempts
  windowMs: 10 * 60 * 1000,    // per 10 minutes per IP
};

export function checkIpRateLimit(
  ip: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const existing = ipStore.get(ip);

  if (!existing || now > existing.resetTime) {
    // New window for this IP
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    ipStore.set(ip, newRecord);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }

  // Existing window
  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime,
  };
}

/**
 * Extracts client IP from standard proxy and CDN headers
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return '127.0.0.1';
}
