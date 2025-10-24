import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  try {
    // Test Redis connection
    const redisClient = await getRedisClient();
    const pingResult = await redisClient.ping();
    console.log('Redis ping result:', pingResult);

    // Test getting data from Redis
    const objectData = await redisClient.lrange('Radar04/objectdata', 0, 0);
    const laneStatus = await redisClient.lrange('Radar04/lanestatus', 0, 0);
    
    return NextResponse.json({
      success: true,
      redisConnected: pingResult === 'PONG',
      objectDataCount: objectData.length,
      laneStatusCount: laneStatus.length,
      sampleObjectData: objectData[0] ? JSON.parse(objectData[0]) : null,
      sampleLaneStatus: laneStatus[0] ? JSON.parse(laneStatus[0]) : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Redis test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
