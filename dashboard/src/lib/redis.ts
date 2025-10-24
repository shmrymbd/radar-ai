import { createClient } from 'redis';

let redisClient: any = null;
let isConnecting = false;

async function getRedisClient() {
  if (!redisClient && !isConnecting) {
    isConnecting = true;
    try {
      redisClient = createClient({
        url: `redis://${process.env.REDIS_HOST || '192.168.6.22'}:${process.env.REDIS_PORT || '6379'}`,
      });

      redisClient.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
      });

      redisClient.on('connect', () => {
        console.log('Connected to Redis server');
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
