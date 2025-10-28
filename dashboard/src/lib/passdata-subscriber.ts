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
          host: process.env.REDIS_HOST || '192.168.1.71',
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      });

      // Create separate client for data operations
      this.dataClient = createClient({
        socket: {
          host: process.env.REDIS_HOST || '192.168.1.71',
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
      // Get the latest 10 entries from the passdata list
      const entries = await this.dataClient.lRange(`${deviceId}/passdata`, -10, -1);

      return entries.map(entry => JSON.parse(entry));

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
          timestamp: new Date(passData.timestamp),
          laneNumber: entry.lane?.number || 0,
          crossSectionPosition: entry.crossSection?.position || 0,
          crossSectionSpeed: entry.crossSection?.speed || 0,
          headwayTime: entry.crossSection?.headwayTime || 0,
          occupancyDuration: entry.passing?.occupancyDuration || 0,
          occupancyStatus: entry.passing?.occupancyStatus || 'Unknown',
          vehicleType,
          // Store raw data for reference
          rawData: passData,
          processedAt: new Date()
        };
      }).filter(doc => doc !== null);

      if (documents.length > 0) {
        // Use insertMany with ordered:false to continue on duplicates
        await collection.insertMany(documents, { ordered: false });
        console.log(`💾 Wrote ${documents.length} PassData entries to MongoDB for device: ${deviceId}`);
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
