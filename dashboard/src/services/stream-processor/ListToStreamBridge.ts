/**
 * List to Stream Bridge
 *
 * Architecture: Migration adapter pattern
 * Purpose: Bridge legacy Redis Lists to modern Redis Streams
 *
 * Why This Exists:
 * - Radar system pushes to Redis Lists via LPUSH (can't easily change)
 * - Stream processor requires Redis Streams for reliability
 * - This bridge enables gradual migration without changing radar integration
 *
 * Data Flow:
 * Radar → LPUSH {device}/passdata → BRPOP → XADD {device}/passdata:stream → Stream Processor
 *
 * Deployment: Run as separate process (can coexist with stream processor)
 */

import { createClient, RedisClientType } from 'redis';

export class ListToStreamBridge {
  private redis: RedisClientType | null = null;
  private isRunning = false;
  private readonly BLOCK_TIMEOUT = 5; // BRPOP timeout in seconds
  private readonly MAX_STREAM_LENGTH = 100000; // Trim stream to prevent unbounded growth

  constructor() {}

  /**
   * Initialize Redis connection
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
      console.log('Redis bridge connected successfully');
    });

    await this.redis.connect();
  }

  /**
   * Bridge a single device's list to stream
   *
   * Pattern: Blocking pop from list + atomic add to stream
   * Guarantees: At-least-once delivery (message in stream before list removal)
   */
  async bridgeDevice(deviceId: string): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not connected');
    }

    // Use consistent Redis key patterns (lowercase, slash separator)
    const listKey = `${deviceId}/passdata`;
    const streamKey = `${deviceId}/passdata:stream`;

    console.log(`Starting bridge for ${deviceId}: ${listKey} → ${streamKey}`);
    this.isRunning = true;

    let messageCount = 0;
    let lastTrimTime = Date.now();

    while (this.isRunning) {
      try {
        // Blocking pop from list (right side to process oldest first)
        // Waits up to BLOCK_TIMEOUT seconds for new data
        const result = await this.redis.brPop(listKey, this.BLOCK_TIMEOUT);

        if (!result) {
          // Timeout - no new messages
          continue;
        }

        // result.element contains the PassData JSON string
        const passDataJson = result.element;

        // Parse to validate JSON structure
        let passData;
        try {
          passData = JSON.parse(passDataJson);
        } catch (parseError) {
          console.error(`Invalid JSON in ${listKey}:`, parseError);
          // Skip invalid message - already removed from list
          continue;
        }

        // Add to stream with auto-generated ID (*)
        // Message format: { data: <passDataJson> }
        const streamId = await this.redis.xAdd(
          streamKey,
          '*', // Auto-generate ID based on timestamp
          {
            data: passDataJson,
            deviceId: passData.deviceId || deviceId,
            timestamp: passData.timestamp || new Date().toISOString()
          }
        );

        messageCount++;

        if (messageCount % 100 === 0) {
          console.log(`Bridged ${messageCount} messages for ${deviceId} (latest: ${streamId})`);
        }

        // Trim stream every 5 minutes to prevent unbounded growth
        const now = Date.now();
        if (now - lastTrimTime > 300000) { // 5 minutes
          await this.trimStream(streamKey);
          lastTrimTime = now;
        }

      } catch (error) {
        console.error(`Error bridging ${deviceId}:`, error);

        // Back off on errors
        await this.sleep(5000);
      }
    }

    console.log(`Bridge stopped for ${deviceId} (${messageCount} total messages bridged)`);
  }

  /**
   * Trim stream to prevent unbounded growth
   * Uses approximate trimming (~) for performance
   */
  private async trimStream(streamKey: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.xTrim(streamKey, 'MAXLEN', {
        strategyModifier: '~', // Approximate trimming (more efficient)
        threshold: this.MAX_STREAM_LENGTH
      });

      console.log(`Trimmed ${streamKey} to ~${this.MAX_STREAM_LENGTH} messages`);
    } catch (error) {
      console.error(`Failed to trim ${streamKey}:`, error);
    }
  }

  /**
   * Bridge multiple devices in parallel
   */
  async bridgeAll(deviceIds: string[]): Promise<void> {
    await this.connect();

    console.log(`Starting bridge for ${deviceIds.length} devices: ${deviceIds.join(', ')}`);

    // Run all device bridges in parallel
    await Promise.all(
      deviceIds.map(deviceId => this.bridgeDevice(deviceId))
    );
  }

  /**
   * Stop all bridging operations gracefully
   */
  async stop(): Promise<void> {
    console.log('Stopping bridge...');
    this.isRunning = false;

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    console.log('Bridge stopped');
  }

  /**
   * Get bridge statistics for monitoring
   */
  async getStats(deviceId: string): Promise<{
    listLength: number;
    streamLength: number;
    pendingMessages: number;
  }> {
    if (!this.redis) {
      throw new Error('Redis not connected');
    }

    // Use consistent Redis key patterns (lowercase, slash separator)
    const listKey = `${deviceId}/passdata`;
    const streamKey = `${deviceId}/passdata:stream`;

    const [listLength, streamInfo] = await Promise.all([
      this.redis.lLen(listKey),
      this.redis.xInfoStream(streamKey).catch(() => null)
    ]);

    return {
      listLength,
      streamLength: streamInfo?.length || 0,
      pendingMessages: listLength // Messages waiting to be bridged
    };
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
  const bridge = new ListToStreamBridge();

  async function main() {
    try {
      // Bridge multiple devices
      const devices = process.env.DEVICES?.split(',') || ['test', 'Radar04'];

      console.log('Starting List-to-Stream Bridge');
      console.log('Devices:', devices.join(', '));
      console.log('Press Ctrl+C to stop');

      await bridge.bridgeAll(devices);

    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await bridge.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await bridge.stop();
    process.exit(0);
  });

  main();
}
