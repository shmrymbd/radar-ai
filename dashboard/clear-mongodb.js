#!/usr/bin/env node

/**
 * Clear all MongoDB collections in traffic_signal_dashboard database
 * Usage: node clear-mongodb.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_HOST = process.env.MONGODB_HOST || '192.168.1.71';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'admin';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'admin123';
const MONGODB_AUTH_DATABASE = process.env.MONGODB_AUTH_DATABASE || 'admin';
const MONGODB_DATABASE = process.env.MONGODB_DASHBOARD_DATABASE || 'traffic_signal_dashboard';

const uri = `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/?authSource=${MONGODB_AUTH_DATABASE}`;

async function clearAllCollections() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(MONGODB_DATABASE);

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections:`);
    collections.forEach(c => console.log(`  - ${c.name}`));

    if (collections.length === 0) {
      console.log('\n✅ No collections to clear');
      return;
    }

    console.log('\n🗑️  Clearing all collections...\n');

    // Clear each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);

      const countBefore = await collection.countDocuments();
      const result = await collection.deleteMany({});

      console.log(`✅ ${collectionName}: Deleted ${result.deletedCount} documents (had ${countBefore})`);
    }

    console.log('\n✅ All collections cleared successfully');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

clearAllCollections();
