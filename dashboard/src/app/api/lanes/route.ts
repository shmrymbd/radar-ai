import { NextRequest, NextResponse } from 'next/server';
import { RedisStorage } from '@/lib/redis-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const laneNumber = searchParams.get('lane');
    const limit = parseInt(searchParams.get('limit') || '10');

    const redisStorage = RedisStorage.getInstance();
    
    if (laneNumber) {
      // Get specific lane data
      const laneStatus = await redisStorage.getLatestLaneStatus(limit);
      const laneData = laneStatus
        .flatMap(status => status.entries)
        .filter(entry => entry.lane.number === parseInt(laneNumber));
      
      return NextResponse.json({
        success: true,
        data: laneData,
        laneNumber: parseInt(laneNumber),
        timestamp: new Date().toISOString()
      });
    } else {
      // Get all lanes data
      const laneStatus = await redisStorage.getLatestLaneStatus(limit);
      
      return NextResponse.json({
        success: true,
        data: laneStatus,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error fetching lane data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch lane data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
