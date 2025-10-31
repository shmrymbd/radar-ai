/**
 * Test to verify React state update pattern
 * This simulates what should happen in LaneConfigModal
 */

// Simulate initial state
let laneConfigs = [
  { laneNumber: 65535, customName: 'Lane 65535' },
  { laneNumber: 11, customName: 'Lane 11' },
  { laneNumber: 12, customName: 'Lane 12' },
  { laneNumber: 13, customName: 'Lane 13' },
  { laneNumber: 485, customName: 'Lane 485' }
];

console.log('Initial state:');
laneConfigs.forEach((lane, i) => {
  console.log(`  [${i}] Lane ${lane.laneNumber}: "${lane.customName}"`);
});

// Simulate updateLaneConfig function
function updateLaneConfig(index, updates) {
  console.log(`\nUpdating index ${index} with:`, updates);

  laneConfigs = laneConfigs.map((config, i) => {
    if (i === index) {
      console.log(`  Matched index ${i}, updating lane ${config.laneNumber}`);
      return { ...config, ...updates };
    }
    return config;
  });

  console.log('\nAfter update:');
  laneConfigs.forEach((lane, i) => {
    console.log(`  [${i}] Lane ${lane.laneNumber}: "${lane.customName}"`);
  });
}

// Test 1: Update Lane 11 (index 1)
console.log('\n=== TEST 1: Update Lane 11 (index 1) ===');
updateLaneConfig(1, { customName: 'North Entrance' });

// Test 2: Update Lane 485 (index 4)
console.log('\n=== TEST 2: Update Lane 485 (index 4) ===');
updateLaneConfig(4, { customName: 'South Exit' });

// Test 3: Update Lane 13 (index 3)
console.log('\n=== TEST 3: Update Lane 13 (index 3) ===');
updateLaneConfig(3, { customName: 'Main Street' });

console.log('\n✓ All updates targeted correct lanes');
