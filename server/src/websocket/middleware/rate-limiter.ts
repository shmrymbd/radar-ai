/**
 * WebSocket Rate Limiting Middleware
 * Limits messages per client to prevent abuse
 */

import { WebSocket } from 'ws';
import { createLogger } from '../../utils/logger';

const logger = createLogger('rate-limiter');

interface RateLimitInfo {
  messageCount: number;
  messageResetAt: number;
}

export class RateLimiter {
  private limits: Map<WebSocket, RateLimitInfo> = new Map();
  private readonly maxMessagesPerMinute: number = 100;

  /**
   * Check if client is within rate limit
   */
  public checkLimit(ws: WebSocket): boolean {
    let limitInfo = this.limits.get(ws);

    if (!limitInfo) {
      limitInfo = {
        messageCount: 0,
        messageResetAt: Date.now() + 60000,
      };
      this.limits.set(ws, limitInfo);
    }

    const now = Date.now();

    // Reset counter if window expired
    if (now > limitInfo.messageResetAt) {
      limitInfo.messageCount = 0;
      limitInfo.messageResetAt = now + 60000;
    }

    // Check limit
    if (limitInfo.messageCount >= this.maxMessagesPerMinute) {
      logger.warn('Client exceeded message rate limit', {
        currentCount: limitInfo.messageCount,
        limit: this.maxMessagesPerMinute,
      });
      return false;
    }

    // Increment counter
    limitInfo.messageCount++;
    return true;
  }

  /**
   * Remove rate limit info for disconnected client
   */
  public removeClient(ws: WebSocket): void {
    this.limits.delete(ws);
  }

  /**
   * Get current rate limit stats for client
   */
  public getStats(ws: WebSocket): { count: number; limit: number; resetAt: number } | null {
    const limitInfo = this.limits.get(ws);
    if (!limitInfo) return null;

    return {
      count: limitInfo.messageCount,
      limit: this.maxMessagesPerMinute,
      resetAt: limitInfo.messageResetAt,
    };
  }
}
