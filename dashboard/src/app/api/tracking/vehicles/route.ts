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
        data: [],
        message: 'No vehicle data available'
      });
    }

    // Process the latest object data
    vehicleTracker.processObjectData(objectData[0]);
    const visibleVehicles = vehicleTracker.getVisibleVehicles();

    return NextResponse.json({
      success: true,
      data: visibleVehicles,
      count: visibleVehicles.length,
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
