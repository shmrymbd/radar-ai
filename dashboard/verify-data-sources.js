const redis = require('redis');
const { MongoClient } = require('mongodb');

/**
 * Verify all data sources are using the correct PassData key
 */
async function verifyDataSources() {
  console.log('🔍 Verifying Data Sources...\n');

  // 1. Redis verification
  console.log('1️⃣ Redis PassData Keys:');
  const redisClient = redis.createClient({
    socket: { host: '192.168.6.22', port: 6379 }
  });
  await redisClient.connect();

  const lowercaseCount = await redisClient.lLen('test/passdata');
  const capitalCount = await redisClient.lLen('test/PassData');

  console.log(`   test/passdata (lowercase): ${lowercaseCount} entries`);
  console.log(`   test/PassData (capital P): ${capitalCount} entries`);

  if (capitalCount > 0) {
    const latest = await redisClient.lRange('test/PassData', 0, 2);
    console.log(`   Latest entry from test/PassData:`);
    const entry = JSON.parse(latest[0]);
    console.log(`     Timestamp: ${entry.timestamp}`);
    console.log(`     Vehicles: ${entry.entries.length}`);
    console.log(`     First vehicle: ${entry.entries[0].vehicleType.name} on Lane ${entry.entries[0].lane.number}`);
  }

  await redisClient.quit();
  console.log('');

  // 2. MongoDB verification
  console.log('2️⃣ MongoDB passdata Collection:');
  const uri = 'mongodb://admin:admin123@192.168.6.22:27017/traffic_signal_dashboard?authSource=admin';
  const mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  const db = mongoClient.db('traffic_signal_dashboard');

  const mongoCount = await db.collection('passdata').countDocuments({ deviceId: 'test' });
  console.log(`   Total documents: ${mongoCount}`);

  if (mongoCount > 0) {
    const latest = await db.collection('passdata')
      .find({ deviceId: 'test' })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    console.log(`   Latest entry:`);
    console.log(`     Timestamp: ${latest[0].timestamp}`);
    console.log(`     Vehicle: ${latest[0].vehicleType} on Lane ${latest[0].laneNumber}`);
    console.log(`     Speed: ${latest[0].crossSectionSpeed.toFixed(2)} km/h`);
  }

  await mongoClient.close();
  console.log('');

  // 3. API endpoint verification
  console.log('3️⃣ API Endpoint Test:');
  console.log('   Testing: http://localhost:3000/api/classification/vehicles?deviceId=test&limit=3');

  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/classification/vehicles?deviceId=test&limit=3',
    method: 'GET'
  };

  const apiData = await new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });

  if (apiData.success) {
    console.log(`   Total vehicles: ${apiData.data.pagination.totalCount}`);
    console.log(`   Latest 3 vehicles from API:`);
    apiData.data.vehicles.forEach((v, i) => {
      console.log(`     ${i+1}. ${v.timestamp} - ${v.vehicleType} on Lane ${v.laneNumber}`);
    });
  } else {
    console.log(`   ❌ API Error: ${apiData.error}`);
  }

  console.log('');
  console.log('✅ Verification Complete!');
  console.log('');
  console.log('Summary:');
  console.log(`  - Redis test/PassData (capital P): ${capitalCount} entries ✅`);
  console.log(`  - Redis test/passdata (lowercase): ${lowercaseCount} entries ${lowercaseCount > 0 ? '⚠️ Old data' : ''}`);
  console.log(`  - MongoDB passdata collection: ${mongoCount} documents ✅`);
  console.log(`  - API returning recent data: ${apiData.success ? '✅' : '❌'}`);
}

// Run verification
verifyDataSources().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
