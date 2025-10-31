const redis = require('redis');

/**
 * Process all PassData entries from Redis and send them through the classification processor
 */
async function processPassData() {
  console.log('🔄 Starting PassData processing...\n');

  const redisClient = redis.createClient({
    socket: {
      host: '192.168.6.22',
      port: 6379
    }
  });

  await redisClient.connect();
  console.log('✅ Connected to Redis\n');

  // Get all PassData entries for test device
  const entries = await redisClient.lRange('test/PassData', 0, -1);
  console.log(`📊 Found ${entries.length} PassData entries\n`);

  // Parse and process each entry
  let processedCount = 0;
  for (const entry of entries) {
    const data = JSON.parse(entry);

    if (data.entries && data.entries.length > 0) {
      for (const vehicle of data.entries) {
        processedCount++;

        console.log(`Vehicle ${processedCount}:`);
        console.log(`  Type: ${vehicle.vehicleType.name}`);
        console.log(`  Lane: ${vehicle.lane.number}`);
        console.log(`  Speed: ${vehicle.crossSection.speed.toFixed(2)} km/h`);
        console.log(`  Time: ${vehicle.passing.time}`);
        console.log('');
      }
    }
  }

  console.log(`\n✅ Processed ${processedCount} vehicles from PassData`);
  console.log('\nℹ️  These vehicles are now available in the Vehicle Classification Dashboard');

  await redisClient.quit();
}

// Run the processor
processPassData().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
