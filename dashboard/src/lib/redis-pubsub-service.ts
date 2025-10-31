/**
 * Redis Pub/Sub Service for Real-time PassData Events
 *
 * This service subscribes to Redis pub/sub channels for PassData events
 * and broadcasts them to the classification processor and WebSocket clients.
 */

import { createClient, RedisClientType } from 'redis';
import { connectToDatabase } from './mongodb';
import { VEHICLE_TYPE_MAP } from '@/types/classification';
import { getRedisClient } from './redis';
import { ProcessedPassData } from '@/types/radar';
import { getClassificationRedisCache } from './classification-redis-cache';

interface PassDataEntry {
  entryIndex: number;
  lane: {
    number: number;
    description: string;
  };
  crossSection: {
    position: number;
    speed: number;
    headwayTime: number;
    isValid: boolean;
  };
  passing: {
    time: string;
    timestampMs: number;
    occupancyDuration: number;
    occupancyStatus: string;
  };
  vehicleType: {
    code: number;
    name: string;
    category: string;
  };
}

interface PassDataMessage {
  frameType: string;
  frameTypeName: string;
  deviceId: string;
  timestamp: string;
  numEntries: number;
  entriesDecoded: number;
  entries: PassDataEntry[];
}

type MessageCallback = (deviceId: string, data: PassDataMessage) => void;

export class RedisPubSubService {
  private static instance: RedisPubSubService;
  private subscriber: RedisClientType | null = null;
  private isConnected: boolean = false;
  private messageCallbacks: Set<MessageCallback> = new Set();
  private subscribedChannels: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): RedisPubSubService {
    if (!RedisPubSubService.instance) {
      RedisPubSubService.instance = new RedisPubSubService();
    }
    return RedisPubSubService.instance;
  }

  /**
   * Initialize Redis pub/sub connection
   */
  public async initialize(): Promise<void> {
    if (this.isConnected) {
      console.log('📡 Redis pub/sub already connected');
      return;
    }

    try {
      // Create dedicated subscriber client
      this.subscriber = createClient({
        socket: {
          host: process.env.REDIS_HOST || '192.168.6.22',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis pub/sub: Max reconnection attempts reached');
              return new Error('Max reconnection attempts');
            }
            const delay = Math.min(retries * 100, 3000);
            console.log(`🔄 Redis pub/sub reconnecting in ${delay}ms (attempt ${retries}/10)`);
            return delay;
          }
        }
      });

      // Set up event handlers
      this.subscriber.on('error', (err) => {
        console.error('❌ Redis pub/sub error:', err.message);
      });

      this.subscriber.on('reconnecting', () => {
        console.log('🔄 Redis pub/sub reconnecting...');
      });

      this.subscriber.on('ready', () => {
        console.log('✅ Redis pub/sub client ready');
        this.isConnected = true;
      });

      // Connect to Redis
      await this.subscriber.connect();
      console.log('✅ Redis pub/sub subscriber connected');

    } catch (error) {
      console.error('❌ Failed to initialize Redis pub/sub:', error);
      throw error;
    }
  }

  /**
   * Subscribe to PassData channel for a specific device
   * Uses keyspace notifications instead of explicit pub/sub channels
   */
  public async subscribeToPassData(deviceId: string): Promise<void> {
    if (!this.subscriber || !this.isConnected) {
      await this.initialize();
    }

    // Use keyspace notification pattern (triggered by LPUSH operations)
    const pattern = `__keyspace@0__:${deviceId}/passdata`;

    if (this.subscribedChannels.has(pattern)) {
      console.log(`📡 Already subscribed to ${pattern}`);
      return;
    }

    try {
      // Use pSubscribe for pattern matching (keyspace notifications)
      await this.subscriber!.pSubscribe(pattern, async (message, channel) => {
        // message will be "lpush", "rpush", etc.
        // channel will be "__keyspace@0__:test/passdata"
        if (message === 'lpush' || message === 'rpush') {
          console.log(`🔔 Keyspace notification: ${message} on ${channel}`);

          // Fetch the latest data from Redis
          const redis = await getRedisClient();
          const latestData = await redis.lRange(`${deviceId}/passdata`, -1, -1);

          if (latestData.length > 0) {
            const parsedData = JSON.parse(latestData[0]);
            this.handlePassDataMessage(deviceId, JSON.stringify(parsedData));
          }
        }
      });

      this.subscribedChannels.add(pattern);
      console.log(`✅ Subscribed to keyspace notifications: ${pattern}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to multiple device channels
   */
  public async subscribeToMultipleDevices(deviceIds: string[]): Promise<void> {
    await Promise.all(deviceIds.map(deviceId => this.subscribeToPassData(deviceId)));
  }

  /**
   * Handle incoming PassData message from pub/sub
   * Writes directly to MongoDB only - no in-memory cache
   */
  private async handlePassDataMessage(deviceId: string, message: string): Promise<void> {
    try {
      const data: PassDataMessage = JSON.parse(message);

      // Log received message
      console.log(`📨 Received PassData for ${deviceId}: ${data.entries.length} vehicles`);

      // Write directly to MongoDB for Classification Dashboard
      await this.writePassDataToMongoDB(deviceId, data);

      // Notify all registered callbacks (WebSocket broadcasting)
      this.messageCallbacks.forEach(callback => {
        try {
          callback(deviceId, data);
        } catch (err) {
          console.error('❌ Error in message callback:', err);
        }
      });

    } catch (error) {
      console.error('❌ Error parsing PassData message:', error);
    }
  }

  /**
   * Write PassData to MongoDB immediately for Classification Dashboard
   */
  private async writePassDataToMongoDB(deviceId: string, data: PassDataMessage): Promise<void> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection('passdata');

      // Prepare documents for MongoDB
      const documents = data.entries.map((entry: PassDataEntry) => ({
        deviceId,
        // Use frame processing time for more recent timestamps
        // data.timestamp = when Node-RED processed the frame (more recent)
        // entry.passing.time = when vehicle actually passed (older by ~4 minutes)
        timestamp: new Date(data.timestamp),
        vehicleType: VEHICLE_TYPE_MAP[entry.vehicleType.code as keyof typeof VEHICLE_TYPE_MAP] || 'other',
        laneNumber: entry.lane.number,
        crossSectionSpeed: entry.crossSection.speed,
        crossSectionPosition: entry.crossSection.position,
        headwayTime: entry.crossSection.headwayTime,
        occupancyDuration: entry.passing.occupancyDuration,
        occupancyStatus: entry.passing.occupancyStatus,
        processedAt: new Date(),
        source: 'redis_pubsub'
      }));

      // Insert into MongoDB with ordered: false to continue on duplicates
      if (documents.length > 0) {
        try {
          const result = await collection.insertMany(documents, { ordered: false });
          console.log(`✅ Written ${result.insertedCount} PassData entries to MongoDB for ${deviceId}`);
        } catch (error: any) {
          // Handle duplicate key errors gracefully
          if (error.code === 11000 && error.writeErrors) {
            // Count successful inserts (duplicates are expected and ok)
            const insertedCount = error.result?.insertedCount || 0;
            const duplicateCount = error.writeErrors.length;

            if (insertedCount > 0) {
              console.log(`✅ Written ${insertedCount} new PassData entries to MongoDB for ${deviceId} (${duplicateCount} duplicates skipped)`);
            } else {
              // All were duplicates - this is fine, just debug log
              console.debug(`📝 All ${duplicateCount} PassData entries already exist in MongoDB for ${deviceId}`);
            }
          } else {
            // Re-throw non-duplicate errors
            throw error;
          }
        }
      }

    } catch (error) {
      console.error(`❌ Error writing PassData to MongoDB for ${deviceId}:`, error);
      // Don't throw - let the processing continue even if MongoDB write fails
    }
  }

  /**
   * Register a callback for PassData messages
   */
  public onMessage(callback: MessageCallback): void {
    this.messageCallbacks.add(callback);
  }

  /**
   * Unregister a callback
   */
  public removeCallback(callback: MessageCallback): void {
    this.messageCallbacks.delete(callback);
  }

  /**
   * Unsubscribe from a channel
   */
  public async unsubscribe(deviceId: string): Promise<void> {
    if (!this.subscriber || !this.isConnected) {
      return;
    }

    const channel = `${deviceId}/passdata:new`; // Use lowercase to match actual Redis key

    if (!this.subscribedChannels.has(channel)) {
      return;
    }

    try {
      await this.subscriber.unsubscribe(channel);
      this.subscribedChannels.delete(channel);
      console.log(`✅ Unsubscribed from ${channel}`);
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from ${channel}:`, error);
    }
  }

  /**
   * Get subscription status
   */
  public getStatus(): {
    isConnected: boolean;
    subscribedChannels: string[];
    callbackCount: number;
  } {
    return {
      isConnected: this.isConnected,
      subscribedChannels: Array.from(this.subscribedChannels),
      callbackCount: this.messageCallbacks.size
    };
  }

  /**
   * Disconnect from Redis pub/sub
   */
  public async disconnect(): Promise<void> {
    if (this.subscriber && this.isConnected) {
      await this.subscriber.quit();
      this.isConnected = false;
      this.subscribedChannels.clear();
      console.log('✅ Redis pub/sub disconnected');
    }
  }
}

// Export singleton instance getter
export const getRedisPubSubService = () => RedisPubSubService.getInstance();
