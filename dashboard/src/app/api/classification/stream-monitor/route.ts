/**
 * Stream Processor Monitoring API
 *
 * Endpoints:
 * - GET: Get processor metrics and status
 * - POST: Control processor (start/stop/reclaim)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PassDataStreamProcessor } from '@/lib/passdata-stream-processor';

export const dynamic = 'force-dynamic';

/**
 * GET /api/classification/stream-monitor?deviceId=test
 *
 * Returns processor metrics and pending message count
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';

    const processor = PassDataStreamProcessor.getInstance();
    const metrics = processor.getMetrics();
    const pendingCount = await processor.getPendingCount(deviceId);

    return NextResponse.json({
      success: true,
      deviceId,
      metrics: {
        ...metrics,
        lastProcessedAt: metrics.lastProcessedAt?.toISOString() || null
      },
      pendingMessages: pendingCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[StreamMonitor API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get stream metrics'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/classification/stream-monitor
 *
 * Control actions:
 * - action=start&deviceId=test - Start processor
 * - action=stop - Stop processor
 * - action=reclaim&deviceId=test&minIdleTime=60000 - Reclaim stuck messages
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const deviceId = searchParams.get('deviceId') || 'P1-center';
    const minIdleTime = parseInt(searchParams.get('minIdleTime') || '60000');

    const processor = PassDataStreamProcessor.getInstance();

    switch (action) {
      case 'start':
        // Start in background (non-blocking)
        processor.start(deviceId).catch((error) => {
          console.error('[StreamMonitor API] Processor start error:', error);
        });
        return NextResponse.json({
          success: true,
          message: `Stream processor started for device: ${deviceId}`,
          deviceId
        });

      case 'stop':
        await processor.stop();
        return NextResponse.json({
          success: true,
          message: 'Stream processor stopped'
        });

      case 'reclaim':
        await processor.reclaimStuckMessages(deviceId, minIdleTime);
        return NextResponse.json({
          success: true,
          message: `Reclaimed stuck messages for device: ${deviceId}`,
          deviceId,
          minIdleTime
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Use: start, stop, or reclaim'
          },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('[StreamMonitor API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to control stream processor'
      },
      { status: 500 }
    );
  }
}
