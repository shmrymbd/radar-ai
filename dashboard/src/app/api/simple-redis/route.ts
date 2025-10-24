import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  try {
    // Create a new Redis client for this test
    const client = createClient({
      url: `redis://${process.env.REDIS_HOST || '192.168.6.22'}:${process.env.REDIS_PORT || '6379'}`,
    });

    // Connect to Redis
    await client.connect();
    console.log('Connected to Redis');

    // Test ping
    const pingResult = await client.ping();
    console.log('Ping result:', pingResult);

    // Test getting data - try different method names
    console.log('Available methods:', Object.getOwnPropertyNames(client).filter(name => typeof client[name] === 'function'));
    
    // Try lRange (capital R) instead of lrange
    const objectData = await client.lRange('Radar04/objectdata', 0, 0);
    const laneStatus = await client.lRange('Radar04/lanestatus', 0, 0);

    // Close connection
    await client.disconnect();

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
