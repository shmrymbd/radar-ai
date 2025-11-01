import { NextResponse } from 'next/server';
import { VehicleTracker } from '@/lib/vehicle-tracker';
import { RedisStorage } from '@/lib/redis-storage';
import { ObjectData } from '@/types/radar';

const vehicleTracker = new VehicleTracker();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ targetId: string }> }
) {
  try {
    const { targetId } = await params;
    
    if (!targetId) {
      return NextResponse.json({
        success: false,
        error: 'Target ID is required'
      }, { status: 400 });
    }

    const redisStorage = RedisStorage.getInstance();
    
    // Get latest object data from Redis
    const objectData = await redisStorage.getLatestObjectData(1);
    
    if (objectData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No vehicle data available'
      }, { status: 404 });
    }

    // Convert ObjectData format for vehicle tracker (already ObjectData from Redis)
    const rawObjectData: ObjectData = {
      deviceId: objectData[0].deviceId,
      timestamp: typeof objectData[0].timestamp === 'string' 
        ? objectData[0].timestamp 
        : (objectData[0].timestamp && typeof objectData[0].timestamp === 'object' && 'toISOString' in objectData[0].timestamp ? (objectData[0].timestamp as Date).toISOString() : new Date().toISOString()),
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

    // Get device ID from object data
    const deviceId = objectData[0].deviceId || 'P1-center';
    vehicleTracker.setDeviceId(deviceId);
    
    // Process the latest object data
    await vehicleTracker.processObjectData(rawObjectData);
    const vehicle = await vehicleTracker.getVehicle(targetId);

    if (!vehicle) {
      return NextResponse.json({
        success: false,
        error: 'Vehicle not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: vehicle,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching vehicle details:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch vehicle details',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
