const { MongoClient } = require('mongodb');

async function generateTestData() {
  try {
    console.log('🧪 Generating test classification data...');
    
    const client = new MongoClient('mongodb://admin:admin123@192.168.6.22:27017/traffic_analysis?authSource=admin');
    await client.connect();
    console.log('✅ MongoDB connected');
    
    const db = client.db('traffic_analysis');
    const collection = db.collection('classification_history');
    
    // Generate multiple test records for different time slots
    const now = new Date();
    const testRecords = [];
    
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - (i * 15 * 60 * 1000)); // 15 minutes apart
      const timeSlot = formatTimeSlot(timestamp);
      
      const record = {
        deviceId: 'test',
        timestamp: timestamp,
        timeSlot: timeSlot,
        vehicleTypes: {
          car: Math.floor(Math.random() * 10) + 5,
          suv: Math.floor(Math.random() * 8) + 2,
          truck: Math.floor(Math.random() * 3) + 1,
          motorcycle: Math.floor(Math.random() * 2),
          van: Math.floor(Math.random() * 4) + 1
        },
        laneUtilization: {
          lane11: Math.floor(Math.random() * 5) + 3,
          lane12: Math.floor(Math.random() * 5) + 2,
          lane31: Math.floor(Math.random() * 4) + 1,
          lane32: Math.floor(Math.random() * 3) + 1
        },
        speedAnalysis: {
          averageSpeed: Math.random() * 20 + 35, // 35-55 km/h
          speedViolations: Math.floor(Math.random() * 3),
          speedDistribution: []
        },
        totalVehicles: 0, // Will be calculated
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Calculate total vehicles
      record.totalVehicles = Object.values(record.vehicleTypes).reduce((sum, count) => sum + count, 0);
      
      testRecords.push(record);
    }
    
    console.log('📊 Inserting test records...');
    await collection.insertMany(testRecords);
    console.log(`✅ Inserted ${testRecords.length} test records`);
    
    // Verify data
    const count = await collection.countDocuments({ deviceId: 'test' });
    console.log(`📚 Total records for test device: ${count}`);
    
    await client.close();
    console.log('✅ Test data generation completed');
    
  } catch (error) {
    console.error('❌ Error generating test data:', error);
  }
}

function formatTimeSlot(timestamp) {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const hour = String(timestamp.getHours()).padStart(2, '0');
  const minute = String(Math.floor(timestamp.getMinutes() / 15) * 15).padStart(2, '0');
  
  return `${year}-${month}-${day}-${hour}-${minute}`;
}

generateTestData();
