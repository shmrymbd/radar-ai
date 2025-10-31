/**
 * Import PassData from Redis to MongoDB
 * This script processes existing Redis PassData and imports it into MongoDB
 * with proper timestamps and structure for the new architecture.
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('redis');
const { MongoClient } = require('mongodb');

// Vehicle type mapping
const VEHICLE_TYPE_MAP = {
  1: 'motorcycle',
  2: 'car',
  3: 'van',
  4: 'light_truck',
  5: 'heavy_truck',
  6: 'bus',
  7: 'other'
};

async function importPassDataToMongoDB() {
  console.log('🚀 Starting PassData import from Redis to MongoDB...\n');

  // Connect to Redis
  const redis = createClient({
    socket: {
      host: process.env.REDIS_HOST || '192.168.6.22',
      port: parseInt(process.env.REDIS_PORT || '6379')
    }
  });

  await redis.connect();
  console.log('✅ Connected to Redis\n');

  // Connect to MongoDB
  const mongoUri = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DASHBOARD_DATABASE}?authSource=${process.env.MONGODB_AUTH_DATABASE}`;
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db(process.env.MONGODB_DASHBOARD_DATABASE);
  const collection = db.collection('passdata');
  console.log('✅ Connected to MongoDB\n');

  // Scan for all device PassData keys
  const deviceIds = [];
  for await (const key of redis.scanIterator({ MATCH: '*/passdata' })) {
    const keyString = String(key);
    const deviceId = keyString.replace('/passdata', '');
    deviceIds.push(deviceId);
  }

  console.log(`📡 Found ${deviceIds.length} devices with PassData:\n`);
  deviceIds.forEach(id => console.log(`   - ${id}`));
  console.log('');

  let totalImported = 0;
  let totalErrors = 0;

  // Process each device
  for (const deviceId of deviceIds) {
    console.log(`\n📊 Processing device: ${deviceId}`);

    const key = `${deviceId}/passdata`;
    const count = await redis.lLen(key);
    console.log(`   Redis entries: ${count}`);

    if (count === 0) {
      console.log('   ⚠️  No data to import');
      continue;
    }

    // Get latest 1000 entries (or all if less than 1000)
    const limit = Math.min(count, 1000);
    const entries = await redis.lRange(key, -limit, -1);
    console.log(`   Importing latest ${entries.length} entries...`);

    const documents = [];
    let errors = 0;

    for (const entry of entries) {
      try {
        const data = JSON.parse(entry);

        // Process each entry in the PassData message
        if (data.entries && Array.isArray(data.entries)) {
          for (const passEntry of data.entries) {
            // Map vehicle type code to string
            const vehicleTypeCode = passEntry.vehicleType?.code || passEntry.vehicleType;
            const vehicleType = VEHICLE_TYPE_MAP[vehicleTypeCode] || 'other';

            const doc = {
              deviceId,
              timestamp: new Date(passEntry.passing?.time || data.timestamp),
              vehicleType,
              laneNumber: passEntry.lane?.number || 0,
              crossSectionSpeed: passEntry.crossSection?.speed || 0,
              crossSectionPosition: passEntry.crossSection?.position || 0,
              headwayTime: passEntry.crossSection?.headwayTime || 0,
              occupancyDuration: passEntry.passing?.occupancyDuration || 0,
              occupancyStatus: passEntry.passing?.occupancyStatus || 'Unknown',
              processedAt: new Date(),
              source: 'redis_import'
            };

            documents.push(doc);
          }
        }
      } catch (error) {
        errors++;
        if (errors <= 3) {
          console.log(`   ⚠️  Error parsing entry: ${error.message}`);
        }
      }
    }

    if (documents.length > 0) {
      try {
        await collection.insertMany(documents, { ordered: false });
        console.log(`   ✅ Imported ${documents.length} documents`);
        totalImported += documents.length;
      } catch (error) {
        console.log(`   ❌ MongoDB insert error: ${error.message}`);
        totalErrors++;
      }
    }

    if (errors > 3) {
      console.log(`   ⚠️  Total parsing errors: ${errors}`);
      totalErrors += errors;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Import Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Total documents imported: ${totalImported}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(`📊 Devices processed: ${deviceIds.length}`);

  // Verify data in MongoDB
  const totalDocs = await collection.countDocuments();
  console.log(`\n📦 Total documents in MongoDB: ${totalDocs}`);

  // Show breakdown by device
  console.log('\n📊 Documents per device:');
  const pipeline = [
    { $group: { _id: '$deviceId', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ];
  const breakdown = await collection.aggregate(pipeline).toArray();
  breakdown.forEach(item => {
    console.log(`   ${item._id}: ${item.count} documents`);
  });

  // Cleanup
  await redis.quit();
  await mongoClient.close();

  console.log('\n✅ Import completed!\n');
}

// Run the import
importPassDataToMongoDB().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
