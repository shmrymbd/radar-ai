#!/usr/bin/env node

/**
 * Bulk Import ALL PassData from Redis to MongoDB
 *
 * This script transfers ALL historical PassData entries from Redis to MongoDB
 * in batches, handling duplicates gracefully.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('redis');
const { MongoClient } = require('mongodb');

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || '192.168.6.22';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const BATCH_SIZE = 1000; // Process 1000 entries at a time
const DEVICES = ['P1-center', 'P3', 'P1-o/h']; // All devices to import

// MongoDB connection
const MONGODB_URI = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DASHBOARD_DATABASE}?authSource=${process.env.MONGODB_AUTH_DATABASE}`;

// Vehicle type mapping from radar protocol
const VEHICLE_TYPE_MAP = {
  1: 'motorcycle',
  2: 'car',
  3: 'van',
  4: 'small_truck',
  5: 'large_truck',
  6: 'extra_large_truck',
  7: 'mini_truck',
  8: 'bicycle',
  9: 'tricycle',
  10: 'pedestrian',
  11: 'suitcase',
  12: 'nothing',
  13: 'suv',
  14: 'mpv',
  15: 'bus',
  16: 'other'
};

async function bulkImport() {
  console.log('\n🚀 Starting BULK import of ALL PassData from Redis to MongoDB...\n');

  // Connect to Redis
  const redis = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT
    }
  });

  await redis.connect();
  console.log('✅ Connected to Redis\n');

  // Connect to MongoDB
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db(process.env.MONGODB_DASHBOARD_DATABASE);
  const collection = db.collection('passdata');
  console.log('✅ Connected to MongoDB\n');

  let totalImported = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;

  // Process each device
  for (const deviceId of DEVICES) {
    const redisKey = `${deviceId}/passdata`;

    console.log(`📊 Processing device: ${deviceId}`);
    console.log(`   Redis key: ${redisKey}`);

    // Get total count in Redis
    const totalCount = await redis.lLen(redisKey);
    console.log(`   Total entries in Redis: ${totalCount}`);

    if (totalCount === 0) {
      console.log('   ⚠️  No data to import\n');
      continue;
    }

    // Get current count in MongoDB
    const mongoCount = await collection.countDocuments({ deviceId });
    console.log(`   Current entries in MongoDB: ${mongoCount}`);
    console.log(`   Missing entries: ${totalCount - mongoCount}\n`);

    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    // Process in batches from oldest (index 0) to newest (index -1)
    for (let start = 0; start < totalCount; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, totalCount - 1);

      // Fetch batch from Redis
      const batch = await redis.lRange(redisKey, start, end);

      if (batch.length === 0) {
        break;
      }

      // Parse and transform PassData entries
      const documents = [];

      for (const entry of batch) {
        try {
          const passData = JSON.parse(entry);

          // Process each vehicle entry
          if (passData.entries && Array.isArray(passData.entries)) {
            for (const vehicle of passData.entries) {
              documents.push({
                deviceId,
                // Use frame timestamp (when Node-RED processed) for consistency
                // NOT vehicle.passing.time (vehicle passing time - older by ~4 minutes)
                timestamp: new Date(passData.timestamp),
                vehicleType: VEHICLE_TYPE_MAP[vehicle.vehicleType.code] || 'other',
                laneNumber: vehicle.lane.number,
                crossSectionSpeed: vehicle.crossSection.speed,
                crossSectionPosition: vehicle.crossSection.position,
                headwayTime: vehicle.crossSection.headwayTime,
                occupancyDuration: vehicle.passing.occupancyDuration,
                occupancyStatus: vehicle.passing.occupancyStatus,
                processedAt: new Date(),
                source: 'bulk_import'
              });
            }
          }
        } catch (err) {
          console.error(`   ⚠️  Error parsing entry: ${err.message}`);
          errors++;
        }
      }

      // Insert batch into MongoDB with ordered: false
      if (documents.length > 0) {
        try {
          const result = await collection.insertMany(documents, { ordered: false });
          imported += result.insertedCount;

          // Show progress
          const progress = Math.round((end / totalCount) * 100);
          process.stdout.write(`\r   Progress: ${progress}% (${imported} new, ${duplicates} duplicates, ${errors} errors)    `);
        } catch (err) {
          if (err.code === 11000) {
            // Duplicate key errors
            const insertedCount = err.result?.insertedCount || 0;
            const duplicateCount = err.writeErrors?.length || 0;

            imported += insertedCount;
            duplicates += duplicateCount;

            const progress = Math.round((end / totalCount) * 100);
            process.stdout.write(`\r   Progress: ${progress}% (${imported} new, ${duplicates} duplicates, ${errors} errors)    `);
          } else {
            console.error(`\n   ❌ Error inserting batch: ${err.message}`);
            errors++;
          }
        }
      }
    }

    console.log(`\n   ✅ Completed: ${imported} imported, ${duplicates} duplicates, ${errors} errors\n`);

    totalImported += imported;
    totalDuplicates += duplicates;
    totalErrors += errors;
  }

  // Final verification
  console.log('\n============================================================');
  console.log('📈 BULK IMPORT SUMMARY:');
  console.log('============================================================');
  console.log(`✅ Total documents imported: ${totalImported}`);
  console.log(`📝 Total duplicates skipped: ${totalDuplicates}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log('');

  // Show final counts per device
  console.log('📊 Final MongoDB counts per device:');
  for (const deviceId of DEVICES) {
    const count = await collection.countDocuments({ deviceId });
    const redisCount = await redis.lLen(`${deviceId}/passdata`);
    const coverage = redisCount > 0 ? Math.round((count / redisCount) * 100) : 0;
    console.log(`   ${deviceId}: ${count} documents (${coverage}% of Redis data)`);
  }

  console.log('\n✅ Bulk import completed!\n');

  await redis.quit();
  await mongoClient.close();
}

// Run the bulk import
bulkImport().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
