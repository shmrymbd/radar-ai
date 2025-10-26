// Simple test to check classification processor
console.log('🧪 Testing classification processor...');

// Mock the data structure
const classificationData = new Map();
const deviceId = 'test';

// Initialize device data
if (!classificationData.has(deviceId)) {
  classificationData.set(deviceId, new Map());
}

const deviceData = classificationData.get(deviceId);
const key = 'classification_car';
const existing = deviceData.get(key) || {
  count: 0,
  totalSpeed: 0,
  speeds: [],
  lanes: new Map(),
  timestamps: []
};

existing.count++;
existing.totalSpeed += 45.2;
existing.speeds.push(45.2);
existing.lanes.set(11, (existing.lanes.get(11) || 0) + 1);
existing.timestamps.push(new Date());

deviceData.set(key, existing);

console.log('✅ Data initialized');
console.log('Device data size:', deviceData.size);
console.log('Device data entries:', Array.from(deviceData.entries()));

// Test the entries() call
try {
  for (const [key, data] of deviceData.entries()) {
    console.log(`Processing key: ${key}, data:`, data);
  }
  console.log('✅ entries() call successful');
} catch (error) {
  console.error('❌ entries() call failed:', error);
}

console.log('✅ Test completed');
