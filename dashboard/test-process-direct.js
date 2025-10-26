// Test the processPassDataForClassification method directly
const { MongoClient } = require('mongodb');

async function testProcessDirect() {
  try {
    console.log('🧪 Testing processPassDataForClassification directly...');
    
    // Create a simple test data object
    const testData = {
      deviceId: 'test',
      timestamp: new Date(),
      laneNumber: 11,
      crossSectionPosition: 25.5,
      crossSectionSpeed: 45.2,
      headwayTime: 2.1,
      passingTime: new Date().toISOString(),
      occupancyDuration: 1.8,
      occupancyStatus: 1,
      vehicleType: 'car'
    };
    
    console.log('Test data:', testData);
    
    // Test the data structure initialization
    const classificationData = new Map();
    const deviceId = 'test';
    
    if (!classificationData.has(deviceId)) {
      classificationData.set(deviceId, new Map());
    }
    
    const deviceData = classificationData.get(deviceId);
    const key = `classification_${testData.vehicleType}`;
    const existing = deviceData.get(key) || {
      count: 0,
      totalSpeed: 0,
      speeds: [],
      lanes: new Map(),
      timestamps: []
    };
    
    existing.count++;
    existing.totalSpeed += testData.crossSectionSpeed;
    existing.speeds.push(testData.crossSectionSpeed);
    existing.lanes.set(testData.laneNumber, (existing.lanes.get(testData.laneNumber) || 0) + 1);
    existing.timestamps.push(testData.timestamp);
    
    deviceData.set(key, existing);
    
    console.log('✅ Data processed successfully');
    console.log('Device data size:', deviceData.size);
    
    // Test the entries() call
    for (const [key, data] of deviceData.entries()) {
      console.log(`Key: ${key}, Count: ${data.count}`);
    }
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testProcessDirect();
