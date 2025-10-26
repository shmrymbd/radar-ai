import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceMonitor } from '@/lib/performance-monitor';
import { getApiRateLimiter, getExportRateLimiter } from '@/lib/rate-limiter';

const monitor = getPerformanceMonitor();
const apiLimiter = getApiRateLimiter();
const exportLimiter = getExportRateLimiter();

/**
 * Performance monitoring and rate limiting statistics endpoint
 *
 * GET: Get monitoring statistics
 *
 * Query parameters:
 * - type: 'performance' | 'rate-limit' | 'all' (default: 'all')
 * - timeWindow: Time window in minutes (default: 60)
 * - endpoint: Specific endpoint to filter (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const timeWindowMinutes = parseInt(searchParams.get('timeWindow') || '60', 10);
    const endpoint = searchParams.get('endpoint');

    const timeWindowMs = timeWindowMinutes * 60 * 1000;
    const response: any = {
      success: true,
      timestamp: new Date().toISOString()
    };

    // Performance metrics
    if (type === 'performance' || type === 'all') {
      if (endpoint) {
        response.performance = {
          endpoint: monitor.getEndpointMetrics(endpoint, timeWindowMs),
          overall: monitor.getOverallStats()
        };
      } else {
        response.performance = {
          endpoints: monitor.getAllMetrics(timeWindowMs),
          overall: monitor.getOverallStats(),
          slowRequests: monitor.getSlowRequests(1000, 20),
          errors: monitor.getErrors(20)
        };
      }
    }

    // Rate limiting stats
    if (type === 'rate-limit' || type === 'all') {
      response.rateLimiting = {
        api: apiLimiter.getStats(),
        export: exportLimiter.getStats()
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting monitoring stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get monitoring statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
