#!/usr/bin/env node
/**
 * Radar Stream Producer - Dual Write Adapter
 *
 * Purpose: Migrates existing radar data pipeline from LPUSH to XADD (Redis Streams)
 * while maintaining backward compatibility with legacy consumers
 *
 * Architecture Pattern: Dual Write
 * - Writes to both old format (LPUSH) and new format (XADD)
 * - Allows gradual migration without breaking existing systems
 * - Can be removed once all consumers migrate to streams
 *
 * Usage:
 *   node radar-stream-producer.js --device test --rate 1000
 *
 * Environment:
 *   REDIS_HOST - Redis server (default: 192.168.6.22)
 *   REDIS_PORT - Redis port (default: 6379)
 */

const redis = require('redis');

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || '192.168.6.22';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Vehicle types from ClairWav-T80 protocol
const VEHICLE_TYPES = {
  1: 'Motorcycle',
  2: 'Car',
  3: 'Van',
  4: 'Small Truck',
  5: 'Large Truck',
  6: 'Bus',
  7: 'Container Truck'
};

// Lane configuration
const LANES = [11, 12, 13];

/**
 * Generate realistic PassData (0x05) packet
 */
function generatePassData(deviceId) {
  const vehicleTypeCode = Math.floor(Math.random() * 7) + 1;
  const laneNumber = LANES[Math.floor(Math.random() * LANES.length)];
  const timestamp = Date.now();

  return {
    deviceId,
    vehicleType: vehicleTypeCode,
    laneNumber,
    crossSectionSpeed: Math.floor(Math.random() * 40) + 30, // 30-70 km/h
    crossSectionPosition: Math.floor(Math.random() * 200), // 0-200 cm
    occupancyStatus: Math.random() > 0.5 ? 1 : 0,
    headwayTime: Math.random() * 5 + 1, // 1-6 seconds
    occupancyDuration: Math.random() * 2 + 0.5, // 0.5-2.5 seconds
    timestamp
  };
}

/**
 * Dual Write: LPUSH (legacy) + XADD (new)
 */
async function publishPassData(client, deviceId, passData) {
  const listKey = `${deviceId}/PassData`;
  const streamKey = `${deviceId}:PassData:stream`;

  try {
    // Legacy format: LPUSH with JSON string
    const jsonData = JSON.stringify(passData);
    await client.lPush(listKey, jsonData);
    await client.lTrim(listKey, 0, 999); // Keep last 1000 entries

    // New format: XADD to stream
    await client.xAdd(streamKey, '*', {
      vehicleType: passData.vehicleType.toString(),
      laneNumber: passData.laneNumber.toString(),
      crossSectionSpeed: passData.crossSectionSpeed.toString(),
      crossSectionPosition: passData.crossSectionPosition.toString(),
      occupancyStatus: passData.occupancyStatus.toString(),
      headwayTime: passData.headwayTime.toString(),
      occupancyDuration: passData.occupancyDuration.toString(),
      timestamp: passData.timestamp.toString()
    });

    // Trim stream to prevent unbounded growth (keep last 1 hour or 10k messages)
    await client.xTrim(streamKey, 'MAXLEN', '~', 10000);

    return true;
  } catch (error) {
    console.error(`[Producer] Error publishing PassData:`, error);
    return false;
  }
}

/**
 * Main producer loop
 */
async function startProducer(deviceId, intervalMs) {
  console.log(`[Producer] Starting for device: ${deviceId}`);
  console.log(`[Producer] Publishing rate: ${intervalMs}ms (${1000 / intervalMs} msg/sec)`);
  console.log(`[Producer] Redis: ${REDIS_HOST}:${REDIS_PORT}`);

  // Create Redis client
  const client = redis.createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('[Producer] Max reconnection attempts reached');
          process.exit(1);
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  client.on('error', (err) => {
    console.error('[Producer] Redis error:', err);
  });

  client.on('connect', () => {
    console.log('[Producer] Redis connected');
  });

  await client.connect();

  // Verify stream key exists (create if needed)
  const streamKey = `${deviceId}:PassData:stream`;
  const streamExists = await client.exists(streamKey);
  if (!streamExists) {
    console.log(`[Producer] Creating new stream: ${streamKey}`);
  }

  // Statistics
  let messagesSent = 0;
  let lastReportTime = Date.now();
  let lastReportCount = 0;

  // Publish loop
  const interval = setInterval(async () => {
    const passData = generatePassData(deviceId);
    const success = await publishPassData(client, deviceId, passData);

    if (success) {
      messagesSent++;

      // Log sample message every 10 messages
      if (messagesSent % 10 === 0) {
        const vehicleTypeName = VEHICLE_TYPES[passData.vehicleType] || 'Unknown';
        console.log(`[Producer] Sent #${messagesSent}: ${vehicleTypeName} on lane ${passData.laneNumber} @ ${passData.crossSectionSpeed} km/h`);
      }

      // Report throughput every 10 seconds
      const now = Date.now();
      if (now - lastReportTime >= 10000) {
        const messagesInPeriod = messagesSent - lastReportCount;
        const throughput = messagesInPeriod / 10;
        console.log(`[Producer] Throughput: ${throughput.toFixed(2)} msg/sec (total: ${messagesSent})`);
        lastReportTime = now;
        lastReportCount = messagesSent;
      }
    }
  }, intervalMs);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Producer] Shutting down...');
    clearInterval(interval);
    await client.quit();
    console.log(`[Producer] Total messages sent: ${messagesSent}`);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Parse command line arguments
const args = process.argv.slice(2);
let deviceId = 'test';
let intervalMs = 1000;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--device' && args[i + 1]) {
    deviceId = args[i + 1];
    i++;
  } else if (args[i] === '--rate' && args[i + 1]) {
    intervalMs = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--help') {
    console.log(`
Radar Stream Producer - Dual Write Adapter

Usage:
  node radar-stream-producer.js [options]

Options:
  --device <id>   Device ID (default: test)
  --rate <ms>     Message interval in milliseconds (default: 1000)
  --help          Show this help

Examples:
  node radar-stream-producer.js --device test --rate 1000
  node radar-stream-producer.js --device Radar04 --rate 500

Environment:
  REDIS_HOST      Redis server (default: 192.168.6.22)
  REDIS_PORT      Redis port (default: 6379)
`);
    process.exit(0);
  }
}

// Start producer
startProducer(deviceId, intervalMs).catch((error) => {
  console.error('[Producer] Fatal error:', error);
  process.exit(1);
});
