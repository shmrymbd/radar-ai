/**
 * Update lane configuration to use entryIndex (0-4) instead of lane numbers
 * This fixes the issue where all lanes report as 65535
 */

const deviceId = 'P1-center';

// New configuration using entryIndex values
const fixedConfig = {
  deviceId: deviceId,
  lanes: [
    {
      laneNumber: 0,  // First lane (entryIndex 0)
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
      laneNumber: 1,  // Second lane (entryIndex 1)
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
      laneNumber: 2,  // Third lane (entryIndex 2)
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
      laneNumber: 3,  // Fourth lane (entryIndex 3)
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
      laneNumber: 4,  // Fifth lane (entryIndex 4)
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

async function updateConfig() {
  console.log('🔧 Updating lane configuration to use entryIndex values (0-4)...\n');

  try {
    const response = await fetch('http://localhost:3000/api/lane-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fixedConfig)
    });

    const result = await response.json();

    console.log('📥 Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS: Lane configuration updated');
      console.log('\nNew lane mapping:');
      result.data.lanes.forEach((lane, i) => {
        console.log(`  Entry ${lane.laneNumber}: "${lane.customName}"`);
      });
      console.log('\n⚠️  Please refresh your browser to see the changes');
    } else {
      console.log('\n❌ FAILED:', result.error);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

updateConfig();
