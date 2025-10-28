/**
 * PassData Stream Processor using Redis Streams
 *
 * Architecture: Event-driven pipeline with at-least-once delivery guarantees
 * Pattern: Consumer Group with automatic load balancing
 *
 * Key Features:
 * - Horizontal scalability (multiple workers in same consumer group)
 * - Delivery guarantees with XACK acknowledgment
 * - Automatic failure recovery with pending message tracking
 * - Circuit breaker for MongoDB failures
 * - Dead letter stream for permanent failures
 * - Graceful shutdown with message completion
 */

import { createClient, RedisClientType } from 'redis';
import { connectToDatabase } from './mongodb';
import type { ProcessedPassData } from '@/types/classification';
import { VEHICLE_TYPE_MAP } from '@/types/classification';

interface StreamMessage {
  id: string;
  message: Record<string, string>;
}

interface ProcessorConfig {
  redisHost: string;
  redisPort: number;
  consumerGroup: string;
  consumerId: string;
  batchSize: number;
  blockTime: number; // milliseconds
  maxRetries: number;
  retryBackoff: number; // milliseconds
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number; // milliseconds
}

interface ProcessingMetrics {
  messagesProcessed: number;
  messagesAcknowledged: number;
  messagesFailed: number;
  batchesProcessed: number;
  mongoWriteErrors: number;
  lastProcessedAt: Date | null;
  isCircuitBreakerOpen: boolean;
}

export class PassDataStreamProcessor {
  private static instance: PassDataStreamProcessor | null = null;

  private redis: RedisClientType | null = null;
  private isRunning = false;
  private shouldStop = false;
  private config: ProcessorConfig;
  private metrics: ProcessingMetrics;
  private circuitBreakerFailures = 0;
  private circuitBreakerOpenUntil: Date | null = null;

  private constructor(config?: Partial<ProcessorConfig>) {
    this.config = {
      redisHost: process.env.REDIS_HOST || '192.168.1.71',
      redisPort: parseInt(process.env.REDIS_PORT || '6379'),
      consumerGroup: 'classification-workers',
      consumerId: `worker-${process.pid}-${Date.now()}`,
      batchSize: 50,
      blockTime: 1000,
      maxRetries: 3,
      retryBackoff: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      ...config
    };

    this.metrics = {
      messagesProcessed: 0,
      messagesAcknowledged: 0,
      messagesFailed: 0,
      batchesProcessed: 0,
      mongoWriteErrors: 0,
      lastProcessedAt: null,
      isCircuitBreakerOpen: false
    };
  }

  public static getInstance(config?: Partial<ProcessorConfig>): PassDataStreamProcessor {
    if (!PassDataStreamProcessor.instance) {
      PassDataStreamProcessor.instance = new PassDataStreamProcessor(config);
    }
    return PassDataStreamProcessor.instance;
  }

  /**
   * Initialize Redis connection and consumer group
   */
  private async initialize(deviceId: string): Promise<void> {
    // Create Redis client
    this.redis = createClient({
      socket: {
        host: this.config.redisHost,
        port: this.config.redisPort,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[PassDataStreamProcessor] Max reconnection attempts reached');
            return new Error('Max reconnection attempts');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.redis.on('error', (err) => {
      console.error('[PassDataStreamProcessor] Redis error:', err);
    });

    await this.redis.connect();
    console.log('[PassDataStreamProcessor] Redis connected');

    const streamKey = this.getStreamKey(deviceId);

    // Create consumer group (idempotent - BUSYGROUP error is OK)
    try {
      await this.redis.xGroupCreate(streamKey, this.config.consumerGroup, '$', {
        MKSTREAM: true
      });
      console.log(`[PassDataStreamProcessor] Consumer group created: ${this.config.consumerGroup}`);
    } catch (error: any) {
      if (error.message && error.message.includes('BUSYGROUP')) {
        console.log(`[PassDataStreamProcessor] Consumer group already exists: ${this.config.consumerGroup}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Start processing stream for a device
   */
  public async start(deviceId: string = 'P1-center'): Promise<void> {
    if (this.isRunning) {
      console.warn('[PassDataStreamProcessor] Already running');
      return;
    }

    console.log(`[PassDataStreamProcessor] Starting for device: ${deviceId}`);
    await this.initialize(deviceId);

    this.isRunning = true;
    this.shouldStop = false;

    // Main processing loop
    while (!this.shouldStop && this.redis) {
      try {
        // Check circuit breaker
        if (this.isCircuitBreakerOpen()) {
          console.warn('[PassDataStreamProcessor] Circuit breaker open, waiting...');
          await this.sleep(5000);
          continue;
        }

        // Read messages from stream
        const messages = await this.readMessages(deviceId);

        if (messages && messages.length > 0) {
          await this.processMessages(deviceId, messages);
        }

      } catch (error) {
        console.error('[PassDataStreamProcessor] Processing error:', error);
        await this.sleep(1000);
      }
    }

    console.log('[PassDataStreamProcessor] Stopped');
    this.isRunning = false;
  }

  /**
   * Stop processor gracefully
   */
  public async stop(): Promise<void> {
    console.log('[PassDataStreamProcessor] Stopping...');
    this.shouldStop = true;

    // Wait for current batch to complete (max 10 seconds)
    const maxWait = 10000;
    const startTime = Date.now();
    while (this.isRunning && (Date.now() - startTime) < maxWait) {
      await this.sleep(100);
    }

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    console.log('[PassDataStreamProcessor] Stopped gracefully');
  }

  /**
   * Read messages from Redis Stream using consumer group
   */
  private async readMessages(deviceId: string): Promise<StreamMessage[]> {
    if (!this.redis) return [];

    const streamKey = this.getStreamKey(deviceId);

    try {
      // XREADGROUP BLOCK <blockTime> COUNT <batchSize> STREAMS <streamKey> >
      const result = await this.redis.xReadGroup(
        this.config.consumerGroup,
        this.config.consumerId,
        [
          {
            key: streamKey,
            id: '>' // Read only new messages
          }
        ],
        {
          COUNT: this.config.batchSize,
          BLOCK: this.config.blockTime
        }
      );

      if (!result || result.length === 0) {
        return [];
      }

      // Extract messages from result
      const streamData = result[0];
      return streamData.messages.map((msg: any) => ({
        id: msg.id,
        message: msg.message
      }));

    } catch (error) {
      console.error('[PassDataStreamProcessor] Error reading from stream:', error);
      return [];
    }
  }

  /**
   * Process batch of messages and write to MongoDB
   */
  private async processMessages(deviceId: string, messages: StreamMessage[]): Promise<void> {
    const streamKey = this.getStreamKey(deviceId);
    const processedData: ProcessedPassData[] = [];
    const messageIds: string[] = [];

    // Parse and validate messages
    for (const msg of messages) {
      try {
        const passData = this.parsePassDataMessage(msg.message, deviceId);
        processedData.push(passData);
        messageIds.push(msg.id);
      } catch (error) {
        console.error('[PassDataStreamProcessor] Failed to parse message:', msg.id, error);
        // Move to dead letter stream
        await this.moveToDeadLetter(deviceId, msg);
        // Still acknowledge to remove from pending
        if (this.redis) {
          await this.redis.xAck(streamKey, this.config.consumerGroup, msg.id);
        }
      }
    }

    if (processedData.length === 0) {
      return;
    }

    // Write to MongoDB with retry logic
    let retryCount = 0;
    let success = false;

    while (retryCount < this.config.maxRetries && !success) {
      try {
        await this.writeToMongoDB(processedData);
        success = true;
        this.circuitBreakerFailures = 0; // Reset on success

      } catch (error) {
        retryCount++;
        this.metrics.mongoWriteErrors++;
        console.error(`[PassDataStreamProcessor] MongoDB write failed (attempt ${retryCount}/${this.config.maxRetries}):`, error);

        if (retryCount < this.config.maxRetries) {
          await this.sleep(this.config.retryBackoff * retryCount);
        } else {
          // Open circuit breaker
          this.circuitBreakerFailures++;
          if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
            this.openCircuitBreaker();
          }
          // Move messages to dead letter stream
          for (const msg of messages) {
            await this.moveToDeadLetter(deviceId, msg);
          }
        }
      }
    }

    // Acknowledge messages if write succeeded
    if (success && this.redis) {
      try {
        await this.redis.xAck(streamKey, this.config.consumerGroup, messageIds);
        this.metrics.messagesAcknowledged += messageIds.length;
        this.metrics.messagesProcessed += messageIds.length;
        this.metrics.batchesProcessed++;
        this.metrics.lastProcessedAt = new Date();

      } catch (error) {
        console.error('[PassDataStreamProcessor] Error acknowledging messages:', error);
      }
    }
  }

  /**
   * Parse Redis Stream message to ProcessedPassData
   */
  private parsePassDataMessage(message: Record<string, string>, deviceId: string): ProcessedPassData {
    // Extract fields from stream message
    const vehicleTypeCode = parseInt(message.vehicleType || '0');
    const vehicleType = VEHICLE_TYPE_MAP[vehicleTypeCode] || 'Unknown';

    return {
      deviceId,
      vehicleType,
      timestamp: new Date(parseInt(message.timestamp)),
      laneNumber: parseInt(message.laneNumber || '0'),
      crossSectionSpeed: parseFloat(message.crossSectionSpeed || '0'),
      crossSectionPosition: parseInt(message.crossSectionPosition || '0'),
      occupancyStatus: parseInt(message.occupancyStatus || '0'),
      headwayTime: parseFloat(message.headwayTime || '0'),
      occupancyDuration: parseFloat(message.occupancyDuration || '0')
    };
  }

  /**
   * Write batch to MongoDB
   */
  private async writeToMongoDB(data: ProcessedPassData[]): Promise<void> {
    const db = await connectToDatabase();
    const collection = db.collection('passdata_events');

    // Insert batch
    await collection.insertMany(data, { ordered: false });

    console.log(`[PassDataStreamProcessor] Wrote ${data.length} events to MongoDB`);
  }

  /**
   * Move failed message to dead letter stream
   */
  private async moveToDeadLetter(deviceId: string, message: StreamMessage): Promise<void> {
    if (!this.redis) return;

    // Use consistent Redis key pattern for dead letter stream
    const deadLetterKey = `${deviceId}/passdata:dead_letter`;

    try {
      await this.redis.xAdd(deadLetterKey, '*', {
        ...message.message,
        original_id: message.id,
        failed_at: Date.now().toString(),
        error: 'Processing failed after max retries'
      });

      console.warn(`[PassDataStreamProcessor] Moved message to dead letter: ${message.id}`);
      this.metrics.messagesFailed++;

    } catch (error) {
      console.error('[PassDataStreamProcessor] Failed to move to dead letter:', error);
    }
  }

  /**
   * Circuit breaker management
   */
  private isCircuitBreakerOpen(): boolean {
    if (this.circuitBreakerOpenUntil && new Date() < this.circuitBreakerOpenUntil) {
      this.metrics.isCircuitBreakerOpen = true;
      return true;
    }
    this.metrics.isCircuitBreakerOpen = false;
    this.circuitBreakerOpenUntil = null;
    return false;
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpenUntil = new Date(Date.now() + this.config.circuitBreakerTimeout);
    console.error('[PassDataStreamProcessor] Circuit breaker OPEN until', this.circuitBreakerOpenUntil);
  }

  /**
   * Get processing metrics
   */
  public getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pending messages count
   */
  public async getPendingCount(deviceId: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const streamKey = this.getStreamKey(deviceId);
      const pending = await this.redis.xPending(streamKey, this.config.consumerGroup);
      return pending ? pending.pending : 0;
    } catch (error) {
      console.error('[PassDataStreamProcessor] Error getting pending count:', error);
      return 0;
    }
  }

  /**
   * Reclaim stuck messages (for crashed workers)
   */
  public async reclaimStuckMessages(deviceId: string, minIdleTime: number = 60000): Promise<void> {
    if (!this.redis) return;

    try {
      const streamKey = this.getStreamKey(deviceId);

      // Get pending messages
      const pending = await this.redis.xPending(streamKey, this.config.consumerGroup);

      if (!pending || pending.pending === 0) {
        return;
      }

      // Get detailed pending info
      const pendingDetails = await this.redis.xPending(
        streamKey,
        this.config.consumerGroup,
        '-',
        '+',
        100
      );

      if (!Array.isArray(pendingDetails)) {
        return;
      }

      // Claim messages idle for > minIdleTime
      for (const msg of pendingDetails) {
        if (msg.millisecondsSinceLastDelivery > minIdleTime) {
          await this.redis.xClaim(
            streamKey,
            this.config.consumerGroup,
            this.config.consumerId,
            minIdleTime,
            msg.id
          );
          console.log(`[PassDataStreamProcessor] Reclaimed stuck message: ${msg.id}`);
        }
      }

    } catch (error) {
      console.error('[PassDataStreamProcessor] Error reclaiming stuck messages:', error);
    }
  }

  /**
   * Helper methods
   */
  /**
   * Generate Redis stream key using consistent pattern
   * Pattern: deviceId/passdata:stream (lowercase, slash separator)
   */
  private getStreamKey(deviceId: string): string {
    return `${deviceId}/passdata:stream`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown handler
   */
  public static async gracefulShutdown(): Promise<void> {
    if (PassDataStreamProcessor.instance) {
      await PassDataStreamProcessor.instance.stop();
      PassDataStreamProcessor.instance = null;
    }
  }
}

// Graceful shutdown on process termination
process.on('SIGTERM', () => {
  console.log('[PassDataStreamProcessor] SIGTERM received, shutting down...');
  PassDataStreamProcessor.gracefulShutdown();
});

process.on('SIGINT', () => {
  console.log('[PassDataStreamProcessor] SIGINT received, shutting down...');
  PassDataStreamProcessor.gracefulShutdown();
});
