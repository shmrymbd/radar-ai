import { createClient } from 'redis';

let redisClient: any = null;
let isConnecting = false;

async function getRedisClient() {
  if (!redisClient && !isConnecting) {
    isConnecting = true;
    try {
      redisClient = createClient({
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

      redisClient.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
        redisClient = null;
      });

      redisClient.on('connect', () => {
        console.log('Connected to Redis server');
      });

      redisClient.on('ready', () => {
        console.log('Redis client ready');
      });

      redisClient.on('end', () => {
        console.log('Redis connection ended');
        redisClient = null;
      });

      await redisClient.connect();
      console.log('Redis client connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      redisClient = null;
    } finally {
      isConnecting = false;
    }
  }
  
  if (!redisClient) {
    throw new Error('Redis client not available');
  }
  
  return redisClient;
}

export { getRedisClient };
