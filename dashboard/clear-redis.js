#!/usr/bin/env node

/**
 * Clear all Redis data
 * Usage: node clear-redis.js
 */

const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

const REDIS_HOST = process.env.REDIS_HOST || '192.168.1.71';
const REDIS_PORT = process.env.REDIS_PORT || '6379';

async function clearAllRedis() {
  const redis = new Redis({
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT),
    retryStrategy: () => null, // Don't retry on failure
  });

  try {
    // Test connection
    await redis.ping();
    console.log('✅ Connected to Redis');

    // Get all keys
    const allKeys = await redis.keys('*');
    console.log(`\n📊 Found ${allKeys.length} keys in Redis\n`);

    if (allKeys.length === 0) {
      console.log('✅ Redis is already empty');
      return;
    }

    // Group keys by pattern for better visibility
    const keyGroups = {};
    allKeys.forEach(key => {
      const prefix = key.split('/')[0];
      if (!keyGroups[prefix]) {
        keyGroups[prefix] = [];
      }
      keyGroups[prefix].push(key);
    });

    console.log('🗑️  Keys to delete:\n');
    Object.entries(keyGroups).forEach(([prefix, keys]) => {
      console.log(`  ${prefix}/ (${keys.length} keys)`);
      keys.slice(0, 5).forEach(key => console.log(`    - ${key}`));
      if (keys.length > 5) {
        console.log(`    ... and ${keys.length - 5} more`);
      }
    });

    console.log('\n🗑️  Deleting all keys...\n');

    // Delete all keys using FLUSHDB (faster than deleting one by one)
    await redis.flushdb();

    console.log('✅ All Redis data cleared successfully');

    // Verify
    const remainingKeys = await redis.keys('*');
    console.log(`\n📊 Remaining keys: ${remainingKeys.length}`);

    if (remainingKeys.length === 0) {
      console.log('✅ Redis is completely empty');
    } else {
      console.log('⚠️  Some keys still remain:', remainingKeys);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

clearAllRedis();
