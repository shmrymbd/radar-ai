#!/usr/bin/env node

/**
 * Verify all MongoDB collections are empty
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_HOST = process.env.MONGODB_HOST || '192.168.6.22';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'admin';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'admin123';
const MONGODB_AUTH_DATABASE = process.env.MONGODB_AUTH_DATABASE || 'admin';
const MONGODB_DATABASE = process.env.MONGODB_DASHBOARD_DATABASE || 'traffic_signal_dashboard';

const uri = `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/?authSource=${MONGODB_AUTH_DATABASE}`;

async function verifyEmpty() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(MONGODB_DATABASE);

    // Get all collections
    const collections = await db.listCollections().toArray();

    console.log(`📊 Checking ${collections.length} collections:\n`);

    let totalDocs = 0;

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();

      totalDocs += count;

      const status = count === 0 ? '✅' : '⚠️';
      console.log(`${status} ${collectionName}: ${count} documents`);
    }

    console.log(`\n📈 Total documents across all collections: ${totalDocs}`);

    if (totalDocs === 0) {
      console.log('\n✅ All collections are empty!');
    } else {
      console.log('\n⚠️  Some collections still have data');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

verifyEmpty();
