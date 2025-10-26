#!/usr/bin/env node

const { createClient } = require('redis');

async function generateRedisPassData() {
  try {
    console.log('🚀 Generating fresh PassData in Redis with current timestamps...');

    // Connect to Redis
    const redis = createClient({
      socket: {
        host: '192.168.6.22',
        port: 6379
      }
    });

    redis.on('error', (err) => console.error('Redis Error:', err));

    await redis.connect();
    await redis.ping();
    console.log('✅ Connected to Redis');

    // Clear existing PassData for test device
    const existingCount = await redis.lLen('test/PassData');
    console.log(`📊 Existing PassData entries: ${existingCount}`);

    // Delete existing data
    await redis.del('test/PassData');
    console.log('🗑️  Cleared existing PassData');

    // Generate fresh PassData with current timestamps
    const vehicleTypes = ['car', 'suv', 'truck', 'motorcycle', 'van'];
    const lanes = [11, 12, 13];
    const now = new Date();
    const entries = [];

    // Generate 100 records over the last 2 hours with 15-minute intervals
    for (let timeOffset = 0; timeOffset < 8; timeOffset++) {
      const slotTime = new Date(now.getTime() - (timeOffset * 15 * 60 * 1000));

      // Generate 10-15 vehicles per time slot
      const vehiclesInSlot = Math.floor(Math.random() * 6) + 10;

      for (let v = 0; v < vehiclesInSlot; v++) {
        const vehicleTime = new Date(slotTime.getTime() + Math.random() * 15 * 60 * 1000);
        const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        const speed = Math.random() * 40 + 20; // 20-60 km/h

        const passDataEntry = {
          timestamp: vehicleTime.toISOString(),
          deviceId: 'test',
          entries: [
            {
              vehicleType: {
                code: vehicleType === 'car' ? 6 : vehicleType === 'suv' ? 7 : vehicleType === 'truck' ? 8 : vehicleType === 'motorcycle' ? 4 : 9,
                name: vehicleType,
                category: vehicleType
              },
              lane: {
                number: lane
              },
              crossSection: {
                position: Math.random() * 50,
                speed: speed,
                headwayTime: Math.random() * 5
              },
              passing: {
                time: vehicleTime.toISOString(),
                occupancyDuration: Math.random() * 3,
                occupancyStatus: Math.random() > 0.5 ? 'Exiting' : 'Entering'
              }
            }
          ]
        };

        entries.push(passDataEntry);
      }
    }

    // Sort entries by timestamp (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Push to Redis (LPUSH adds to head of list)
    for (const entry of entries) {
      await redis.lPush('test/PassData', JSON.stringify(entry));
    }

    console.log(`✅ Generated ${entries.length} fresh PassData entries`);
    console.log(`📅 Time range: ${entries[entries.length - 1].timestamp} to ${entries[0].timestamp}`);

    // Verify
    const newCount = await redis.lLen('test/PassData');
    console.log(`✅ Total PassData entries in Redis: ${newCount}`);

    // Sample first entry
    const sample = await redis.lIndex('test/PassData', 0);
    console.log('📝 Sample entry:', JSON.parse(sample));

    await redis.disconnect();
    console.log('✅ Done! PassData ready for Redis poller');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateRedisPassData();
