import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

let redisClient: any = null;
let connectionPromise: Promise<any> | null = null;

async function getRedisClient(): Promise<any> {
  // If already connected, return immediately
  if (redisClient) {
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
        url: `redis://${process.env.REDIS_HOST || '192.168.6.22'}:${process.env.REDIS_PORT || '6379'}`,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.error('Redis connection failed after 3 retries');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      client.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
        redisClient = null;
        connectionPromise = null; // Allow retry
      });

      client.on('connect', () => {
        console.log('Connected to Redis server');
      });

      client.on('ready', () => {
        console.log('Redis client ready');
      });

      client.on('end', () => {
        console.log('Redis connection ended');
        redisClient = null;
        connectionPromise = null; // Allow reconnection
      });

      await client.connect();
      console.log('Redis client connected successfully');

      redisClient = client;
      return client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      connectionPromise = null; // Allow retry
      throw error;
    }
  })();

  return connectionPromise;
}

export { getRedisClient };
