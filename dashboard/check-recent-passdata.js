#!/usr/bin/env node

/**
 * Check recent passdata entries
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

async function checkRecent() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db(MONGODB_DATABASE);
    const collection = db.collection('passdata');

    const count = await collection.countDocuments();
    console.log(`📊 Total passdata documents: ${count}\n`);

    const recent = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    console.log('🚗 Most recent entries:\n');
    recent.forEach((doc, i) => {
      const time = new Date(doc.timestamp).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
      console.log(`${i + 1}. Device: ${doc.deviceId}, Lane: ${doc.Lane}, Type: ${doc.Type}, Speed: ${doc.Speed} km/h`);
      console.log(`   Time: ${time}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

checkRecent();
