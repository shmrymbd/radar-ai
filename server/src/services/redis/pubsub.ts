/**
 * Redis Pub/Sub Service for Real-time PassData Events
 *
 * This service subscribes to Redis pub/sub channels for PassData events
 * and broadcasts them to the classification processor and WebSocket clients.
 */

import { createClient, RedisClientType } from 'redis';
import { connectToDatabase } from '../../config/mongodb';
import { VEHICLE_TYPE_MAP } from '../../types/classification';
import { getRedisClient } from '../../config/redis';
import { ProcessedPassData } from '../../types/radar';
import { createLogger } from '../../utils/logger';
import { config } from '../../config/env';

const logger = createLogger('redis-pubsub');

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
type ObjectDataCallback = (deviceId: string, data: any) => void;

export class RedisPubSubService {
  private static instance: RedisPubSubService;
  private subscriber: RedisClientType | null = null;
  private isConnected: boolean = false;
  private messageCallbacks: Set<MessageCallback> = new Set();
  private objectDataCallbacks: Set<ObjectDataCallback> = new Set();
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
      logger.info('Redis pub/sub already connected');
      return;
    }

    try {
      // Create dedicated subscriber client
      this.subscriber = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis pub/sub: Max reconnection attempts reached');
              return new Error('Max reconnection attempts');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.info('Redis pub/sub reconnecting', { delay, attempt: retries });
            return delay;
          },
        },
      });

      // Set up event handlers
      this.subscriber.on('error', (err) => {
        logger.error('Redis pub/sub error', { error: err.message });
      });

      this.subscriber.on('reconnecting', () => {
        logger.info('Redis pub/sub reconnecting...');
      });

      this.subscriber.on('ready', () => {
        logger.info('Redis pub/sub client ready');
        this.isConnected = true;
      });

      // Connect to Redis
      await this.subscriber.connect();
      logger.info('Redis pub/sub subscriber connected');
    } catch (error) {
      logger.error('Failed to initialize Redis pub/sub', { error });
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
      logger.info('Already subscribed to PassData', { pattern });
      return;
    }

    try {
      // Use pSubscribe for pattern matching (keyspace notifications)
      await this.subscriber!.pSubscribe(pattern, async (message, channel) => {
        // message will be "lpush", "rpush", etc.
        if (message === 'lpush' || message === 'rpush') {
          logger.debug('Keyspace notification received', { message, channel });

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
      logger.info('Subscribed to PassData keyspace notifications', { pattern });
    } catch (error) {
      logger.error('Failed to subscribe to PassData', { pattern, error });
      throw error;
    }
  }

  /**
   * Subscribe to ObjectData channel for a specific device
   * Uses keyspace notifications triggered by LPUSH operations on objectdata keys
   */
  public async subscribeToObjectData(deviceId: string): Promise<void> {
    if (!this.subscriber || !this.isConnected) {
      await this.initialize();
    }

    // Use keyspace notification pattern (triggered by LPUSH operations)
    const pattern = `__keyspace@0__:${deviceId}/objectdata`;

    if (this.subscribedChannels.has(pattern)) {
      logger.info('Already subscribed to ObjectData', { pattern });
      return;
    }

    try {
      // Use pSubscribe for pattern matching (keyspace notifications)
      await this.subscriber!.pSubscribe(pattern, async (message, channel) => {
        // message will be "lpush", "rpush", etc.
        if (message === 'lpush' || message === 'rpush') {
          logger.debug('ObjectData keyspace notification received', { message, channel });

          // Fetch the latest data from Redis
          const redis = await getRedisClient();
          const latestData = await redis.lRange(`${deviceId}/objectdata`, -1, -1);

          if (latestData.length > 0) {
            try {
              const parsedData = JSON.parse(latestData[0]);
              this.handleObjectDataMessage(deviceId, parsedData);
            } catch (error) {
              logger.error('Error parsing ObjectData', { deviceId, error });
            }
          }
        }
      });

      this.subscribedChannels.add(pattern);
      logger.info('Subscribed to ObjectData keyspace notifications', { pattern });
    } catch (error) {
      logger.error('Failed to subscribe to ObjectData', { pattern, error });
      throw error;
    }
  }

  /**
   * Handle incoming ObjectData message from pub/sub
   */
  private async handleObjectDataMessage(deviceId: string, data: any): Promise<void> {
    try {
      const numVehicles = data.numEntries || 0;
      logger.debug('Received ObjectData', { deviceId, numVehicles });

      // Notify all registered callbacks (WebSocket broadcasting for tracking)
      this.objectDataCallbacks.forEach((callback) => {
        try {
          callback(deviceId, data);
        } catch (err) {
          logger.error('Error in ObjectData callback', { error: err });
        }
      });
    } catch (error) {
      logger.error('Error handling ObjectData message', { error });
    }
  }

  /**
   * Register a callback for ObjectData messages
   */
  public onObjectDataMessage(callback: ObjectDataCallback): void {
    this.objectDataCallbacks.add(callback);
  }

  /**
   * Unregister an ObjectData callback
   */
  public removeObjectDataCallback(callback: ObjectDataCallback): void {
    this.objectDataCallbacks.delete(callback);
  }

  /**
   * Subscribe to multiple device channels
   */
  public async subscribeToMultipleDevices(deviceIds: string[]): Promise<void> {
    await Promise.all(deviceIds.map((deviceId) => this.subscribeToPassData(deviceId)));
  }

  /**
   * Handle incoming PassData message from pub/sub
   * Writes directly to MongoDB only - no in-memory cache
   */
  private async handlePassDataMessage(deviceId: string, message: string): Promise<void> {
    try {
      const data: PassDataMessage = JSON.parse(message);

      logger.debug('Received PassData', { deviceId, numEntries: data.entries.length });

      // Write directly to MongoDB for Classification Dashboard
      await this.writePassDataToMongoDB(deviceId, data);

      // Notify all registered callbacks (WebSocket broadcasting)
      this.messageCallbacks.forEach((callback) => {
        try {
          callback(deviceId, data);
        } catch (err) {
          logger.error('Error in message callback', { error: err });
        }
      });
    } catch (error) {
      logger.error('Error parsing PassData message', { error });
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
        source: 'redis_pubsub',
      }));

      // Insert into MongoDB with ordered: false to continue on duplicates
      if (documents.length > 0) {
        try {
          const result = await collection.insertMany(documents, { ordered: false });
          logger.info('Written PassData to MongoDB', {
            deviceId,
            insertedCount: result.insertedCount,
          });
        } catch (error: any) {
          // Handle duplicate key errors gracefully
          if (error.code === 11000 && error.writeErrors) {
            const insertedCount = error.result?.insertedCount || 0;
            const duplicateCount = error.writeErrors.length;

            if (insertedCount > 0) {
              logger.info('Written PassData to MongoDB (with duplicates)', {
                deviceId,
                insertedCount,
                duplicatesSkipped: duplicateCount,
              });
            } else {
              logger.debug('All PassData entries already exist in MongoDB', {
                deviceId,
                duplicateCount,
              });
            }
          } else {
            // Re-throw non-duplicate errors
            throw error;
          }
        }
      }
    } catch (error) {
      logger.error('Error writing PassData to MongoDB', { deviceId, error });
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

    // Match the pattern used in subscribeToPassData
    const pattern = `__keyspace@0__:${deviceId}/passdata`;

    if (!this.subscribedChannels.has(pattern)) {
      return;
    }

    try {
      // Use pUnsubscribe for pattern subscriptions (pSubscribe)
      await this.subscriber.pUnsubscribe(pattern);
      this.subscribedChannels.delete(pattern);
      logger.info('Unsubscribed from PassData keyspace notifications', { pattern });
    } catch (error) {
      logger.error('Failed to unsubscribe', { pattern, error });
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
      callbackCount: this.messageCallbacks.size,
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
      logger.info('Redis pub/sub disconnected');
    }
  }
}

// Export singleton instance getter
export const getRedisPubSubService = () => RedisPubSubService.getInstance();
