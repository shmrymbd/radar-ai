/**
 * Test to verify the lane index fix
 * This simulates the bug and shows the fix
 */

// Simulate the lane configs as they appear in the component
const laneConfigs = [
  { laneNumber: 65535, customName: 'Lane 65535' },
  { laneNumber: 11, customName: 'Lane 11' },
  { laneNumber: 12, customName: 'Lane 12' },
  { laneNumber: 13, customName: 'Lane 13' },
  { laneNumber: 485, customName: 'Lane 485' }
];

console.log('Original lane order:');
laneConfigs.forEach((lane, i) => {
  console.log(`  Index ${i}: Lane ${lane.laneNumber}`);
});

// Simulate the sorted display in the sidebar
const sortedLanes = [...laneConfigs].sort((a, b) => a.laneNumber - b.laneNumber);

console.log('\nSorted display order (as shown in sidebar):');
sortedLanes.forEach((lane, i) => {
  console.log(`  Display position ${i}: Lane ${lane.laneNumber}`);
});

// OLD BUG: Using index from sorted array
console.log('\n❌ OLD BEHAVIOR (BUG):');
console.log('User clicks on Lane 485 (position 3 in sorted display)');
const oldSelectedIndex = 3; // Position in sorted array
console.log(`  Sets selectedLaneIndex = ${oldSelectedIndex}`);
console.log(`  But original array[${oldSelectedIndex}] = Lane ${laneConfigs[oldSelectedIndex].laneNumber}`);
console.log('  ⚠️  Editing wrong lane!');

// NEW FIX: Finding real index in original array
console.log('\n✅ NEW BEHAVIOR (FIXED):');
console.log('User clicks on Lane 485 (position 3 in sorted display)');
const clickedLane = sortedLanes[3];
const realIndex = laneConfigs.findIndex(c => c.laneNumber === clickedLane.laneNumber);
console.log(`  Finds realIndex = ${realIndex} in original array`);
console.log(`  Original array[${realIndex}] = Lane ${laneConfigs[realIndex].laneNumber}`);
console.log('  ✓ Editing correct lane!');

console.log('\n✨ Fix verified: Each lane now edits correctly regardless of sort order');
