import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { withApiProtection } from '@/lib/middleware';
import { validateAndSanitizeDeviceId } from '@/lib/device-validation';

export async function GET(request: NextRequest) {
  // Authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    // Get and validate device ID
    const { searchParams } = new URL(request.url);
    const rawDeviceId = searchParams.get('device');

    const deviceValidation = validateAndSanitizeDeviceId(rawDeviceId, 'P1-center', false);
    if (!deviceValidation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid device ID',
        details: deviceValidation.error,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const deviceId = deviceValidation.deviceId;

    // Use the singleton Redis client from lib/redis.ts
    const client = await getRedisClient();
    console.log(`Using singleton Redis client for device: ${deviceId}`);

    // Test ping
    const pingResult = await client.ping();
    console.log('Ping result:', pingResult);

    // Test getting data with dynamic device ID
    const objectData = await client.lRange(`${deviceId}/objectdata`, 0, 0);
    const laneStatus = await client.lRange(`${deviceId}/lanestatus`, 0, 0);

    return NextResponse.json({
      success: true,
      deviceId,
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
