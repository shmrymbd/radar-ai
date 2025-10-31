const WebSocket = require('ws');
const redis = require('redis');

// Test WebSocket connection and pub/sub integration
async function testPubSubIntegration() {
  console.log('🧪 Starting Pub/Sub Integration Test...\n');

  // 1. Connect to WebSocket server
  console.log('1️⃣ Connecting to WebSocket server (ws://localhost:8080)...');
  const ws = new WebSocket('ws://localhost:8080');

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('✅ WebSocket connected\n');
      resolve();
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
  });

  // 2. Subscribe to device 'test'
  console.log('2️⃣ Subscribing to device "test"...');
  ws.send(JSON.stringify({
    type: 'subscribe_device',
    deviceId: 'test'
  }));

  // Wait for subscription confirmation
  await new Promise((resolve) => {
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log(`📨 Received: ${message.type}`);
      if (message.type === 'device_subscription_confirmed') {
        console.log('✅ Device subscription confirmed\n');
        resolve();
      }
    });
  });

  // Wait a moment for pub/sub subscription to establish
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Check Redis pub/sub subscribers
  console.log('3️⃣ Checking Redis pub/sub subscribers...');
  const redisClient = redis.createClient({
    socket: {
      host: '192.168.6.22',
      port: 6379
    }
  });
  await redisClient.connect();

  const numSub = await redisClient.sendCommand(['PUBSUB', 'NUMSUB', 'test/PassData:new']); // FIXED: Capital P
  console.log(`📊 Subscribers to test/PassData:new: ${numSub[1]}`);
  
  if (numSub[1] > 0) {
    console.log('✅ Pub/sub subscription active!\n');
  } else {
    console.log('❌ No pub/sub subscribers found\n');
  }

  // 4. Publish test PassData message
  console.log('4️⃣ Publishing test PassData message...');
  const testPassData = {
    frameType: '0x05',
    frameTypeName: 'PassData',
    deviceId: 'test',
    timestamp: new Date().toISOString(),
    numEntries: 1,
    entriesDecoded: 1,
    entries: [{
      entryIndex: 0,
      lane: {
        number: 11,
        description: 'Lane 11'
      },
      crossSection: {
        position: 150.5,
        speed: 60,
        headwayTime: 2.5,
        isValid: true
      },
      passing: {
        time: new Date().toISOString(),
        timestampMs: Date.now(),
        occupancyDuration: 1500,
        occupancyStatus: 'OCCUPIED'
      },
      vehicleType: {
        code: 1,
        name: 'Car',
        category: 'passenger'
      }
    }]
  };

  const publisher = redis.createClient({
    socket: {
      host: '192.168.6.22',
      port: 6379
    }
  });
  await publisher.connect();

  await publisher.publish('test/PassData:new', JSON.stringify(testPassData)); // FIXED: Capital P
  console.log('✅ Test message published to test/PassData:new\n');

  // 5. Wait for WebSocket message
  console.log('5️⃣ Waiting for WebSocket broadcast...');
  const receivedMessage = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for passdata_update message'));
    }, 5000);

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'passdata_update') {
        clearTimeout(timeout);
        resolve(message);
      }
    });
  });

  console.log('✅ Received passdata_update via WebSocket!');
  console.log('📦 Message data:', JSON.stringify(receivedMessage, null, 2));

  // Cleanup
  ws.close();
  await redisClient.quit();
  await publisher.quit();

  console.log('\n🎉 Pub/Sub integration test PASSED!');
}

// Run test
testPubSubIntegration().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
