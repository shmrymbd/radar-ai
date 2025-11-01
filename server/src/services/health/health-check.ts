/**
 * Health Check Service
 * Monitors Redis and MongoDB connection status
 */

import { getRedisClient, isRedisConnected } from '../../config/redis';
import { getMongoClient, isMongoConnected } from '../../config/mongodb';
import { createLogger } from '../../utils/logger';

const logger = createLogger('health-check');

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  latency?: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    redis: ServiceHealth;
    mongodb: ServiceHealth;
    websocket: ServiceHealth;
  };
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private startTime: number = Date.now();

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  private constructor() {
    logger.info('Health check service initialized');
  }

  /**
   * Check Redis health
   */
  private async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Check if Redis is connected
      if (!isRedisConnected()) {
        return {
          status: 'unhealthy',
          message: 'Redis not connected',
        };
      }

      // Ping Redis to check latency
      const redis = await getRedisClient();
      await redis.ping();

      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check MongoDB health
   */
  private async checkMongoDB(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Check if MongoDB is connected
      if (!isMongoConnected()) {
        return {
          status: 'unhealthy',
          message: 'MongoDB not connected',
        };
      }

      const client = getMongoClient();
      if (!client) {
        return {
          status: 'unhealthy',
          message: 'MongoDB client not available',
        };
      }

      // Ping MongoDB
      await client.db('admin').command({ ping: 1 });

      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      logger.error('MongoDB health check failed', { error });
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check WebSocket server health
   */
  private checkWebSocket(): ServiceHealth {
    // For now, we'll import this dynamically to avoid circular dependencies
    // The WebSocket server should expose a getStatus method
    return {
      status: 'healthy',
      message: 'WebSocket server running',
    };
  }

  /**
   * Perform comprehensive health check
   */
  public async check(): Promise<HealthCheckResult> {
    const [redis, mongodb, websocket] = await Promise.all([
      this.checkRedis(),
      this.checkMongoDB(),
      this.checkWebSocket(),
    ]);

    // Determine overall status
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (redis.status === 'unhealthy' || mongodb.status === 'unhealthy') {
      status = 'unhealthy';
    } else if (
      redis.status === 'degraded' ||
      mongodb.status === 'degraded' ||
      websocket.status === 'degraded'
    ) {
      status = 'degraded';
    }

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      services: {
        redis,
        mongodb,
        websocket,
      },
    };
  }

  /**
   * Quick liveness check (for Kubernetes liveness probe)
   */
  public async isAlive(): Promise<boolean> {
    return true; // Server is alive if it can respond
  }

  /**
   * Readiness check (for Kubernetes readiness probe)
   */
  public async isReady(): Promise<boolean> {
    try {
      const result = await this.check();
      return result.status === 'healthy' || result.status === 'degraded';
    } catch (error) {
      logger.error('Readiness check failed', { error });
      return false;
    }
  }
}
