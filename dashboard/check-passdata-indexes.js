const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/?authSource=${process.env.MONGODB_AUTH_DATABASE}`;

async function checkIndexes() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DASHBOARD_DATABASE);
    const collection = db.collection('passdata');

    const indexes = await collection.indexes();
    console.log('📊 MongoDB passdata collection indexes:\n');
    indexes.forEach(idx => {
      console.log(`Index: ${idx.name}`);
      console.log(`  Keys:`, idx.key);
      if (idx.unique) console.log(`  ✅ UNIQUE index (prevents duplicates)`);
      console.log('');
    });
  } finally {
    await client.close();
  }
}

checkIndexes();
