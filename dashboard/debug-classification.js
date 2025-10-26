const { MongoClient } = require('mongodb');

async function debugClassification() {
  try {
    console.log('🧪 Debugging classification processor...');
    
    // Test MongoDB connection
    const client = new MongoClient('mongodb://admin:admin123@192.168.6.22:27017/traffic_analysis?authSource=admin');
    await client.connect();
    console.log('✅ MongoDB connected');
    
    const db = client.db('traffic_analysis');
    const collection = db.collection('classification_history');
    
    // Check if we have data
    const count = await collection.countDocuments({ deviceId: 'test' });
    console.log(`📊 Found ${count} historical records`);
    
    if (count > 0) {
      const sample = await collection.findOne({ deviceId: 'test' });
      console.log('📋 Sample record:', JSON.stringify(sample, null, 2));
    }
    
    await client.close();
    console.log('✅ Debug completed');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugClassification();
