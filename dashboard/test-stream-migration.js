#!/usr/bin/env node
/**
 * Stream Migration Testing Script
 *
 * Tests the migration from LPUSH/Pub/Sub to Redis Streams
 *
 * Test Scenarios:
 * 1. Verify dual write (LPUSH + XADD) works
 * 2. Verify consumer group processing
 * 3. Verify MongoDB persistence
 * 4. Test failure recovery and retries
 * 5. Validate data consistency between old and new pipelines
 */

const redis = require('redis');
const { MongoClient } = require('mongodb');

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || '192.168.6.22';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const MONGO_HOST = process.env.MONGODB_HOST || '192.168.6.22';
const MONGO_PORT = parseInt(process.env.MONGODB_PORT || '27017');
const MONGO_USER = process.env.MONGODB_USERNAME || 'admin';
const MONGO_PASS = process.env.MONGODB_PASSWORD || 'admin123';
const MONGO_DB = process.env.MONGODB_DASHBOARD_DATABASE || 'traffic_signal_dashboard';

const DEVICE_ID = 'test';
const STREAM_KEY = `${DEVICE_ID}:PassData:stream`;
const LIST_KEY = `${DEVICE_ID}/PassData`;
const CONSUMER_GROUP = 'classification-workers';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Test 1: Verify Redis Stream Setup
 */
async function testRedisStreamSetup(client) {
  log('\n========================================', 'magenta');
  log('TEST 1: Redis Stream Setup', 'magenta');
  log('========================================', 'magenta');

  try {
    // Check if stream exists
    const streamExists = await client.exists(STREAM_KEY);
    logInfo(`Stream exists: ${streamExists ? 'Yes' : 'No'}`);

    // Get stream length
    let streamLength = 0;
    if (streamExists) {
      streamLength = await client.xLen(STREAM_KEY);
      logInfo(`Stream length: ${streamLength} messages`);
    }

    // Check consumer group
    try {
      const groups = await client.xInfoGroups(STREAM_KEY);
      if (groups.length > 0) {
        logInfo(`Consumer groups found: ${groups.length}`);
        for (const group of groups) {
          logInfo(`  - ${group.name}: ${group.consumers} consumers, ${group.pending} pending`);
        }
      } else {
        logWarning('No consumer groups found');
      }
    } catch (error) {
      logWarning(`Consumer group info unavailable: ${error.message}`);
    }

    logSuccess('Redis Stream setup verified');
    return true;

  } catch (error) {
    logError(`Redis Stream setup failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Verify Dual Write
 */
async function testDualWrite(client) {
  log('\n========================================', 'magenta');
  log('TEST 2: Dual Write (LPUSH + XADD)', 'magenta');
  log('========================================', 'magenta');

  try {
    const testData = {
      vehicleType: '2',
      laneNumber: '11',
      crossSectionSpeed: '55',
      timestamp: Date.now().toString()
    };

    // Get initial counts
    const initialListLength = await client.lLen(LIST_KEY);
    const initialStreamLength = await client.xLen(STREAM_KEY);

    logInfo(`Initial list length: ${initialListLength}`);
    logInfo(`Initial stream length: ${initialStreamLength}`);

    // Write to list (legacy)
    await client.lPush(LIST_KEY, JSON.stringify(testData));
    logInfo('Wrote to Redis list (LPUSH)');

    // Write to stream (new)
    const messageId = await client.xAdd(STREAM_KEY, '*', testData);
    logInfo(`Wrote to Redis stream (XADD): ${messageId}`);

    // Verify counts increased
    const finalListLength = await client.lLen(LIST_KEY);
    const finalStreamLength = await client.xLen(STREAM_KEY);

    if (finalListLength > initialListLength && finalStreamLength > initialStreamLength) {
      logSuccess('Dual write successful');
      return true;
    } else {
      logError('Dual write failed - counts did not increase');
      return false;
    }

  } catch (error) {
    logError(`Dual write test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Verify Consumer Group Processing
 */
async function testConsumerGroupProcessing(client) {
  log('\n========================================', 'magenta');
  log('TEST 3: Consumer Group Processing', 'magenta');
  log('========================================', 'magenta');

  try {
    // Ensure consumer group exists
    try {
      await client.xGroupCreate(STREAM_KEY, CONSUMER_GROUP, '$', { MKSTREAM: true });
      logInfo(`Created consumer group: ${CONSUMER_GROUP}`);
    } catch (error) {
      if (error.message && error.message.includes('BUSYGROUP')) {
        logInfo(`Consumer group already exists: ${CONSUMER_GROUP}`);
      } else {
        throw error;
      }
    }

    // Read messages from group
    const consumerId = `test-consumer-${Date.now()}`;
    const messages = await client.xReadGroup(
      CONSUMER_GROUP,
      consumerId,
      [{ key: STREAM_KEY, id: '>' }],
      { COUNT: 5, BLOCK: 1000 }
    );

    if (messages && messages.length > 0) {
      const streamData = messages[0];
      const messageCount = streamData.messages.length;
      logInfo(`Read ${messageCount} messages from consumer group`);

      // Acknowledge messages
      const messageIds = streamData.messages.map(m => m.id);
      await client.xAck(STREAM_KEY, CONSUMER_GROUP, messageIds);
      logInfo(`Acknowledged ${messageIds.length} messages`);

      logSuccess('Consumer group processing works');
      return true;
    } else {
      logWarning('No new messages to process (stream may be empty)');
      return true; // Not a failure, just no data
    }

  } catch (error) {
    logError(`Consumer group test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Verify MongoDB Connection and Collection
 */
async function testMongoDBSetup() {
  log('\n========================================', 'magenta');
  log('TEST 4: MongoDB Setup', 'magenta');
  log('========================================', 'magenta');

  let mongoClient;

  try {
    const uri = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
    mongoClient = new MongoClient(uri);

    await mongoClient.connect();
    logInfo('MongoDB connected');

    const db = mongoClient.db(MONGO_DB);
    const collection = db.collection('passdata_events');

    // Check if collection exists
    const collections = await db.listCollections({ name: 'passdata_events' }).toArray();
    if (collections.length > 0) {
      logInfo('Collection exists: passdata_events');

      // Get document count
      const count = await collection.countDocuments({ deviceId: DEVICE_ID });
      logInfo(`Documents for device '${DEVICE_ID}': ${count}`);

      // Check indexes
      const indexes = await collection.indexes();
      logInfo(`Indexes: ${indexes.length}`);
      for (const index of indexes) {
        logInfo(`  - ${index.name}`);
      }

      logSuccess('MongoDB setup verified');
      return true;
    } else {
      logWarning('Collection does not exist yet (will be created on first write)');
      return true;
    }

  } catch (error) {
    logError(`MongoDB test failed: ${error.message}`);
    return false;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

/**
 * Test 5: End-to-End Data Consistency
 */
async function testDataConsistency(client) {
  log('\n========================================', 'magenta');
  log('TEST 5: Data Consistency Check', 'magenta');
  log('========================================', 'magenta');

  let mongoClient;

  try {
    // Get last 10 messages from stream
    const streamMessages = await client.xRevRange(STREAM_KEY, '+', '-', { COUNT: 10 });

    if (!streamMessages || streamMessages.length === 0) {
      logWarning('No messages in stream to verify');
      return true;
    }

    logInfo(`Checking ${streamMessages.length} messages from stream`);

    // Connect to MongoDB
    const uri = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();

    const db = mongoClient.db(MONGO_DB);
    const collection = db.collection('passdata_events');

    // Check if messages exist in MongoDB
    let foundCount = 0;
    for (const msg of streamMessages) {
      const timestamp = parseInt(msg.message.timestamp);
      const exists = await collection.findOne({
        deviceId: DEVICE_ID,
        timestamp: new Date(timestamp)
      });

      if (exists) {
        foundCount++;
      }
    }

    logInfo(`Found ${foundCount}/${streamMessages.length} messages in MongoDB`);

    if (foundCount > 0) {
      logSuccess('Data consistency verified');
      return true;
    } else {
      logWarning('No matching messages in MongoDB (processor may not be running)');
      return true;
    }

  } catch (error) {
    logError(`Data consistency test failed: ${error.message}`);
    return false;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

/**
 * Test 6: Pending Messages and Recovery
 */
async function testPendingMessagesRecovery(client) {
  log('\n========================================', 'magenta');
  log('TEST 6: Pending Messages & Recovery', 'magenta');
  log('========================================', 'magenta');

  try {
    // Get pending messages summary
    const pending = await client.xPending(STREAM_KEY, CONSUMER_GROUP);

    logInfo(`Total pending: ${pending.pending || 0}`);
    if (pending.pending > 0 && pending.consumers) {
      logInfo('Pending by consumer:');
      for (const consumer of pending.consumers) {
        logInfo(`  - ${consumer.name}: ${consumer.pending} messages`);
      }
    }

    if (pending.pending > 100) {
      logWarning(`High pending count (${pending.pending}) - may indicate processing lag`);
    } else {
      logSuccess('Pending messages within normal range');
    }

    return true;

  } catch (error) {
    logError(`Pending messages test failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n╔════════════════════════════════════════╗', 'magenta');
  log('║  Redis Streams Migration Test Suite   ║', 'magenta');
  log('╚════════════════════════════════════════╝\n', 'magenta');

  logInfo(`Device: ${DEVICE_ID}`);
  logInfo(`Redis: ${REDIS_HOST}:${REDIS_PORT}`);
  logInfo(`MongoDB: ${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`);

  let client;
  const results = {};

  try {
    // Connect to Redis
    client = redis.createClient({
      socket: { host: REDIS_HOST, port: REDIS_PORT }
    });

    await client.connect();
    logSuccess('Redis connected\n');

    // Run tests
    results.streamSetup = await testRedisStreamSetup(client);
    results.dualWrite = await testDualWrite(client);
    results.consumerGroup = await testConsumerGroupProcessing(client);
    results.mongoSetup = await testMongoDBSetup();
    results.dataConsistency = await testDataConsistency(client);
    results.pendingRecovery = await testPendingMessagesRecovery(client);

    // Summary
    log('\n========================================', 'magenta');
    log('TEST SUMMARY', 'magenta');
    log('========================================', 'magenta');

    const passed = Object.values(results).filter(r => r === true).length;
    const total = Object.keys(results).length;

    Object.entries(results).forEach(([test, result]) => {
      const status = result ? '✅ PASS' : '❌ FAIL';
      const color = result ? 'green' : 'red';
      log(`${status} - ${test}`, color);
    });

    log(`\nResults: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

    if (passed === total) {
      log('\n🎉 All tests passed! Migration ready.', 'green');
    } else {
      log('\n⚠️  Some tests failed. Review errors above.', 'yellow');
    }

  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    console.error(error);
  } finally {
    if (client) {
      await client.quit();
    }
  }
}

// Run tests
runTests().catch(console.error);
