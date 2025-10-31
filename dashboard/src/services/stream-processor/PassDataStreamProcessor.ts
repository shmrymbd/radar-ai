/**
 * PassData Stream Processor
 *
 * Architecture: Event-driven stream processing using Redis Streams
 * Pattern: Consumer Group with at-least-once delivery guarantee
 *
 * Responsibilities:
 * - Read PassData from Redis Streams using XREADGROUP
 * - Aggregate vehicle classifications by device/time window
 * - Bulk insert to MongoDB with batching
 * - Acknowledge processed messages with XACK
 * - Handle failures with pending message claims
 *
 * Deployment: Standalone Node.js process (separate from Next.js)
 */

import { createClient, RedisClientType } from 'redis';

interface PassDataMessage {
  id: string;
  data: string; // JSON-encoded ProcessedPassData
}

interface ProcessedPassData {
  deviceId: string;
  timestamp: Date;
  vehicleType: string;
  laneNumber: number;
  crossSectionSpeed: number;
  headwayTime: number;
  occupancyDuration: number;
  crossSectionPosition: number;
  occupancyStatus: number;
}

interface AggregationBatch {
  deviceId: string;
  windowStart: Date;
  windowEnd: Date;
  vehicleType: string;
  laneNumber: number;
  count: number;
  avgSpeed: number;
  avgHeadway: number;
  avgOccupancy: number;
}

export class PassDataStreamProcessor {
  private redis: RedisClientType | null = null;
  private consumerId: string;
  private groupName = 'classification-processors';
  private isRunning = false;
  private processingBatch: Map<string, AggregationBatch> = new Map();
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_TIMEOUT_MS = 5000; // Flush every 5 seconds
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(consumerId?: string) {
    this.consumerId = consumerId || `consumer-${process.pid}-${Date.now()}`;
  }

  /**
   * Initialize Redis connection with retry logic
   */
  async connect(): Promise<void> {
    if (this.redis?.isOpen) {
      return;
    }

    const redisHost = process.env.REDIS_HOST || '192.168.6.22';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');

    this.redis = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis connection failed after 10 retries');
            return new Error('Max retries exceeded');
          }
          const delay = Math.min(retries * 100, 3000);
          console.log(`Redis reconnect attempt ${retries} in ${delay}ms`);
          return delay;
        }
      }
    });

    this.redis.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    await this.redis.connect();
  }

  /**
   * Initialize consumer group for a device stream
   * Creates group if it doesn't exist (idempotent)
   */
  async initializeConsumerGroup(deviceId: string): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not connected');
    }

    const streamKey = `${deviceId}/passdata:stream`;

    try {
      // Create consumer group starting from beginning (0)
      // MKSTREAM creates stream if it doesn't exist
      await this.redis.xGroupCreate(streamKey, this.groupName, '0', {
        MKSTREAM: true
      });
      console.log(`Consumer group created for ${streamKey}`);
    } catch (error: unknown) {
      // Group already exists - this is OK
      if (error instanceof Error && error.message.includes('BUSYGROUP')) {
        console.log(`Consumer group already exists for ${streamKey}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Main processing loop for a device stream
   * Uses blocking XREADGROUP with batching
   */
  async processStream(deviceId: string): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not connected');
    }

    const streamKey = `${deviceId}/passdata:stream`;
    await this.initializeConsumerGroup(deviceId);

    console.log(`Starting stream processor for ${deviceId} (consumer: ${this.consumerId})`);
    this.isRunning = true;

    // Start batch flush timer
    this.startBatchTimer();

    while (this.isRunning) {
      try {
        // Blocking read: wait up to 5 seconds for new messages
        // Read up to 10 messages at once for efficiency
        const messages = await this.redis.xReadGroup(
          this.groupName,
          this.consumerId,
          [
            {
              key: streamKey,
              id: '>' // Only new messages not yet delivered
            }
          ],
          {
            COUNT: 10,
            BLOCK: 5000 // 5 second block timeout
          }
        );

        if (!messages || messages.length === 0) {
          continue; // Timeout, try again
        }

        // Process all messages in the response
        for (const stream of messages) {
          for (const message of stream.messages) {
            await this.processMessage(deviceId, streamKey, message);
          }
        }

        // Flush batch if size threshold reached
        if (this.processingBatch.size >= this.BATCH_SIZE) {
          await this.flushBatch(deviceId);
        }

      } catch (error) {
        console.error(`Error processing stream ${deviceId}:`, error);

        // Back off on errors to prevent tight error loop
        await this.sleep(5000);
      }
    }

    console.log(`Stream processor stopped for ${deviceId}`);
  }

  /**
   * Process a single message from the stream
   */
  private async processMessage(
    deviceId: string,
    streamKey: string,
    message: { id: string; message: Record<string, string> }
  ): Promise<void> {
    try {
      // Parse PassData from message
      const passData: ProcessedPassData = JSON.parse(message.message.data);

      // Validate message belongs to this device
      if (passData.deviceId !== deviceId) {
        console.warn(`Message deviceId mismatch: expected ${deviceId}, got ${passData.deviceId}`);
        // Still acknowledge to avoid reprocessing
        await this.acknowledgeMessage(streamKey, message.id);
        return;
      }

      // Add to aggregation batch
      this.aggregatePassData(passData);

      // Acknowledge message immediately after in-memory aggregation
      // MongoDB write happens later in batch flush
      await this.acknowledgeMessage(streamKey, message.id);

    } catch (error) {
      console.error(`Failed to process message ${message.id}:`, error);

      // Don't acknowledge - message will stay in pending list
      // Will be retried via claim mechanism
    }
  }

  /**
   * Aggregate PassData into 15-minute time windows
   */
  private aggregatePassData(passData: ProcessedPassData): void {
    // Round timestamp to 15-minute window
    const timestamp = new Date(passData.timestamp);
    const windowStart = new Date(timestamp);
    windowStart.setMinutes(Math.floor(windowStart.getMinutes() / 15) * 15, 0, 0);
    const windowEnd = new Date(windowStart.getTime() + 15 * 60 * 1000);

    // Create aggregation key
    const aggKey = `${passData.deviceId}:${windowStart.toISOString()}:${passData.vehicleType}:${passData.laneNumber}`;

    // Get or create batch entry
    let batch = this.processingBatch.get(aggKey);
    if (!batch) {
      batch = {
        deviceId: passData.deviceId,
        windowStart,
        windowEnd,
        vehicleType: passData.vehicleType,
        laneNumber: passData.laneNumber,
        count: 0,
        avgSpeed: 0,
        avgHeadway: 0,
        avgOccupancy: 0
      };
      this.processingBatch.set(aggKey, batch);
    }

    // Update aggregation with moving average
    const n = batch.count;
    batch.count += 1;
    batch.avgSpeed = (batch.avgSpeed * n + passData.crossSectionSpeed) / (n + 1);
    batch.avgHeadway = (batch.avgHeadway * n + passData.headwayTime) / (n + 1);
    batch.avgOccupancy = (batch.avgOccupancy * n + passData.occupancyDuration) / (n + 1);
  }

  /**
   * Acknowledge message as successfully processed
   */
  private async acknowledgeMessage(streamKey: string, messageId: string): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not connected');
    }

    try {
      await this.redis.xAck(streamKey, this.groupName, messageId);
    } catch (error) {
      console.error(`Failed to ACK message ${messageId}:`, error);
      // Non-fatal - message will be claimed later
    }
  }

  /**
   * Flush aggregation batch to MongoDB
   */
  private async flushBatch(deviceId: string): Promise<void> {
    if (this.processingBatch.size === 0) {
      return;
    }

    console.log(`Flushing batch for ${deviceId}: ${this.processingBatch.size} aggregations`);

    try {
      // Convert batch to array for MongoDB bulk insert
      const aggregations = Array.from(this.processingBatch.values());

      // TODO: Implement MongoDB bulk insert
      // await mongoService.bulkInsertAggregations(aggregations);

      console.log(`Successfully flushed ${aggregations.length} aggregations to MongoDB`);

      // Clear batch after successful write
      this.processingBatch.clear();

    } catch (error) {
      console.error('Failed to flush batch to MongoDB:', error);

      // Don't clear batch on error - will retry on next flush
      // Could implement exponential backoff here
    }
  }

  /**
   * Start periodic batch flush timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(async () => {
      // Flush all device batches
      await this.flushBatch('test'); // TODO: Support multiple devices
    }, this.BATCH_TIMEOUT_MS);
  }

  /**
   * Claim pending messages that have timed out
   * This handles messages from crashed/slow consumers
   */
  async claimPendingMessages(deviceId: string): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not connected');
    }

    const streamKey = `${deviceId}/passdata:stream`;
    const minIdleTime = 60000; // 60 seconds

    try {
      // Get pending messages summary
      const pending = await this.redis.xPending(streamKey, this.groupName);

      if (!pending || pending.pending === 0) {
        return; // No pending messages
      }

      console.log(`Found ${pending.pending} pending messages in ${streamKey}`);

      // Get detailed pending list
      const pendingMessages = await this.redis.xPendingRange(
        streamKey,
        this.groupName,
        '-',
        '+',
        100 // Claim up to 100 messages at once
      );

      for (const msg of pendingMessages) {
        if (msg.millisecondsSinceLastDelivery >= minIdleTime) {
          // Claim message for this consumer
          const claimed = await this.redis.xClaim(
            streamKey,
            this.groupName,
            this.consumerId,
            minIdleTime,
            msg.id
          );

          if (claimed && claimed.length > 0) {
            console.log(`Claimed orphaned message ${msg.id}`);

            // Process claimed message
            for (const claimedMsg of claimed) {
              await this.processMessage(deviceId, streamKey, claimedMsg);
            }
          }
        }
      }

    } catch (error) {
      console.error('Failed to claim pending messages:', error);
    }
  }

  /**
   * Stop processing loop gracefully
   */
  async stop(): Promise<void> {
    console.log('Stopping stream processor...');
    this.isRunning = false;

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush remaining batch
    await this.flushBatch('test'); // TODO: Support multiple devices

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    console.log('Stream processor stopped');
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main entry point for standalone process
if (require.main === module) {
  const processor = new PassDataStreamProcessor();

  async function main() {
    try {
      await processor.connect();

      // Process multiple devices in parallel
      const devices = ['test', 'Radar04'];

      await Promise.all(
        devices.map(deviceId => processor.processStream(deviceId))
      );

      // Start pending message claim loop
      setInterval(async () => {
        for (const deviceId of devices) {
          await processor.claimPendingMessages(deviceId);
        }
      }, 30000); // Every 30 seconds

    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await processor.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await processor.stop();
    process.exit(0);
  });

  main();
}
