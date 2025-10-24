import { NextResponse } from 'next/server';
import { VehicleTracker } from '@/lib/vehicle-tracker';
import { RedisStorage } from '@/lib/redis-storage';

const vehicleTracker = new VehicleTracker();

export async function GET() {
  try {
    const redisStorage = RedisStorage.getInstance();
    
    // Get latest object data from Redis
    const objectData = await redisStorage.getLatestObjectData(1);
    
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

    // Process the latest object data
    const trackingUpdate = vehicleTracker.processObjectData(objectData[0]);
    const trackingData = vehicleTracker.getTrackingData();

    return NextResponse.json({
      success: true,
      data: trackingData,
      update: trackingUpdate,
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
