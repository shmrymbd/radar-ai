import { NextRequest, NextResponse } from 'next/server';
import { getClassificationCache } from '@/lib/classification-cache';

const cache = getClassificationCache();

/**
 * Cache management endpoints
 *
 * GET: Get cache statistics
 * DELETE: Invalidate cache entries
 */

export async function GET(request: NextRequest) {
  try {
    const stats = cache.getStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (deviceId) {
      // Invalidate specific device
      cache.invalidateDevice(deviceId);

      return NextResponse.json({
        success: true,
        message: `Cache invalidated for device: ${deviceId}`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Invalidate all
      cache.invalidateAll();

      return NextResponse.json({
        success: true,
        message: 'All cache entries invalidated',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error invalidating cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to invalidate cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
