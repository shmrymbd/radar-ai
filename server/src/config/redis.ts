/**
 * Redis Client Configuration
 * Singleton pattern with automatic reconnection
 */

import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { config } from './env';
import { createLogger } from '../utils/logger';

const logger = createLogger('redis');

let redisClient: RedisClientType | null = null;
let connectionPromise: Promise<RedisClientType> | null = null;

/**
 * Get or create Redis client instance
 * Uses singleton pattern to ensure single connection
 */
export async function getRedisClient(): Promise<RedisClientType> {
  // If already connected, return immediately
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // If connection in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  connectionPromise = (async () => {
    try {
      const client = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              logger.error('Redis connection failed after 3 retries');
              return new Error('Redis connection failed');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.warn(`Redis reconnection attempt ${retries}, waiting ${delay}ms`);
            return delay;
          },
        },
      });

      // Event handlers
      client.on('error', (err: Error) => {
        logger.error('Redis client error', { error: err.message });
        redisClient = null;
        connectionPromise = null; // Allow retry
      });

      client.on('connect', () => {
        logger.info('Connected to Redis server', {
          host: config.redis.host,
          port: config.redis.port,
        });
      });

      client.on('ready', () => {
        logger.info('Redis client ready');
      });

      client.on('end', () => {
        logger.warn('Redis connection ended');
        redisClient = null;
        connectionPromise = null; // Allow reconnection
      });

      client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      // Connect
      await client.connect();
      logger.info('Redis client connected successfully');

      redisClient = client;
      return client;
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : String(error),
      });
      connectionPromise = null; // Allow retry
      throw error;
    }
  })();

  return connectionPromise;
}

/**
 * Close Redis connection
 * Should be called during graceful shutdown
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      redisClient = null;
      connectionPromise = null;
    }
  }
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return redisClient !== null && redisClient.isOpen;
}

export { redisClient };
