/**
 * Background service that continuously polls Redis for PassData
 * and feeds it to the Classification Processor
 */

import { RedisStorage } from './redis-storage';
import { ClassificationProcessor } from './classification-processor';

export class ClassificationRedisPoller {
  private static instance: ClassificationRedisPoller;
  private redisStorage: RedisStorage;
  private classificationProcessor: ClassificationProcessor;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private lastProcessedTimestamp: Date = new Date(0);
  private pollIntervalMs: number;
  private deviceIds: string[];

  private constructor(pollIntervalMs: number = 30000, deviceIds: string[] = ['test', 'Radar04']) {
    this.redisStorage = RedisStorage.getInstance();
    this.classificationProcessor = ClassificationProcessor.getInstance();
    this.pollIntervalMs = pollIntervalMs;
    this.deviceIds = deviceIds;
  }

  public static getInstance(pollIntervalMs?: number, deviceIds?: string[]): ClassificationRedisPoller {
    if (!ClassificationRedisPoller.instance) {
      ClassificationRedisPoller.instance = new ClassificationRedisPoller(pollIntervalMs, deviceIds);
    }
    return ClassificationRedisPoller.instance;
  }

  /**
   * Start polling Redis for PassData
   */
  public start(): void {
    if (this.isPolling) {
      console.log('⚠️ Redis poller is already running');
      return;
    }

    this.isPolling = true;
    console.log(`🚀 Starting Redis PassData poller (interval: ${this.pollIntervalMs}ms, devices: ${this.deviceIds.join(', ')})`);

    // Initial poll
    this.pollRedis();

    // Set up interval
    this.pollingInterval = setInterval(() => {
      this.pollRedis();
    }, this.pollIntervalMs);
  }

  /**
   * Stop polling Redis
   */
  public stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('🛑 Stopped Redis PassData poller');
  }

  /**
   * Check if poller is running
   */
  public isRunning(): boolean {
    return this.isPolling;
  }

  /**
   * Set polling interval (requires restart to take effect)
   */
  public setPollInterval(intervalMs: number): void {
    this.pollIntervalMs = intervalMs;
    if (this.isPolling) {
      this.stop();
      this.start();
    }
  }

  /**
   * Set device IDs to poll (requires restart to take effect)
   */
  public setDevices(deviceIds: string[]): void {
    this.deviceIds = deviceIds;
    console.log(`📱 Updated device list: ${deviceIds.join(', ')}`);
  }

  /**
   * Reset the last processed timestamp
   */
  public resetTimestamp(): void {
    this.lastProcessedTimestamp = new Date(0);
    console.log('🔄 Reset last processed timestamp');
  }

  /**
   * Poll Redis for new PassData
   */
  private async pollRedis(): Promise<void> {
    try {
      let totalProcessed = 0;

      for (const deviceId of this.deviceIds) {
        const processed = await this.pollDevicePassData(deviceId);
        totalProcessed += processed;
      }

      if (totalProcessed > 0) {
        console.log(`✅ Polled and processed ${totalProcessed} new PassData entries`);
      }

    } catch (error) {
      console.error('❌ Error polling Redis for PassData:', error);
    }
  }

  /**
   * Poll PassData for a specific device
   */
  private async pollDevicePassData(deviceId: string): Promise<number> {
    try {
      // Get latest PassData from Redis (get more entries to ensure we don't miss any)
      const passDataEntries = await this.redisStorage.getDevicePassData(deviceId, 100);

      if (passDataEntries.length === 0) {
        return 0;
      }

      // Filter to only new entries (after last processed timestamp)
      const newEntries = passDataEntries.filter(entry => {
        const entryTimestamp = new Date(entry.timestamp);
        return entryTimestamp > this.lastProcessedTimestamp;
      });

      if (newEntries.length === 0) {
        return 0;
      }

      // Process each new entry
      let processedCount = 0;
      for (const passData of newEntries) {
        try {
          // Extract vehicle type from passData structure
          // Redis PassData has nested entries array with vehicleType object
          const entries = (passData as any).entries;
          if (!entries || !Array.isArray(entries) || entries.length === 0) {
            continue; // Skip if no entries
          }

          const entry = entries[0]; // Process first entry
          const vehicleTypeData = entry.vehicleType;

          // Handle both object format {code, name, category} and string format
          const vehicleTypeName = typeof vehicleTypeData === 'string'
            ? vehicleTypeData
            : (vehicleTypeData?.name || 'unknown');

          // Map vehicle type to classification format
          const vehicleType = this.mapVehicleType(vehicleTypeName);

          // Create processed data for classification
          const processedData = {
            deviceId,
            timestamp: new Date(passData.timestamp),
            laneNumber: entry.lane?.number || 0,
            crossSectionPosition: entry.crossSection?.position || 0,
            crossSectionSpeed: entry.crossSection?.speed || 0,
            headwayTime: entry.crossSection?.headwayTime || 0,
            passingTime: entry.passing?.time || passData.timestamp,
            occupancyDuration: entry.passing?.occupancyDuration || 0,
            occupancyStatus: entry.passing?.occupancyStatus === 'Exiting' ? 1 : 0,
            vehicleType
          };

          // Feed to classification processor
          this.classificationProcessor.processPassDataForClassification(processedData, deviceId);
          processedCount++;

          // Update last processed timestamp
          const entryTimestamp = new Date(passData.timestamp);
          if (entryTimestamp > this.lastProcessedTimestamp) {
            this.lastProcessedTimestamp = entryTimestamp;
          }

        } catch (error) {
          console.error(`❌ Error processing PassData entry for device ${deviceId}:`, error);
        }
      }

      if (processedCount > 0) {
        console.log(`📊 Processed ${processedCount} new PassData entries for device ${deviceId}`);
      }

      return processedCount;

    } catch (error) {
      console.error(`❌ Error polling PassData for device ${deviceId}:`, error);
      return 0;
    }
  }

  /**
   * Map vehicle type names to classification format
   */
  private mapVehicleType(vehicleType: string): string {
    const typeMap: { [key: string]: string } = {
      'car': 'car',
      'van': 'van',
      'suv': 'suv',
      'truck': 'truck',
      'motorcycle': 'motorcycle',
      'bus': 'van', // Map bus to van
      'bicycle': 'motorcycle', // Map bicycle to motorcycle
      'large_truck': 'truck',
      'medium_truck': 'truck',
      'light_truck': 'truck',
      'unknown': 'car' // Default unknown to car
    };

    const normalizedType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    return typeMap[normalizedType] || 'car';
  }

  /**
   * Get poller statistics
   */
  public getStats(): {
    isRunning: boolean;
    pollIntervalMs: number;
    deviceIds: string[];
    lastProcessedTimestamp: string;
    uptime: number;
  } {
    return {
      isRunning: this.isPolling,
      pollIntervalMs: this.pollIntervalMs,
      deviceIds: this.deviceIds,
      lastProcessedTimestamp: this.lastProcessedTimestamp.toISOString(),
      uptime: this.pollingInterval ? Date.now() - this.lastProcessedTimestamp.getTime() : 0
    };
  }
}

// Auto-start the poller when this module is imported
// This ensures continuous data processing from Redis
const poller = ClassificationRedisPoller.getInstance();

// Only start if in production or explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_REDIS_POLLER === 'true') {
  poller.start();
  console.log('✅ Auto-started Redis PassData poller');
}

export default poller;
