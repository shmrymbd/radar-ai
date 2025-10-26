import { NextRequest, NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';
import { TimePeriodFilter } from '@/types/classification-history';
import { getClassificationCache } from '@/lib/classification-cache';
import { getApiRateLimiter } from '@/lib/rate-limiter';
import { getPerformanceMonitor } from '@/lib/performance-monitor';

const classificationProcessor = ClassificationProcessor.getInstance();
const cache = getClassificationCache();
const rateLimiter = getApiRateLimiter();
const monitor = getPerformanceMonitor();

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'test';
    const timePeriod = searchParams.get('timePeriod') || '24hrs';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const sortBy = (searchParams.get('sortBy') || 'timestamp') as 'timestamp' | 'totalVehicles';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

    // Get client identifier (IP or deviceId)
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const identifier = `${clientIp}:${deviceId}`;

    // Check rate limit
    const rateLimitResult = rateLimiter.isAllowed(identifier);

    if (!rateLimitResult.allowed) {
      const duration = Date.now() - startTime;
      monitor.recordRequest('/api/classification/historical', 'GET', duration, 429, { error: true });

      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          details: `Too many requests. Please try again in ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds`,
          resetIn: rateLimitResult.resetIn,
          blockedUntil: rateLimitResult.blockedUntil
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetIn.toString(),
            'Retry-After': Math.ceil(rateLimitResult.resetIn / 1000).toString()
          }
        }
      );
    }

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 1000) {
      const duration = Date.now() - startTime;
      monitor.recordRequest('/api/classification/historical', 'GET', duration, 400, { error: true });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid pagination parameters',
          details: 'Page must be >= 1, limit must be between 1 and 1000'
        },
        { status: 400 }
      );
    }

    // Create time filter based on period
    const timeFilter = createTimeFilter(timePeriod);

    // Check cache first
    const cacheKey = { page, limit, sortBy, sortOrder };
    const cachedData = cache.get(deviceId, timePeriod, cacheKey);

    if (cachedData) {
      const duration = Date.now() - startTime;
      monitor.recordRequest('/api/classification/historical', 'GET', duration, 200, { cached: true });

      return NextResponse.json(
        {
          success: true,
          data: cachedData.data,
          pagination: cachedData.pagination,
          deviceId,
          timePeriod,
          cached: true,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetIn.toString(),
            'X-Cache': 'HIT'
          }
        }
      );
    }

    // Get historical data with pagination
    const result = await classificationProcessor.getHistoricalChartData(
      deviceId,
      timeFilter,
      { page, limit, sortBy, sortOrder }
    );

    // Cache the result (5 minutes TTL)
    cache.set(deviceId, timePeriod, result, cacheKey, 5 * 60 * 1000);

    const duration = Date.now() - startTime;
    monitor.recordRequest('/api/classification/historical', 'GET', duration, 200, { cached: false });

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        pagination: result.pagination,
        deviceId,
        timePeriod,
        cached: false,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetIn.toString(),
          'X-Cache': 'MISS',
          'X-Response-Time': `${duration}ms`
        }
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    monitor.recordRequest('/api/classification/historical', 'GET', duration, 500, { error: true });

    console.error('❌ Error fetching historical classification data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch historical data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function createTimeFilter(timePeriod: string): TimePeriodFilter {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;
  
  switch (timePeriod) {
    case '24hrs':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      startDate = yesterday;
      endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return {
    type: timePeriod as '24hrs' | 'yesterday' | 'month',
    startDate,
    endDate
  };
}
