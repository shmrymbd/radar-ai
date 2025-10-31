/**
 * Redis Cache Layer for Classification Data
 *
 * This service manages Redis cache for processed classification data,
 * replacing the previous in-memory cache architecture.
 *
 * Architecture:
 * - Redis keyspace notifications trigger data processing
 * - Processed data is cached in Redis with TTL (Time To Live)
 * - Data is also persisted to MongoDB for historical queries
 * - API routes query Redis cache first, fallback to MongoDB
 *
 * Key Patterns:
 * - `classification:{deviceId}:metrics` - Real-time metrics (TTL: 5 minutes)
 * - `classification:{deviceId}:summary` - Summary statistics (TTL: 1 minute)
 * - `classification:{deviceId}:hourly:{hour}` - Hourly analysis (TTL: 1 hour)
 * - `classification:{deviceId}:vehicles` - Vehicle type counts (TTL: 5 minutes)
 */

import { getRedisClient } from './redis';
import { ClassificationMetrics, ClassificationSummary, VehicleTypeCount } from '@/types/classification';

export class ClassificationRedisCache {
  private static instance: ClassificationRedisCache;

  // TTL values in seconds
  private readonly METRICS_TTL = 300; // 5 minutes
  private readonly SUMMARY_TTL = 60; // 1 minute
  private readonly HOURLY_TTL = 3600; // 1 hour
  private readonly VEHICLE_COUNTS_TTL = 300; // 5 minutes

  private constructor() {}

  public static getInstance(): ClassificationRedisCache {
    if (!ClassificationRedisCache.instance) {
      ClassificationRedisCache.instance = new ClassificationRedisCache();
    }
    return ClassificationRedisCache.instance;
  }

  /**
   * Cache real-time classification metrics
   */
  async cacheMetrics(deviceId: string, metrics: ClassificationMetrics): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `classification:${deviceId}:metrics`;
      await redis.setEx(key, this.METRICS_TTL, JSON.stringify(metrics));
      console.log(`✅ Cached metrics for device ${deviceId} (TTL: ${this.METRICS_TTL}s)`);
    } catch (error) {
      console.error(`❌ Failed to cache metrics for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get cached classification metrics
   */
  async getMetrics(deviceId: string): Promise<ClassificationMetrics | null> {
    try {
      const redis = await getRedisClient();
      const key = `classification:${deviceId}:metrics`;
      const data = await redis.get(key);

      if (!data) {
        console.log(`⚠️ Cache miss for metrics: ${deviceId}`);
        return null;
      }

      return JSON.parse(data) as ClassificationMetrics;
    } catch (error) {
      console.error(`❌ Failed to get metrics for device ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * Cache classification summary
   */
  async cacheSummary(deviceId: string, summary: ClassificationSummary): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `classification:${deviceId}:summary`;
      await redis.setEx(key, this.SUMMARY_TTL, JSON.stringify(summary));
      console.log(`✅ Cached summary for device ${deviceId} (TTL: ${this.SUMMARY_TTL}s)`);
    } catch (error) {
      console.error(`❌ Failed to cache summary for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get cached classification summary
   */
  async getSummary(deviceId: string): Promise<ClassificationSummary | null> {
    try {
      const redis = await getRedisClient();
      const key = `classification:${deviceId}:summary`;
      const data = await redis.get(key);

      if (!data) {
        console.log(`⚠️ Cache miss for summary: ${deviceId}`);
        return null;
      }

      return JSON.parse(data) as ClassificationSummary;
    } catch (error) {
      console.error(`❌ Failed to get summary for device ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * Cache vehicle type counts
   */
  async cacheVehicleCounts(deviceId: string, counts: VehicleTypeCount[]): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `classification:${deviceId}:vehicles`;
      await redis.setEx(key, this.VEHICLE_COUNTS_TTL, JSON.stringify(counts));
      console.log(`✅ Cached vehicle counts for device ${deviceId} (TTL: ${this.VEHICLE_COUNTS_TTL}s)`);
    } catch (error) {
      console.error(`❌ Failed to cache vehicle counts for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get cached vehicle type counts
   */
  async getVehicleCounts(deviceId: string): Promise<VehicleTypeCount[] | null> {
    try {
      const redis = await getRedisClient();
      const key = `classification:${deviceId}:vehicles`;
      const data = await redis.get(key);

      if (!data) {
        console.log(`⚠️ Cache miss for vehicle counts: ${deviceId}`);
        return null;
      }

      return JSON.parse(data) as VehicleTypeCount[];
    } catch (error) {
      console.error(`❌ Failed to get vehicle counts for device ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * Cache hourly analysis data
   */
  async cacheHourlyData(deviceId: string, hour: number, data: any): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `classification:${deviceId}:hourly:${hour}`;
      await redis.setEx(key, this.HOURLY_TTL, JSON.stringify(data));
      console.log(`✅ Cached hourly data for device ${deviceId} hour ${hour} (TTL: ${this.HOURLY_TTL}s)`);
    } catch (error) {
      console.error(`❌ Failed to cache hourly data for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get cached hourly analysis data
   */
  async getHourlyData(deviceId: string, hour: number): Promise<any | null> {
    try {
      const redis = await getRedisClient();
      const key = `classification:${deviceId}:hourly:${hour}`;
      const data = await redis.get(key);

      if (!data) {
        console.log(`⚠️ Cache miss for hourly data: ${deviceId} hour ${hour}`);
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Failed to get hourly data for device ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * Invalidate all cache for a device
   */
  async invalidateDevice(deviceId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const pattern = `classification:${deviceId}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`✅ Invalidated ${keys.length} cache keys for device ${deviceId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to invalidate cache for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(deviceId: string): Promise<{
    metricsExists: boolean;
    summaryExists: boolean;
    vehicleCountsExists: boolean;
    totalKeys: number;
  }> {
    try {
      const redis = await getRedisClient();

      const [metricsExists, summaryExists, vehicleCountsExists] = await Promise.all([
        redis.exists(`classification:${deviceId}:metrics`),
        redis.exists(`classification:${deviceId}:summary`),
        redis.exists(`classification:${deviceId}:vehicles`)
      ]);

      const pattern = `classification:${deviceId}:*`;
      const keys = await redis.keys(pattern);

      return {
        metricsExists: metricsExists === 1,
        summaryExists: summaryExists === 1,
        vehicleCountsExists: vehicleCountsExists === 1,
        totalKeys: keys.length
      };
    } catch (error) {
      console.error(`❌ Failed to get cache stats for device ${deviceId}:`, error);
      throw error;
    }
  }
}

export const getClassificationRedisCache = () => ClassificationRedisCache.getInstance();
