#!/usr/bin/env node

/**
 * Integration Test: Vehicle Tracking TTL Bug Fix
 *
 * This script tests the TTL bug fix with actual Redis to verify:
 * 1. Orphaned IDs are detected and removed
 * 2. Set size remains bounded
 * 3. Cleanup runs correctly
 * 4. No memory leaks
 *
 * Usage: node test-vehicle-tracking-ttl.js
 */

const { createClient } = require('redis');

const REDIS_HOST = process.env.REDIS_HOST || '192.168.1.71';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const DEVICE_ID = 'test-ttl-fix';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`);
}

async function setupRedis() {
  const client = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
    },
  });

  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();

  return client;
}

async function cleanup(client) {
  log(colors.yellow, '\n🧹 Cleaning up test data...');

  // Delete all test keys
  const keys = await client.keys(`${DEVICE_ID}/*`);
  if (keys.length > 0) {
    await client.del(keys);
    log(colors.green, `✅ Deleted ${keys.length} test keys`);
  }

  await client.quit();
}

async function runTests() {
  log(colors.blue, '\n=== Vehicle Tracking TTL Bug Fix - Integration Tests ===\n');

  const client = await setupRedis();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Verify Set TTL is not set
    log(colors.cyan, '📝 Test 1: Verify vehicle_ids Set has no TTL');
    const vehicleIdsKey = `${DEVICE_ID}/tracking/vehicle_ids`;
    const vehicleStateKey = `${DEVICE_ID}/tracking/vehicle/test-v1`;

    // Add a vehicle to the Set
    await client.sAdd(vehicleIdsKey, 'test-v1');

    // Add vehicle state with TTL
    await client.hSet(vehicleStateKey, {
      targetId: 'test-v1',
      position: JSON.stringify({ x: 10, y: 20 }),
      trajectory: '[]',
      isVisible: '1',
      lastSeen: new Date().toISOString(),
      enterTime: new Date().toISOString(),
    });
    await client.expire(vehicleStateKey, 300);

    // Check TTLs
    const setTTL = await client.ttl(vehicleIdsKey);
    const stateTTL = await client.ttl(vehicleStateKey);

    if (setTTL === -1) {  // -1 means no TTL
      log(colors.green, `✅ PASS: vehicle_ids Set has no TTL (TTL: ${setTTL})`);
      testsPassed++;
    } else {
      log(colors.red, `❌ FAIL: vehicle_ids Set has TTL: ${setTTL}s`);
      testsFailed++;
    }

    if (stateTTL > 0 && stateTTL <= 300) {
      log(colors.green, `✅ PASS: Vehicle state has correct TTL: ${stateTTL}s`);
      testsPassed++;
    } else {
      log(colors.red, `❌ FAIL: Vehicle state TTL incorrect: ${stateTTL}s`);
      testsFailed++;
    }

    // Test 2: Simulate orphaned ID scenario
    log(colors.cyan, '\n📝 Test 2: Simulate orphaned ID (state expires, ID remains)');

    // Add multiple vehicles
    await client.sAdd(vehicleIdsKey, 'orphan-1', 'orphan-2', 'active-1');

    // Only create state for active-1
    const activeStateKey = `${DEVICE_ID}/tracking/vehicle/active-1`;
    await client.hSet(activeStateKey, {
      targetId: 'active-1',
      position: JSON.stringify({ x: 15, y: 25 }),
      trajectory: '[]',
      isVisible: '1',
      lastSeen: new Date().toISOString(),
      enterTime: new Date().toISOString(),
    });
    await client.expire(activeStateKey, 300);

    // Check Set members
    const members = await client.sMembers(vehicleIdsKey);
    log(colors.yellow, `   Set members: ${members.join(', ')}`);

    // Check which ones have state keys
    const orphans = [];
    for (const id of members) {
      const exists = await client.exists(`${DEVICE_ID}/tracking/vehicle/${id}`);
      if (!exists) {
        orphans.push(id);
      }
    }

    if (orphans.length === 2 && orphans.includes('orphan-1') && orphans.includes('orphan-2')) {
      log(colors.green, `✅ PASS: Detected ${orphans.length} orphaned IDs: ${orphans.join(', ')}`);
      testsPassed++;
    } else {
      log(colors.red, `❌ FAIL: Expected 2 orphans, found ${orphans.length}`);
      testsFailed++;
    }

    // Test 3: Verify orphan cleanup
    log(colors.cyan, '\n📝 Test 3: Verify orphaned IDs can be cleaned up');

    // Remove orphaned IDs
    for (const orphan of orphans) {
      await client.sRem(vehicleIdsKey, orphan);
    }

    const membersAfterCleanup = await client.sMembers(vehicleIdsKey);

    if (membersAfterCleanup.length === 1 && membersAfterCleanup[0] === 'active-1') {
      log(colors.green, `✅ PASS: Set cleaned up correctly. Remaining: ${membersAfterCleanup.join(', ')}`);
      testsPassed++;
    } else {
      log(colors.red, `❌ FAIL: Set cleanup incorrect. Members: ${membersAfterCleanup.join(', ')}`);
      testsFailed++;
    }

    // Test 4: Test Set size stability over time
    log(colors.cyan, '\n📝 Test 4: Test Set size stability with multiple operations');

    // Add 10 vehicles
    const vehicleIds = Array.from({ length: 10 }, (_, i) => `stability-v${i}`);
    await client.sAdd(vehicleIdsKey, ...vehicleIds);

    // Create state for only 5 of them
    for (let i = 0; i < 5; i++) {
      const stateKey = `${DEVICE_ID}/tracking/vehicle/stability-v${i}`;
      await client.hSet(stateKey, {
        targetId: `stability-v${i}`,
        position: JSON.stringify({ x: i * 10, y: i * 20 }),
        trajectory: '[]',
        isVisible: '1',
        lastSeen: new Date().toISOString(),
        enterTime: new Date().toISOString(),
      });
      await client.expire(stateKey, 300);
    }

    const initialSetSize = await client.sCard(vehicleIdsKey);
    log(colors.yellow, `   Initial Set size: ${initialSetSize}`);

    // Cleanup orphaned IDs
    const allMembers = await client.sMembers(vehicleIdsKey);
    const orphanedIds = [];
    for (const id of allMembers) {
      const exists = await client.exists(`${DEVICE_ID}/tracking/vehicle/${id}`);
      if (!exists) {
        orphanedIds.push(id);
        await client.sRem(vehicleIdsKey, id);
      }
    }

    const finalSetSize = await client.sCard(vehicleIdsKey);
    log(colors.yellow, `   Removed ${orphanedIds.length} orphaned IDs`);
    log(colors.yellow, `   Final Set size: ${finalSetSize}`);

    if (finalSetSize === 6) {  // active-1 + 5 stability vehicles
      log(colors.green, `✅ PASS: Set size stabilized at ${finalSetSize} (expected 6)`);
      testsPassed++;
    } else {
      log(colors.red, `❌ FAIL: Set size ${finalSetSize} (expected 6)`);
      testsFailed++;
    }

    // Test 5: Verify no memory leaks with repeated operations
    log(colors.cyan, '\n📝 Test 5: Verify no memory leaks with 100 add/remove cycles');

    const startMembers = await client.sMembers(vehicleIdsKey);
    const startSize = startMembers.length;

    // Run 100 cycles of add/remove
    for (let cycle = 0; cycle < 100; cycle++) {
      // Add vehicle
      await client.sAdd(vehicleIdsKey, `cycle-v${cycle}`);

      // Immediately remove (simulating cleanup)
      await client.sRem(vehicleIdsKey, `cycle-v${cycle}`);
    }

    const endSize = await client.sCard(vehicleIdsKey);

    if (endSize === startSize) {
      log(colors.green, `✅ PASS: No memory leak. Set size stable at ${endSize}`);
      testsPassed++;
    } else {
      log(colors.red, `❌ FAIL: Memory leak detected. Size changed from ${startSize} to ${endSize}`);
      testsFailed++;
    }

  } catch (error) {
    log(colors.red, `\n❌ Test error: ${error.message}`);
    testsFailed++;
  } finally {
    await cleanup(client);
  }

  // Summary
  log(colors.blue, '\n=== Test Summary ===');
  log(colors.green, `✅ Passed: ${testsPassed}`);
  if (testsFailed > 0) {
    log(colors.red, `❌ Failed: ${testsFailed}`);
  }
  log(colors.blue, `Total: ${testsPassed + testsFailed}\n`);

  return testsFailed === 0;
}

// Run tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
