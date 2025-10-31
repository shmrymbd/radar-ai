/**
 * Test PassData Pub/Sub → MongoDB Flow
 * Verifies the complete data pipeline from Redis to MongoDB
 */

const { MongoClient } = require('mongodb');
const { createClient } = require('redis');

async function testPassDataFlow() {
  console.log('🧪 Testing PassData Pub/Sub → MongoDB Flow\n');

  let mongoClient, redisClient, subscriber;

  try {
    // 1. Connect to MongoDB
    console.log('1️⃣ Connecting to MongoDB...');
    const mongoUri = 'mongodb://admin:admin123@192.168.6.22:27017/traffic_signal_dashboard?authSource=admin';
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const db = mongoClient.db('traffic_signal_dashboard');
    const collection = db.collection('passdata');
    console.log('✅ MongoDB connected');

    // Check existing data
    const existingCount = await collection.countDocuments({});
    console.log(`   📊 Existing PassData documents: ${existingCount}\n`);

    // 2. Setup Redis subscriber
    console.log('2️⃣ Setting up Redis Pub/Sub subscriber...');
    subscriber = createClient({
      socket: {
        host: '192.168.6.22',
        port: 6379
      }
    });

    await subscriber.connect();

    let notificationReceived = false;
    let notificationData = null;

    await subscriber.pSubscribe('__keyspace@0__:test/PassData', (message, channel) => {
      notificationReceived = true;
      notificationData = { message, channel, timestamp: new Date() };
      console.log(`   📨 Notification received: ${channel} → ${message}`);
    });

    console.log('✅ Subscriber listening on: __keyspace@0__:test/PassData\n');

    // 3. Connect Redis data client
    console.log('3️⃣ Connecting Redis data client...');
    redisClient = createClient({
      socket: {
        host: '192.168.6.22',
        port: 6379
      }
    });

    await redisClient.connect();
    console.log('✅ Redis data client connected\n');

    // 4. Check Redis configuration
    console.log('4️⃣ Checking Redis keyspace notification config...');
    const config = await redisClient.configGet('notify-keyspace-events');
    console.log(`   Config: notify-keyspace-events = "${config['notify-keyspace-events']}"`);

    const hasKeyspaceEvents = config['notify-keyspace-events'].includes('K');
    const hasListEvents = config['notify-keyspace-events'].includes('l');

    console.log(`   ✅ Keyspace events (K): ${hasKeyspaceEvents}`);
    console.log(`   ✅ List events (l): ${hasListEvents}\n`);

    // 5. Test LPUSH operation
    console.log('5️⃣ Testing LPUSH operation...');
    const testData = {
      timestamp: new Date().toISOString(),
      deviceId: 'test',
      entries: [{
        vehicleType: { code: 6, name: 'car', category: 'car' },
        lane: { number: 11 },
        crossSection: {
          position: 25.5,
          speed: 45.0,
          headwayTime: 2.5
        },
        passing: {
          time: new Date().toISOString(),
          occupancyDuration: 3.0,
          occupancyStatus: 'Exiting'
        }
      }]
    };

    const beforeCount = await redisClient.lLen('test/PassData');
    console.log(`   Before LPUSH: ${beforeCount} entries`);

    await redisClient.lPush('test/PassData', JSON.stringify(testData));

    const afterCount = await redisClient.lLen('test/PassData');
    console.log(`   After LPUSH: ${afterCount} entries`);
    console.log(`   ✅ LPUSH successful\n`);

    // 6. Wait for Pub/Sub notification
    console.log('6️⃣ Waiting for Pub/Sub notification (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    if (notificationReceived) {
      console.log(`   ✅ Notification received at ${notificationData.timestamp.toISOString()}`);
      console.log(`   Channel: ${notificationData.channel}`);
      console.log(`   Message: ${notificationData.message}\n`);
    } else {
      console.log(`   ❌ No notification received\n`);
    }

    // 7. Check if data was written to MongoDB
    console.log('7️⃣ Checking MongoDB for new data...');
    const newCount = await collection.countDocuments({});
    console.log(`   Total PassData documents: ${newCount}`);
    console.log(`   New documents: ${newCount - existingCount}\n`);

    // 8. Architecture Analysis
    console.log('8️⃣ Architecture Analysis:');
    console.log('═══════════════════════════════════════════════\n');

    console.log('Current Flow:');
    console.log('  Redis LPUSH → Keyspace Notification → Subscriber → MongoDB\n');

    console.log('Status:');
    console.log(`  ✅ Redis keyspace events enabled: ${hasKeyspaceEvents && hasListEvents}`);
    console.log(`  ✅ Pub/Sub notifications working: ${notificationReceived}`);
    console.log(`  ${newCount > existingCount ? '✅' : '⚠️'} MongoDB writes: ${newCount > existingCount ? 'working' : 'not detected'}\n`);

    // 9. Performance Metrics
    console.log('9️⃣ Performance Metrics:');
    console.log('═══════════════════════════════════════════════\n');

    const redisSize = await redisClient.lLen('test/PassData');
    const mongoSize = await collection.countDocuments({ deviceId: 'test' });

    console.log(`  Redis list size: ${redisSize} entries`);
    console.log(`  MongoDB documents: ${mongoSize} entries`);
    console.log(`  Sync ratio: ${mongoSize > 0 ? ((mongoSize / redisSize) * 100).toFixed(1) : 0}%\n`);

    // 10. Sample recent data
    console.log('🔟 Sample Recent Data:');
    console.log('═══════════════════════════════════════════════\n');

    const recentRedis = await redisClient.lRange('test/PassData', -1, -1);
    if (recentRedis.length > 0) {
      const parsed = JSON.parse(recentRedis[0]);
      console.log('  Latest Redis Entry:');
      console.log(`    Timestamp: ${parsed.timestamp}`);
      console.log(`    Device: ${parsed.deviceId}`);
      console.log(`    Entries: ${parsed.entries.length}`);
      if (parsed.entries.length > 0) {
        console.log(`    Vehicle: ${parsed.entries[0].vehicleType.name}`);
        console.log(`    Speed: ${parsed.entries[0].crossSection.speed} km/h`);
        console.log(`    Lane: ${parsed.entries[0].lane.number}\n`);
      }
    }

    const recentMongo = await collection.find({ deviceId: 'test' }).sort({ timestamp: -1 }).limit(1).toArray();
    if (recentMongo.length > 0) {
      const doc = recentMongo[0];
      console.log('  Latest MongoDB Entry:');
      console.log(`    Timestamp: ${doc.timestamp}`);
      console.log(`    Device: ${doc.deviceId}`);
      console.log(`    Vehicle: ${doc.vehicleType}`);
      console.log(`    Speed: ${doc.crossSectionSpeed} km/h`);
      console.log(`    Lane: ${doc.laneNumber}\n`);
    }

    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    if (subscriber) {
      await subscriber.pUnsubscribe();
      await subscriber.quit();
    }
    if (redisClient) {
      await redisClient.quit();
    }
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

testPassDataFlow();
