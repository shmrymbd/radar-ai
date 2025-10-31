import { NextRequest, NextResponse } from 'next/server';
import { VehicleTracker } from '@/lib/vehicle-tracker';
import { RedisStorage } from '@/lib/redis-storage';
import { ObjectData } from '@/types/radar';
import { withApiProtection } from '@/lib/middleware';

const vehicleTracker = new VehicleTracker();

// Store vehicle states for dynamic movement - device specific
const deviceVehicleStates = new Map<string, Map<string, any>>();

export async function GET(request: NextRequest) {
  // Apply authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device') || 'P1-center'; // Default to P1-center (primary radar)
    
    const redisStorage = RedisStorage.getInstance();
    
    // Set the device prefix for this request
    redisStorage.setDevicePrefix(deviceId);
    
    // Get device-specific object data from Redis
    let objectData = await redisStorage.getDeviceObjectData(deviceId, 1);

    // If no Redis data available, try to generate dynamic data for testing
    if (objectData.length === 0) {
      // Generate dynamic data for test devices when no Redis data exists
      if (deviceId === 'test') {
        objectData = [await generateDynamicVehicleData(deviceId)];
      } else {
        // For real devices with no Redis data, return empty data
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          device: deviceId,
          timestamp: new Date().toISOString(),
          message: 'No radar data available for this device'
        });
      }
    }

    // Convert ProcessedObjectData to ObjectData format for vehicle tracker
    const rawObjectData: ObjectData = {
      deviceId: objectData[0].deviceId,
      timestamp: typeof objectData[0].timestamp === 'string' 
        ? objectData[0].timestamp 
        : new Date(objectData[0].timestamp).toISOString(),
      numEntries: objectData[0].numEntries,
      entries: objectData[0].entries.map(entry => ({
        targetId: entry.targetId,
        laneNo: entry.laneNo,
        targetType: entry.targetType,
        color: entry.color,
        plateNumber: entry.plateNumber,
        xCoordM: entry.xCoordM,
        yCoordM: entry.yCoordM,
        speedKmh: entry.speedKmh,
        azimuthDeg: entry.azimuthDeg,
        longitude: entry.longitude,
        latitude: entry.latitude,
        imageX: entry.imageX,
        imageY: entry.imageY,
        vehicleLength: entry.vehicleLength,
        vehicleWidth: entry.vehicleWidth,
        vehicleHeight: entry.vehicleHeight,
        parkingStatus: entry.parkingStatus,
        xSpeed: entry.xSpeed,
        ySpeed: entry.ySpeed,
        acceleration: entry.acceleration
      })),
      packetSize: objectData[0].packetSize,
      frameType: objectData[0].frameType
    };

    // Set device ID for tracker
    vehicleTracker.setDeviceId(deviceId);
    
    // Process the latest object data
    await vehicleTracker.processObjectData(rawObjectData);
    const visibleVehicles = await vehicleTracker.getVisibleVehicles();

    return NextResponse.json({
      success: true,
      data: visibleVehicles,
      count: visibleVehicles.length,
      device: deviceId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch vehicles',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Check if data is static (all vehicles have same positions)
 */
function isStaticData(data: any): boolean {
  if (!data.entries || data.entries.length === 0) return true;
  
  // Check if all vehicles have the same position (indicating static data)
  const firstVehicle = data.entries[0];
  return data.entries.every((entry: any) => 
    entry.xCoordM === firstVehicle.xCoordM && 
    entry.yCoordM === firstVehicle.yCoordM
  );
}

/**
 * Generate dynamic vehicle data with realistic movement
 */
async function generateDynamicVehicleData(deviceId: string): Promise<any> {
  const currentTime = new Date();
  const entries = [];
  
  // Get or create device-specific vehicle states
  if (!deviceVehicleStates.has(deviceId)) {
    deviceVehicleStates.set(deviceId, new Map());
  }
  const vehicleStates = deviceVehicleStates.get(deviceId)!;
  
  // Initialize vehicles if not exists for this device
  if (vehicleStates.size === 0) {
    initializeVehicleStates(deviceId, vehicleStates);
  }
  
  // Filter out vehicles in incorrect lanes for this device
  const allowedLanes = deviceId === 'test' ? [11, 12, 13] : [11, 12, 31, 32];
  for (const [targetId, vehicle] of vehicleStates) {
    if (!allowedLanes.includes(vehicle.laneNo)) {
      vehicleStates.delete(targetId);
    }
  }
  
  // Update vehicle positions with device context
  updateVehiclePositions(vehicleStates, deviceId);
  
  // Generate entries from current states
  for (const [targetId, vehicle] of vehicleStates) {
    entries.push({
      targetId: vehicle.targetId,
      laneNo: vehicle.laneNo,
      targetType: getVehicleTypeCode(vehicle.vehicleType),
      color: vehicle.color,
      plateNumber: vehicle.plateNumber,
      xCoordM: vehicle.x,
      yCoordM: vehicle.y,
      speedKmh: vehicle.speed,
      azimuthDeg: vehicle.direction > 0 ? 0 : 180,
      longitude: 0,
      latitude: 0,
      imageX: vehicle.x,
      imageY: vehicle.y,
      vehicleLength: getVehicleLength(vehicle.vehicleType),
      vehicleWidth: getVehicleWidth(vehicle.vehicleType),
      vehicleHeight: getVehicleHeight(vehicle.vehicleType),
      parkingStatus: false,
      xSpeed: vehicle.xSpeed,
      ySpeed: vehicle.ySpeed,
      acceleration: vehicle.acceleration
    });
  }
  
  return {
    deviceId,
    frameType: '0x01',
    timestamp: currentTime.toISOString(),
    numEntries: entries.length,
    entries,
    packetSize: entries.length * 64 + 32
  };
}

/**
 * Initialize vehicle states with realistic starting positions
 */
function initializeVehicleStates(deviceId: string, vehicleStates: Map<string, any>): void {
  // Different lane configurations for different devices
  const lanes = deviceId === 'test' ? [11, 12, 13] : [11, 12, 31, 32];
  const vehicleTypes = ['car', 'van', 'suv', 'truck', 'motorcycle', 'bus', 'large_truck'];
  
  for (let i = 0; i < 8; i++) {
    const targetId = `vehicle_${deviceId}_${Date.now()}_${i}`;
    const laneNo = lanes[Math.floor(Math.random() * lanes.length)];
    const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
    
    vehicleStates.set(targetId, {
      targetId,
      laneNo,
      x: getLaneXPosition(laneNo) + (Math.random() - 0.5) * 1.5,
      y: Math.random() * 300, // Start within 0-300 meter range
      speed: Math.random() * 30 + 25,
      vehicleType,
      direction: Math.random() > 0.5 ? 1 : -1,
      color: Math.floor(Math.random() * 8),
      plateNumber: generatePlateNumber(),
      xSpeed: 0,
      ySpeed: 0,
      acceleration: 0,
      lastUpdate: Date.now(),
      speedVariation: Math.random() * 0.1 + 0.05
    });
  }
}

/**
 * Update vehicle positions with realistic movement
 */
function updateVehiclePositions(vehicleStates: Map<string, any>, deviceId: string): void {
  const now = Date.now();
  const deltaTime = 5; // 5 seconds between updates
  
  for (const [targetId, vehicle] of vehicleStates) {
    // Update position based on speed and direction
    const speedMs = vehicle.speed / 3.6;
    vehicle.y += vehicle.direction * speedMs * deltaTime;
    
    // Add realistic speed variation
    const speedChange = (Math.random() - 0.5) * vehicle.speedVariation * vehicle.speed;
    vehicle.speed += speedChange;
    vehicle.speed = Math.max(15, Math.min(80, vehicle.speed));
    
    // Add realistic acceleration and movement
    vehicle.acceleration = (Math.random() - 0.5) * 2;
    vehicle.xSpeed = (Math.random() - 0.5) * 0.5;
    vehicle.ySpeed = vehicle.direction * speedMs;
    
    // Reset vehicle if it goes too far (use detection zone boundaries)
    if (vehicle.y > 300 || vehicle.y < 0) {
      vehicle.y = vehicle.direction > 0 ? 0 : 300;
      vehicle.speed = Math.random() * 30 + 25;
      // Use device-specific lanes
      const lanes = deviceId === 'test' ? [11, 12, 13] : [11, 12, 31, 32];
      vehicle.laneNo = lanes[Math.floor(Math.random() * lanes.length)];
      vehicle.x = getLaneXPosition(vehicle.laneNo) + (Math.random() - 0.5) * 1.5;
    }
    
    vehicle.lastUpdate = now;
  }
}

// Helper functions
function getLaneXPosition(laneNo: number): number {
  const positions: Record<number, number> = { 11: -3.5, 12: 1.5, 13: 0, 31: -3.5, 32: 1.5 };
  return positions[laneNo] || 0;
}

function getVehicleTypeCode(vehicleType: string): number {
  // Official ClairWav Communication Protocol V2.1 - Video Integrated Models (Section 2.2.2)
  const codes: Record<string, number> = {
    'other': 0,
    'bicycle': 1,
    'motorcycle': 2,
    'tricycle': 3,
    'bus': 4,
    'van': 5,
    'car': 6,
    'suv': 7,
    'large_truck': 8,
    'medium_truck': 9,
    'light_truck': 10,
    'dangerous_goods': 11,
    'engineering_vehicle': 12,
    'pedestrian': 13,
    'medium_bus': 14
  };
  return codes[vehicleType] || 0;
}

function generatePlateNumber(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let plate = '';
  for (let i = 0; i < 3; i++) plate += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 3; i++) plate += numbers[Math.floor(Math.random() * numbers.length)];
  return plate;
}

function getVehicleLength(vehicleType: string): number {
  const lengths: Record<string, number> = { 'car': 4.5, 'motorcycle': 2.0, 'suv': 5.0, 'truck': 8.0 };
  return lengths[vehicleType] || 4.5;
}

function getVehicleWidth(vehicleType: string): number {
  const widths: Record<string, number> = { 'car': 1.8, 'motorcycle': 1.0, 'suv': 2.0, 'truck': 2.5 };
  return widths[vehicleType] || 1.8;
}

function getVehicleHeight(vehicleType: string): number {
  const heights: Record<string, number> = { 'car': 1.5, 'motorcycle': 1.2, 'suv': 1.8, 'truck': 3.0 };
  return heights[vehicleType] || 1.5;
}
