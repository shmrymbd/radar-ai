import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  try {
    // Use the singleton Redis client from lib/redis.ts
    const client = await getRedisClient();
    console.log('Using singleton Redis client');

    // Test ping
    const pingResult = await client.ping();
    console.log('Ping result:', pingResult);

    // Test getting data
    const objectData = await client.lRange('Radar04/objectdata', 0, 0);
    const laneStatus = await client.lRange('Radar04/lanestatus', 0, 0);

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
