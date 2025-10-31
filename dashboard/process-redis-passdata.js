/**
 * Script to manually process all PassData entries from Redis into MongoDB
 * This will read all existing PassData from Redis and write them to MongoDB
 */

const { createClient } = require('redis');
const { MongoClient } = require('mongodb');

const VEHICLE_TYPE_MAP = {
  'car': 'car',
  'van': 'van',
  'suv': 'suv',
  'truck': 'truck',
  'motorcycle': 'motorcycle',
  'bus': 'van',
  'bicycle': 'motorcycle',
  'large_truck': 'truck',
  'medium_truck': 'truck',
  'light_truck': 'truck',
  'unknown': 'car'
};

function mapVehicleType(vehicleType) {
  const normalizedType = vehicleType.toLowerCase().replace(/\s+/g, '_');
  return VEHICLE_TYPE_MAP[normalizedType] || 'car';
}

async function processAllPassData() {
  const deviceId = 'test';

  // Connect to Redis
  const redisClient = createClient({
    socket: {
      host: '192.168.6.22',
      port: 6379
    }
  });

  await redisClient.connect();
  console.log('✅ Connected to Redis');

  // Connect to MongoDB
  const mongoUri = 'mongodb://admin:admin123@192.168.6.22:27017/traffic_signal_dashboard?authSource=admin';
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  console.log('✅ Connected to MongoDB');

  const db = mongoClient.db('traffic_signal_dashboard');
  const collection = db.collection('passdata');

  try {
    // Get all PassData entries from Redis
    const passDataKey = `${deviceId}/PassData`;
    const allEntries = await redisClient.lRange(passDataKey, 0, -1);

    console.log(`\n📊 Found ${allEntries.length} PassData entries in Redis`);

    // Process each entry
    const documents = [];
    let skipped = 0;

    for (const entry of allEntries) {
      try {
        const passData = JSON.parse(entry);

        // Extract vehicle type from nested structure
        const entries = passData.entries || [];
        if (entries.length === 0) {
          skipped++;
          continue;
        }

        const firstEntry = entries[0];
        const vehicleTypeData = firstEntry.vehicleType;
        const vehicleTypeName = typeof vehicleTypeData === 'string'
          ? vehicleTypeData
          : (vehicleTypeData?.name || 'unknown');

        const vehicleType = mapVehicleType(vehicleTypeName);

        const document = {
          deviceId,
          timestamp: new Date(passData.timestamp),
          laneNumber: firstEntry.lane?.number || 0,
          crossSectionPosition: firstEntry.crossSection?.position || 0,
          crossSectionSpeed: firstEntry.crossSection?.speed || 0,
          headwayTime: firstEntry.crossSection?.headwayTime || 0,
          occupancyDuration: firstEntry.passing?.occupancyDuration || 0,
          occupancyStatus: firstEntry.passing?.occupancyStatus || 'Unknown',
          vehicleType,
          rawData: passData,
          processedAt: new Date()
        };

        documents.push(document);

      } catch (error) {
        console.error(`❌ Error processing entry:`, error.message);
        skipped++;
      }
    }

    console.log(`\n📝 Processed ${documents.length} valid entries (skipped ${skipped})`);

    if (documents.length > 0) {
      // Clear existing data first
      const deleteResult = await collection.deleteMany({ deviceId });
      console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} existing documents`);

      // Insert all documents
      const result = await collection.insertMany(documents, { ordered: false });
      console.log(`\n✅ Inserted ${result.insertedCount} documents into MongoDB`);

      // Show summary
      const summary = await collection.aggregate([
        { $match: { deviceId } },
        {
          $group: {
            _id: '$vehicleType',
            count: { $sum: 1 },
            avgSpeed: { $avg: '$crossSectionSpeed' }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();

      console.log('\n📊 Vehicle Type Summary:');
      summary.forEach((item) => {
        console.log(`   ${item._id}: ${item.count} vehicles (avg speed: ${item.avgSpeed.toFixed(1)} km/h)`);
      });
    }

  } finally {
    await redisClient.quit();
    await mongoClient.close();
    console.log('\n✅ Done!');
  }
}

processAllPassData().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
