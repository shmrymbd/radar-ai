/**
 * Redis Pub/Sub subscriber for PassData key updates
 * Listens for PassData changes and writes directly to MongoDB
 */

import { createClient, RedisClientType } from 'redis';
import { connectToDatabase } from './mongodb';
import { ProcessedPassData } from '@/types/radar';
import { VEHICLE_TYPE_MAP } from '@/types/classification';

export class PassDataSubscriber {
  private static instance: PassDataSubscriber;
  private subscriber: RedisClientType | null = null;
  private dataClient: RedisClientType | null = null;
  private deviceIds: string[];
  private isRunning: boolean = false;
  private lastProcessedTimestamp: Map<string, Date> = new Map();

  private constructor(deviceIds: string[] = ['P1-center', 'P3', 'P1-o/h']) {
    this.deviceIds = deviceIds;
  }

  public static getInstance(deviceIds?: string[]): PassDataSubscriber {
    if (!PassDataSubscriber.instance) {
      PassDataSubscriber.instance = new PassDataSubscriber(deviceIds);
    }
    return PassDataSubscriber.instance;
  }

  /**
   * Start subscribing to PassData key updates
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ PassData subscriber is already running');
      return;
    }

    try {
      // Create subscriber client for Pub/Sub
      this.subscriber = createClient({
        socket: {
          host: process.env.REDIS_HOST || '192.168.6.22',
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      });

      // Create separate client for data operations
      this.dataClient = createClient({
        socket: {
          host: process.env.REDIS_HOST || '192.168.6.22',
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      });

      await this.subscriber.connect();
      await this.dataClient.connect();

      // Subscribe to keyspace notifications for all passdata keys
      const patterns = this.deviceIds.map(deviceId => `__keyspace@0__:${deviceId}/passdata`);

      for (const pattern of patterns) {
        await this.subscriber.pSubscribe(pattern, async (message, channel) => {
          await this.handlePassDataUpdate(channel, message);
        });
      }

      this.isRunning = true;
      console.log(`🚀 PassData subscriber started for devices: ${this.deviceIds.join(', ')}`);
      console.log(`📡 Listening for PassData updates via Redis Pub/Sub`);

    } catch (error) {
      console.error('❌ Error starting PassData subscriber:', error);
      throw error;
    }
  }

  /**
   * Stop the subscriber
   */
  public async stop(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (this.dataClient) {
      await this.dataClient.quit();
      this.dataClient = null;
    }
    this.isRunning = false;
    console.log('🛑 PassData subscriber stopped');
  }

  /**
   * Handle PassData key update notification
   */
  private async handlePassDataUpdate(channel: string, message: string): Promise<void> {
    try {
      // Extract device ID from channel: __keyspace@0__:test/PassData
      const deviceId = channel.split(':')[1].split('/')[0];

      console.log(`📨 PassData update detected for device: ${deviceId} (event: ${message})`);

      // Fetch the latest PassData entries from Redis
      const passDataEntries = await this.fetchLatestPassData(deviceId);

      if (passDataEntries.length === 0) {
        return;
      }

      // Write to MongoDB passdata collection (raw data)
      await this.writeToMongoDB(deviceId, passDataEntries);

      console.log(`✅ Processed ${passDataEntries.length} PassData entries for device: ${deviceId}`);

      // Trigger immediate aggregation for historical data
      await this.triggerAggregation(deviceId);

    } catch (error) {
      console.error('❌ Error handling PassData update:', error);
    }
  }

  /**
   * Trigger immediate aggregation for historical data
   */
  private async triggerAggregation(deviceId: string): Promise<void> {
    try {
      // Import ClassificationProcessor dynamically to avoid circular dependencies
      const { ClassificationProcessor } = await import('./classification-processor');
      const processor = ClassificationProcessor.getInstance();

      console.log(`🔄 Triggering immediate aggregation for device: ${deviceId}`);
      await processor.triggerManualAggregation();
      console.log(`✅ Aggregation completed for device: ${deviceId}`);
    } catch (error) {
      console.error('❌ Error triggering aggregation:', error);
    }
  }

  /**
   * Fetch latest PassData entries from Redis
   */
  private async fetchLatestPassData(deviceId: string): Promise<any[]> {
    if (!this.dataClient) {
      throw new Error('Data client not connected');
    }

    try {
      // CRITICAL FIX: Get the NEWEST 10 entries from the end of the list (index -10 to -1)
      // Radar uses RPUSH which adds to the end, so index -1 is the newest
      const entries = await this.dataClient.lRange(`${deviceId}/passdata`, -10, -1);

      const parsedEntries = entries.map(entry => JSON.parse(entry));

      // Filter out entries we've already processed based on timestamp
      const lastTimestamp = this.lastProcessedTimestamp.get(deviceId);
      if (lastTimestamp) {
        const filtered = parsedEntries.filter(passData => {
          const entries = passData.entries || [];
          if (entries.length === 0) return false;

          // Use frame timestamp (when Node-RED processed) for consistency
          // NOT entry.passing.time (vehicle passing time - older by ~4 minutes)
          const entryTime = new Date(passData.timestamp);

          return entryTime > lastTimestamp;
        });

        if (filtered.length < parsedEntries.length) {
          console.log(`🔄 Filtered ${parsedEntries.length - filtered.length} already-processed entries for ${deviceId}`);
        }

        return filtered;
      }

      return parsedEntries;

    } catch (error) {
      console.error(`❌ Error fetching PassData for device ${deviceId}:`, error);
      return [];
    }
  }

  /**
   * Write PassData to MongoDB
   */
  private async writeToMongoDB(deviceId: string, passDataEntries: any[]): Promise<void> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection('passdata');

      const documents = passDataEntries.map(passData => {
        // Extract vehicle type from nested structure
        const entries = passData.entries || [];
        if (entries.length === 0) return null;

        const entry = entries[0];
        const vehicleTypeData = entry.vehicleType;
        
        // Handle both numeric code and string name formats
        let vehicleType: string;
        if (typeof vehicleTypeData === 'object' && vehicleTypeData.code !== undefined) {
          // Use official VEHICLE_TYPE_MAP for numeric codes
          vehicleType = VEHICLE_TYPE_MAP[vehicleTypeData.code as keyof typeof VEHICLE_TYPE_MAP] || 'other';
        } else if (typeof vehicleTypeData === 'string') {
          // If it's already a string, use it directly
          vehicleType = vehicleTypeData;
        } else {
          // Fallback to 'other' for unknown formats
          vehicleType = 'other';
        }

        return {
          deviceId,
          // Use frame processing time for more recent timestamps in dashboard
          // passData.timestamp = when Node-RED processed the frame (more recent)
          // entry.passing.time = when vehicle actually passed (older by ~4 minutes)
          timestamp: new Date(passData.timestamp),
          laneNumber: entry.lane?.number || 0,
          crossSectionPosition: entry.crossSection?.position || 0,
          crossSectionSpeed: entry.crossSection?.speed || 0,
          headwayTime: entry.crossSection?.headwayTime || 0,
          occupancyDuration: entry.passing?.occupancyDuration || 0,
          occupancyStatus: entry.passing?.occupancyStatus || 'Unknown',
          vehicleType,
          processedAt: new Date(),
          source: 'passdata_subscriber'
        };
      }).filter(doc => doc !== null);

      if (documents.length > 0) {
        // Use insertMany with ordered:false to continue on duplicates
        try {
          const result = await collection.insertMany(documents, { ordered: false });
          console.log(`💾 Wrote ${result.insertedCount} PassData entries to MongoDB for device: ${deviceId}`);

          // Update last processed timestamp to the newest entry's timestamp
          const timestamps = documents.map(doc => doc.timestamp);
          const latestTimestamp = new Date(Math.max(...timestamps.map(t => t.getTime())));
          this.lastProcessedTimestamp.set(deviceId, latestTimestamp);

        } catch (insertError: any) {
          // Handle partial success with duplicate key errors
          if (insertError.code === 11000 || insertError.writeErrors) {
            const insertedCount = insertError.result?.insertedCount || 0;
            if (insertedCount > 0) {
              console.log(`💾 Wrote ${insertedCount} PassData entries to MongoDB for device: ${deviceId} (${documents.length - insertedCount} duplicates skipped)`);

              // Still update timestamp even with duplicates
              const timestamps = documents.map(doc => doc.timestamp);
              const latestTimestamp = new Date(Math.max(...timestamps.map(t => t.getTime())));
              this.lastProcessedTimestamp.set(deviceId, latestTimestamp);
            } else {
              console.log(`📝 All ${documents.length} PassData entries already exist in MongoDB for ${deviceId}`);
            }
          } else {
            throw insertError;
          }
        }
      }

    } catch (error: any) {
      // Ignore duplicate key errors (E11000)
      if (error.code !== 11000) {
        console.error('❌ Error writing to MongoDB:', error);
      }
    }
  }


  /**
   * Check if subscriber is running
   */
  public isSubscriberRunning(): boolean {
    return this.isRunning;
  }
}

export default PassDataSubscriber;
