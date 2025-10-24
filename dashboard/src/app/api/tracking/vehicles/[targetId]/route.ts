import { NextResponse } from 'next/server';
import { VehicleTracker } from '@/lib/vehicle-tracker';
import { RedisStorage } from '@/lib/redis-storage';

const vehicleTracker = new VehicleTracker();

export async function GET(
  request: Request,
  { params }: { params: { targetId: string } }
) {
  try {
    const { targetId } = params;
    
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

    // Process the latest object data
    vehicleTracker.processObjectData(objectData[0]);
    const vehicle = vehicleTracker.getVehicle(targetId);

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
