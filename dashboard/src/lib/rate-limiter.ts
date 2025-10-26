/**
 * Simple in-memory rate limiter using sliding window algorithm
 */

interface RateLimitEntry {
  timestamps: number[];
  blocked: boolean;
  blockedUntil?: number;
}

export class RateLimiter {
  private requests: Map<string, RateLimitEntry>;
  private windowMs: number;
  private maxRequests: number;
  private blockDurationMs: number;

  constructor(
    windowMs: number = 60 * 1000, // 1 minute
    maxRequests: number = 100, // 100 requests per window
    blockDurationMs: number = 5 * 60 * 1000 // Block for 5 minutes if exceeded
  ) {
    this.requests = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.blockDurationMs = blockDurationMs;

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Check if request is allowed
   */
  public isAllowed(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
    blockedUntil?: number;
  } {
    const now = Date.now();
    let entry = this.requests.get(identifier);

    // Check if blocked
    if (entry?.blocked && entry.blockedUntil) {
      if (now < entry.blockedUntil) {
        return {
          allowed: false,
          remaining: 0,
          resetIn: entry.blockedUntil - now,
          blockedUntil: entry.blockedUntil
        };
      } else {
        // Unblock and reset
        entry.blocked = false;
        entry.blockedUntil = undefined;
        entry.timestamps = [];
      }
    }

    // Initialize if not exists
    if (!entry) {
      entry = {
        timestamps: [],
        blocked: false
      };
      this.requests.set(identifier, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Check if limit exceeded
    if (entry.timestamps.length >= this.maxRequests) {
      // Block the identifier
      entry.blocked = true;
      entry.blockedUntil = now + this.blockDurationMs;

      console.warn(`⚠️ Rate limit exceeded for ${identifier}. Blocked until ${new Date(entry.blockedUntil).toISOString()}`);

      return {
        allowed: false,
        remaining: 0,
        resetIn: this.blockDurationMs,
        blockedUntil: entry.blockedUntil
      };
    }

    // Record this request
    entry.timestamps.push(now);

    const oldestTimestamp = entry.timestamps[0];
    const resetIn = this.windowMs - (now - oldestTimestamp);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.timestamps.length,
      resetIn: Math.max(0, resetIn)
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  public reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.requests.entries()) {
      // Remove if not blocked and no recent requests
      if (!entry.blocked && entry.timestamps.length === 0) {
        keysToDelete.push(key);
      }

      // Remove if block period has expired and no recent requests
      if (entry.blocked && entry.blockedUntil && now > entry.blockedUntil) {
        if (entry.timestamps.length === 0) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => this.requests.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} rate limit entries`);
    }
  }

  /**
   * Get statistics
   */
  public getStats(): {
    totalIdentifiers: number;
    blockedIdentifiers: number;
    activeRequests: number;
    averageRequestsPerIdentifier: number;
  } {
    let blockedCount = 0;
    let totalRequests = 0;

    for (const entry of this.requests.values()) {
      if (entry.blocked) blockedCount++;
      totalRequests += entry.timestamps.length;
    }

    return {
      totalIdentifiers: this.requests.size,
      blockedIdentifiers: blockedCount,
      activeRequests: totalRequests,
      averageRequestsPerIdentifier: this.requests.size > 0 ? totalRequests / this.requests.size : 0
    };
  }
}

// Singleton instances for different rate limits
const apiRateLimiter = new RateLimiter(60 * 1000, 100, 5 * 60 * 1000); // 100 req/min
const exportRateLimiter = new RateLimiter(60 * 1000, 10, 10 * 60 * 1000); // 10 exports/min

export function getApiRateLimiter(): RateLimiter {
  return apiRateLimiter;
}

export function getExportRateLimiter(): RateLimiter {
  return exportRateLimiter;
}
