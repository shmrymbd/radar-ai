const { MongoClient } = require('mongodb');
const { createClient } = require('redis');
require('dotenv').config({ path: '.env.local' });

const mongoUri = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DASHBOARD_DATABASE}?authSource=${process.env.MONGODB_AUTH_DATABASE}`;

async function monitor() {
  const mongoClient = new MongoClient(mongoUri);
  const redis = createClient({
    socket: {
      host: process.env.REDIS_HOST || '192.168.6.22',
      port: parseInt(process.env.REDIS_PORT || '6379')
    }
  });

  try {
    await mongoClient.connect();
    await redis.connect();

    const db = mongoClient.db(process.env.MONGODB_DASHBOARD_DATABASE);
    const collection = db.collection('passdata');

    console.log('🔍 PASSDATA MONITOR - Press Ctrl+C to stop');
    console.log('='.repeat(80));
    console.log('');

    let lastCount = await collection.countDocuments({ deviceId: 'P1-center' });
    let lastRedisLength = await redis.lLen('P1-center/passdata');

    console.log(`Initial state:`);
    console.log(`  MongoDB count: ${lastCount}`);
    console.log(`  Redis length: ${lastRedisLength}`);
    console.log('');

    setInterval(async () => {
      try {
        const currentCount = await collection.countDocuments({ deviceId: 'P1-center' });
        const latest = await collection.findOne(
          { deviceId: 'P1-center' },
          { sort: { processedAt: -1 } }
        );

        const currentRedisLength = await redis.lLen('P1-center/passdata');
        const redisLatest = await redis.lIndex('P1-center/passdata', 0);
        const redisData = redisLatest ? JSON.parse(redisLatest) : null;

        const now = new Date();
        const timestamp = now.toLocaleString('en-US', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour12: true
        });

        console.log(`[${timestamp}]`);

        if (currentRedisLength !== lastRedisLength) {
          const change = currentRedisLength - lastRedisLength;
          console.log(`  📊 Redis: ${lastRedisLength} → ${currentRedisLength} entries (${change > 0 ? '+' : ''}${change})`);
          if (redisData) {
            const redisTime = new Date(redisData.timestamp);
            const ageSeconds = (now - redisTime) / 1000;
            console.log(`     Latest: ${redisTime.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur', hour12: true })} (${ageSeconds.toFixed(0)}s old)`);
          }
        } else {
          console.log(`  📊 Redis: ${currentRedisLength} entries (no change)`);
        }

        if (currentCount !== lastCount) {
          const change = currentCount - lastCount;
          console.log(`  💾 MongoDB: ${lastCount} → ${currentCount} documents (${change > 0 ? '+' : ''}${change})`);
          if (latest) {
            const dbTime = new Date(latest.timestamp);
            const processedTime = new Date(latest.processedAt);
            const delay = (processedTime - dbTime) / 1000;
            console.log(`     Latest: ${dbTime.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur', hour12: true })}`);
            console.log(`     Delay: ${delay.toFixed(1)}s | Type: ${latest.vehicleType} | Source: ${latest.source}`);
          }
        } else {
          console.log(`  💾 MongoDB: ${currentCount} documents (no change)`);
        }

        console.log('');

        lastCount = currentCount;
        lastRedisLength = currentRedisLength;

      } catch (err) {
        console.error('Error:', err.message);
      }
    }, 3000);

  } catch (error) {
    console.error('Connection error:', error);
    process.exit(1);
  }
}

monitor().catch(console.error);
