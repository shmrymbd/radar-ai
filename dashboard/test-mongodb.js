const { MongoClient } = require('mongodb');

async function testMongoDB() {
  try {
    console.log('🧪 Testing MongoDB connection...');
    
    const client = new MongoClient('mongodb://admin:admin123@192.168.6.22:27017/traffic_analysis?authSource=admin');
    await client.connect();
    console.log('✅ MongoDB connected');
    
    const db = client.db('traffic_analysis');
    const collection = db.collection('classification_history');
    
    // Insert test data
    const testData = {
      deviceId: 'test',
      timestamp: new Date(),
      timeSlot: '2025-10-26-10-45',
      vehicleTypes: {
        car: 5,
        suv: 3,
        truck: 1,
        motorcycle: 0,
        van: 1
      },
      laneUtilization: {
        lane11: 4,
        lane12: 3,
        lane31: 2,
        lane32: 0
      },
      speedAnalysis: {
        averageSpeed: 45.2,
        speedViolations: 1,
        speedDistribution: []
      },
      totalVehicles: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📊 Inserting test data...');
    await collection.insertOne(testData);
    console.log('✅ Test data inserted');
    
    // Query test data
    const results = await collection.find({ deviceId: 'test' }).toArray();
    console.log('📚 Found records:', results.length);
    console.log('📈 Sample data:', results[0]);
    
    await client.close();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMongoDB();
