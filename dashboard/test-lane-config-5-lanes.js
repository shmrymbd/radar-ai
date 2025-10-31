/**
 * Test script to verify lane configuration API with 5 lanes
 *
 * Usage: node test-lane-config-5-lanes.js
 */

const testLaneConfig = {
  deviceId: 'P1-center',
  lanes: [
    {
      laneNumber: 65535,
      customName: 'Lane 1',
      enabled: true,
      thresholds: {
        queueLength: 5,
        speedLow: 10,
        speedHigh: 80,
        occupancyHigh: 70,
        vehicleCountHigh: 10
      },
      alerts: {
        enableQueueAlert: true,
        enableSpeedAlert: false,
        enableOccupancyAlert: true,
        enableVehicleCountAlert: false
      },
      displayOptions: {
        showQueue: true,
        showVehicles: true,
        showSpeed: true,
        showOccupancy: true
      }
    },
    {
      laneNumber: 11,
      customName: 'Lane 2',
      enabled: true,
      thresholds: {
        queueLength: 5,
        speedLow: 10,
        speedHigh: 80,
        occupancyHigh: 70,
        vehicleCountHigh: 10
      },
      alerts: {
        enableQueueAlert: true,
        enableSpeedAlert: false,
        enableOccupancyAlert: true,
        enableVehicleCountAlert: false
      },
      displayOptions: {
        showQueue: true,
        showVehicles: true,
        showSpeed: true,
        showOccupancy: true
      }
    },
    {
      laneNumber: 12,
      customName: 'Lane 3',
      enabled: true,
      thresholds: {
        queueLength: 5,
        speedLow: 10,
        speedHigh: 80,
        occupancyHigh: 70,
        vehicleCountHigh: 10
      },
      alerts: {
        enableQueueAlert: true,
        enableSpeedAlert: false,
        enableOccupancyAlert: true,
        enableVehicleCountAlert: false
      },
      displayOptions: {
        showQueue: true,
        showVehicles: true,
        showSpeed: true,
        showOccupancy: true
      }
    },
    {
      laneNumber: 13,
      customName: 'Lane 4',
      enabled: true,
      thresholds: {
        queueLength: 5,
        speedLow: 10,
        speedHigh: 80,
        occupancyHigh: 70,
        vehicleCountHigh: 10
      },
      alerts: {
        enableQueueAlert: true,
        enableSpeedAlert: false,
        enableOccupancyAlert: true,
        enableVehicleCountAlert: false
      },
      displayOptions: {
        showQueue: true,
        showVehicles: true,
        showSpeed: true,
        showOccupancy: true
      }
    },
    {
      laneNumber: 485,
      customName: 'Lane 5',
      enabled: true,
      thresholds: {
        queueLength: 5,
        speedLow: 10,
        speedHigh: 80,
        occupancyHigh: 70,
        vehicleCountHigh: 10
      },
      alerts: {
        enableQueueAlert: true,
        enableSpeedAlert: false,
        enableOccupancyAlert: true,
        enableVehicleCountAlert: false
      },
      displayOptions: {
        showQueue: true,
        showVehicles: true,
        showSpeed: true,
        showOccupancy: true
      }
    }
  ]
};

async function testSave() {
  console.log('🧪 Testing lane configuration save with 5 lanes...\n');

  console.log('📤 Sending POST request to /api/lane-config');
  console.log('Device ID:', testLaneConfig.deviceId);
  console.log('Number of lanes:', testLaneConfig.lanes.length);
  console.log('Lane numbers:', testLaneConfig.lanes.map(l => l.laneNumber).join(', '));
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/lane-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLaneConfig)
    });

    const result = await response.json();

    console.log('📥 Response status:', response.status);
    console.log('📥 Response:', JSON.stringify(result, null, 2));
    console.log('');

    if (result.success) {
      console.log('✅ SUCCESS: Lane configuration saved');
      console.log('Saved lanes:', result.data.lanes.length);
    } else {
      console.log('❌ FAILED:', result.error);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

async function testGet() {
  console.log('\n🧪 Testing lane configuration retrieval...\n');

  try {
    const response = await fetch('http://localhost:3000/api/lane-config?device=P1-center');
    const result = await response.json();

    console.log('📥 Response status:', response.status);
    console.log('📥 Retrieved lanes:', result.data?.lanes?.length || 0);

    if (result.success && result.data) {
      console.log('✅ SUCCESS: Retrieved configuration');
      console.log('Lane names:');
      result.data.lanes.forEach((lane, i) => {
        console.log(`  ${i + 1}. Lane ${lane.laneNumber}: "${lane.customName}" (${lane.enabled ? 'enabled' : 'disabled'})`);
      });
    } else {
      console.log('❌ FAILED:', result.error);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

// Run tests
(async () => {
  await testSave();
  await testGet();
})();
