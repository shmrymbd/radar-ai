import { NextRequest, NextResponse } from 'next/server';
import { ClassificationRedisPoller } from '@/lib/classification-redis-poller';

const poller = ClassificationRedisPoller.getInstance();

/**
 * Redis poller control endpoint
 *
 * GET: Get poller status and statistics
 * POST: Start the poller
 * DELETE: Stop the poller
 * PATCH: Update poller configuration
 */

export async function GET(request: NextRequest) {
  try {
    const stats = poller.getStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting poller stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get poller statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resetTimestamp = searchParams.get('resetTimestamp') === 'true';

    if (resetTimestamp) {
      poller.resetTimestamp();
    }

    poller.start();

    return NextResponse.json({
      success: true,
      message: 'Redis poller started',
      stats: poller.getStats(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error starting poller:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start poller',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    poller.stop();

    return NextResponse.json({
      success: true,
      message: 'Redis poller stopped',
      stats: poller.getStats(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error stopping poller:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to stop poller',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.pollIntervalMs && typeof body.pollIntervalMs === 'number') {
      if (body.pollIntervalMs < 5000 || body.pollIntervalMs > 300000) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid poll interval',
            details: 'Poll interval must be between 5000ms (5s) and 300000ms (5min)'
          },
          { status: 400 }
        );
      }
      poller.setPollInterval(body.pollIntervalMs);
    }

    if (body.deviceIds && Array.isArray(body.deviceIds)) {
      if (body.deviceIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid device list',
            details: 'Device list cannot be empty'
          },
          { status: 400 }
        );
      }
      poller.setDevices(body.deviceIds);
    }

    return NextResponse.json({
      success: true,
      message: 'Poller configuration updated',
      stats: poller.getStats(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error updating poller config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update poller configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
