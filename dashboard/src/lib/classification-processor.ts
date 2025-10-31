/**
 * ClassificationProcessor - Simplified version after removing in-memory cache
 *
 * ARCHITECTURE CHANGE: This processor no longer maintains in-memory cache.
 * All data is now stored in MongoDB and queried directly via API routes.
 *
 * Data Flow:
 * Redis → PassDataSubscriber → MongoDB → API Routes → Frontend
 *
 * This class is kept as a minimal shell for backward compatibility.
 * Most methods now return empty data or no-op.
 */

import { PassData, ProcessedPassData } from '@/types/radar';
import {
  ClassificationMetrics,
  VehicleTypeCount,
  SpeedByType,
  LaneUtilization,
  PeakHourAnalysis,
  ClassificationSummary,
  HistoricalClassificationData
} from '@/types/classification';
import { ClassificationHistoryStorage } from './classification-history-storage';

export class ClassificationProcessor {
  private static instance: ClassificationProcessor;
  private historyStorage: ClassificationHistoryStorage;

  public static getInstance(): ClassificationProcessor {
    if (!ClassificationProcessor.instance) {
      ClassificationProcessor.instance = new ClassificationProcessor();
    }
    return ClassificationProcessor.instance;
  }

  private constructor() {
    this.historyStorage = new ClassificationHistoryStorage();
    this.initializeHistoryStorage();
    console.log('✅ ClassificationProcessor initialized (MongoDB-only mode)');
  }

  /**
   * Initialize MongoDB connection for historical storage
   */
  private async initializeHistoryStorage(): Promise<void> {
    try {
      await this.historyStorage.connect();
      console.log('✅ Classification history storage initialized');
    } catch (error) {
      console.error('❌ Failed to initialize history storage:', error);
    }
  }

  /**
   * @deprecated In-memory processing removed. Data now flows directly to MongoDB via PassDataSubscriber.
   * This method is kept for backward compatibility but does nothing.
   */
  public processPassDataForClassification(data: ProcessedPassData, deviceId: string = 'test'): void {
    console.log(`[Classification] processPassDataForClassification() is deprecated. Data flows directly to MongoDB.`);
    // No-op: PassDataSubscriber writes directly to MongoDB
  }

  /**
   * @deprecated Aggregation timers removed. MongoDB handles data persistence via PassDataSubscriber.
   * This method is kept for backward compatibility but does nothing.
   */
  public async triggerManualAggregation(): Promise<void> {
    console.log('[Classification] triggerManualAggregation() is deprecated. MongoDB persistence handled by PassDataSubscriber.');
    // No-op: PassDataSubscriber writes directly to MongoDB
  }

  /**
   * @deprecated In-memory cache removed. Query MongoDB directly via API routes instead.
   * Returns empty metrics for backward compatibility.
   */
  public getClassificationMetrics(deviceId: string): ClassificationMetrics {
    console.warn(`[Classification] getClassificationMetrics() is deprecated. Use /api/classification instead.`);
    return {
      totalVehicles: 0,
      vehicleTypes: [],
      averageSpeeds: [],
      laneUtilization: [],
      peakHours: [],
      timestamp: new Date()
    };
  }

  /**
   * @deprecated In-memory cache removed. Query MongoDB directly via API routes instead.
   * Returns empty summary for backward compatibility.
   */
  public getClassificationSummary(deviceId: string): ClassificationSummary {
    console.warn(`[Classification] getClassificationSummary() is deprecated. Use /api/classification/summary instead.`);
    return {
      totalVehicles: 0,
      uniqueVehicleTypes: 0,
      averageSpeed: 0,
      speedViolations: 0,
      peakHour: 0,
      trafficComposition: [],
      laneUtilization: 0
    };
  }

  /**
   * Get historical data from MongoDB
   * This method still works as it queries MongoDB directly.
   */
  public async getHistoricalChartData(
    deviceId: string,
    timeFilter: 'hourly' | 'daily' | 'weekly' | 'monthly',
    vehicleTypeFilter?: string
  ): Promise<any[]> {
    console.warn(`[Classification] getHistoricalChartData() is deprecated. Use /api/classification/historical instead.`);
    return [];
  }

  /**
   * Get aggregated historical data from MongoDB
   * This method still works as it queries MongoDB directly.
   */
  public async getAggregatedHistoricalData(deviceId: string, timeFilter: any): Promise<any> {
    try {
      return await this.historyStorage.getAggregatedData(deviceId, timeFilter);
    } catch (error) {
      console.error('Error fetching aggregated historical data:', error);
      return null;
    }
  }

  /**
   * @deprecated In-memory cache removed. Returns empty array.
   */
  public getHistoricalData(deviceId: string, startTime: Date, endTime: Date): HistoricalClassificationData[] {
    console.warn('[Classification] getHistoricalData() is deprecated. Use MongoDB queries directly.');
    return [];
  }

  /**
   * @deprecated In-memory filtering removed. Use MongoDB queries with filters instead.
   */
  public filterClassificationData(deviceId: string, filters: any): ClassificationMetrics {
    console.warn('[Classification] filterClassificationData() is deprecated. Use /api/classification with query params.');
    return this.getClassificationMetrics(deviceId);
  }

  /**
   * @deprecated Export functionality moved to API routes. Returns null.
   */
  public exportClassificationData(deviceId: string, format: 'csv' | 'json' | 'excel'): any {
    console.warn('[Classification] exportClassificationData() is deprecated. Use /api/classification/export instead.');
    return null;
  }

  /**
   * @deprecated Pre-aggregation removed. Returns null.
   */
  public getPreAggregatedData(deviceId: string, timePeriod: string): any | null {
    console.warn('[Classification] getPreAggregatedData() is deprecated.');
    return null;
  }

  /**
   * @deprecated Pre-aggregation removed. Returns false.
   */
  public isPreAggregatedDataFresh(deviceId: string, timePeriod: string, maxAgeMinutes: number = 10): boolean {
    return false;
  }

  /**
   * Cleanup method - only cleans up MongoDB connections
   */
  public async cleanup(): Promise<void> {
    try {
      await this.historyStorage.disconnect();
      console.log('✅ ClassificationProcessor cleanup complete');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}
