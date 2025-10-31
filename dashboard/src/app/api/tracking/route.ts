import { NextRequest, NextResponse } from 'next/server';
import { VehicleTracker } from '@/lib/vehicle-tracker';
import { RedisStorage } from '@/lib/redis-storage';
import { ObjectData } from '@/types/radar';
import { withApiProtection } from '@/lib/middleware';

const vehicleTracker = new VehicleTracker();

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
    const objectData = await redisStorage.getDeviceObjectData(deviceId, 1);
    
    if (objectData.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          timestamp: new Date(),
          vehicles: [],
          totalVehicles: 0,
          vehiclesInZone: 0,
          averageSpeed: 0,
          trafficDensity: 0
        },
        message: 'No vehicle data available'
      });
    }

    // Convert ProcessedObjectData to ObjectData format for vehicle tracker
    const rawObjectData: ObjectData = {
      deviceId: objectData[0].deviceId,
      timestamp: objectData[0].timestamp.toISOString(),
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

    // Process the latest object data
    const trackingUpdate = vehicleTracker.processObjectData(rawObjectData);
    const trackingData = vehicleTracker.getTrackingData();

    return NextResponse.json({
      success: true,
      data: trackingData,
      update: trackingUpdate,
      device: deviceId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching tracking data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tracking data',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
