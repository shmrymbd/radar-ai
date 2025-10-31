/**
 * Redis-backed rate limiter using sliding window algorithm
 * Persists rate limit data across server restarts
 */

import { getRedisClient } from './redis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  blockedUntil?: number;
}

export class RedisRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private blockDurationMs: number;
  private keyPrefix: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    keyPrefix: string,
    windowMs: number = 60 * 1000, // 1 minute
    maxRequests: number = 100, // 100 requests per window
    blockDurationMs: number = 5 * 60 * 1000 // Block for 5 minutes if exceeded
  ) {
    this.keyPrefix = keyPrefix;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.blockDurationMs = blockDurationMs;

    // Cleanup old entries every 5 minutes (less frequent than in-memory)
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   */
  public async isAllowed(identifier: string): Promise<RateLimitResult> {
    try {
      const redis = await getRedisClient();
      const now = Date.now();

      const timestampsKey = `${this.keyPrefix}:timestamps:${identifier}`;
      const blockedKey = `${this.keyPrefix}:blocked:${identifier}`;

      // Check if blocked
      const blockedUntil = await redis.get(blockedKey);
      if (blockedUntil) {
        const blockedUntilNum = parseInt(blockedUntil, 10);
        if (now < blockedUntilNum) {
          return {
            allowed: false,
            remaining: 0,
            resetIn: blockedUntilNum - now,
            blockedUntil: blockedUntilNum
          };
        } else {
          // Unblock - delete blocked key and clear timestamps
          await redis.del(blockedKey);
          await redis.del(timestampsKey);
        }
      }

      // Get timestamps within the window
      const windowStart = now - this.windowMs;

      // Remove timestamps outside the window
      await redis.zRemRangeByScore(timestampsKey, 0, windowStart);

      // Get count of requests in window
      const count = await redis.zCard(timestampsKey);

      // Check if limit exceeded
      if (count >= this.maxRequests) {
        // Block the identifier
        const blockedUntilTime = now + this.blockDurationMs;
        await redis.setEx(
          blockedKey,
          Math.ceil(this.blockDurationMs / 1000),
          blockedUntilTime.toString()
        );

        console.warn(
          `⚠️ Rate limit exceeded for ${identifier}. ` +
          `Blocked until ${new Date(blockedUntilTime).toISOString()}`
        );

        return {
          allowed: false,
          remaining: 0,
          resetIn: this.blockDurationMs,
          blockedUntil: blockedUntilTime
        };
      }

      // Record this request using sorted set (score = timestamp)
      await redis.zAdd(timestampsKey, { score: now, value: `${now}-${Math.random()}` });

      // Set TTL on timestamps key to auto-cleanup
      await redis.expire(timestampsKey, Math.ceil((this.windowMs + this.blockDurationMs) / 1000));

      // Calculate reset time
      const timestamps = await redis.zRange(timestampsKey, 0, 0);
      const oldestTimestamp = timestamps.length > 0 ?
        parseFloat(timestamps[0].split('-')[0]) : now;
      const resetIn = this.windowMs - (now - oldestTimestamp);

      return {
        allowed: true,
        remaining: this.maxRequests - (count + 1),
        resetIn: Math.max(0, resetIn)
      };
    } catch (error) {
      console.error('Redis rate limiter error:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetIn: this.windowMs
      };
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  public async reset(identifier: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const timestampsKey = `${this.keyPrefix}:timestamps:${identifier}`;
      const blockedKey = `${this.keyPrefix}:blocked:${identifier}`;

      await redis.del(timestampsKey);
      await redis.del(blockedKey);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }

  /**
   * Clean up old entries (runs periodically)
   */
  private async cleanup(): Promise<void> {
    try {
      const redis = await getRedisClient();
      const pattern = `${this.keyPrefix}:timestamps:*`;

      // Scan for timestamp keys
      const keys: string[] = [];
      let cursor = 0;

      do {
        const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      const now = Date.now();
      const windowStart = now - this.windowMs;
      let cleanedCount = 0;

      // Clean up old timestamps in each key
      for (const key of keys) {
        const removed = await redis.zRemRangeByScore(key, 0, windowStart);
        cleanedCount += removed;

        // Delete key if empty
        const count = await redis.zCard(key);
        if (count === 0) {
          await redis.del(key);
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} rate limit entries from Redis`);
      }
    } catch (error) {
      console.error('Error cleaning up rate limit entries:', error);
    }
  }

  /**
   * Get statistics
   */
  public async getStats(): Promise<{
    totalIdentifiers: number;
    blockedIdentifiers: number;
    activeRequests: number;
    averageRequestsPerIdentifier: number;
  }> {
    try {
      const redis = await getRedisClient();

      // Get all timestamp keys
      const timestampPattern = `${this.keyPrefix}:timestamps:*`;
      const blockedPattern = `${this.keyPrefix}:blocked:*`;

      const timestampKeys: string[] = [];
      const blockedKeys: string[] = [];
      let cursor = 0;

      // Scan for timestamp keys
      do {
        const result = await redis.scan(cursor, { MATCH: timestampPattern, COUNT: 100 });
        cursor = result.cursor;
        timestampKeys.push(...result.keys);
      } while (cursor !== 0);

      // Scan for blocked keys
      cursor = 0;
      do {
        const result = await redis.scan(cursor, { MATCH: blockedPattern, COUNT: 100 });
        cursor = result.cursor;
        blockedKeys.push(...result.keys);
      } while (cursor !== 0);

      // Count total requests
      let totalRequests = 0;
      for (const key of timestampKeys) {
        const count = await redis.zCard(key);
        totalRequests += count;
      }

      return {
        totalIdentifiers: timestampKeys.length,
        blockedIdentifiers: blockedKeys.length,
        activeRequests: totalRequests,
        averageRequestsPerIdentifier: timestampKeys.length > 0 ?
          totalRequests / timestampKeys.length : 0
      };
    } catch (error) {
      console.error('Error getting rate limiter stats:', error);
      return {
        totalIdentifiers: 0,
        blockedIdentifiers: 0,
        activeRequests: 0,
        averageRequestsPerIdentifier: 0
      };
    }
  }

  /**
   * Cleanup interval on shutdown
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instances for different rate limits
let apiRateLimiter: RedisRateLimiter | null = null;
let exportRateLimiter: RedisRateLimiter | null = null;

export function getApiRateLimiter(): RedisRateLimiter {
  if (!apiRateLimiter) {
    apiRateLimiter = new RedisRateLimiter(
      'ratelimit:api',
      60 * 1000,     // 1 minute window
      100,           // 100 requests per window
      5 * 60 * 1000  // Block for 5 minutes
    );
  }
  return apiRateLimiter;
}

export function getExportRateLimiter(): RedisRateLimiter {
  if (!exportRateLimiter) {
    exportRateLimiter = new RedisRateLimiter(
      'ratelimit:export',
      60 * 1000,      // 1 minute window
      10,             // 10 requests per window
      10 * 60 * 1000  // Block for 10 minutes
    );
  }
  return exportRateLimiter;
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    apiRateLimiter?.destroy();
    exportRateLimiter?.destroy();
  });

  process.on('SIGINT', () => {
    apiRateLimiter?.destroy();
    exportRateLimiter?.destroy();
  });
}
