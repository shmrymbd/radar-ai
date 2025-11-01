import { NextRequest, NextResponse } from 'next/server';
import { ClassificationHistoryStorage } from '@/lib/classification-history-storage';
import { TimePeriodFilter } from '@/types/classification-history';
import { getClassificationCache } from '@/lib/classification-cache';
import { getApiRateLimiter } from '@/lib/rate-limiter';
import { getPerformanceMonitor } from '@/lib/performance-monitor';
import { connectToDatabase } from '@/lib/mongodb';

// Use MongoDB storage directly instead of deprecated processor
const historyStorage = new ClassificationHistoryStorage();
const cache = getClassificationCache();
const rateLimiter = getApiRateLimiter();
const monitor = getPerformanceMonitor();

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';
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

    // Check for cache bypass parameter (e.g., _t timestamp from refresh button)
    const bypassCache = searchParams.has('_t');

    // Check cache first (unless bypassed)
    const cacheKey = { page, limit, sortBy, sortOrder };
    if (!bypassCache) {
      const cachedData = cache.get<{ data: any[]; pagination: any }>(deviceId, timePeriod, cacheKey);

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
    } else {
      console.log('🔄 Cache bypassed due to refresh request');
    }

    // Try to get historical data from classification_history collection
    let result = await historyStorage.getHistoricalData(
      deviceId,
      timeFilter,
      { page, limit, sortBy, sortOrder }
    );

    // If no historical data exists, aggregate from PassData on-the-fly
    if (!result.data || result.data.length === 0) {
      console.log(`📊 No historical data found for ${deviceId}, aggregating from PassData...`);
      result = await aggregatePassDataHistorically(deviceId, timeFilter, { page, limit, sortBy, sortOrder }) as any;
    }

    // Cache TTL based on time period:
    // - 24hrs (real-time): 30 seconds for fresh data
    // - yesterday/month (historical): 5 minutes (less frequent changes)
    const cacheTTL = timePeriod === '24hrs' ? 30 * 1000 : 5 * 60 * 1000;
    cache.set(deviceId, timePeriod, result, cacheKey, cacheTTL);

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

/**
 * Aggregate PassData from MongoDB into 15-minute time slots for historical charts
 * This is a fallback when no pre-aggregated data exists in classification_history collection
 */
async function aggregatePassDataHistorically(
  deviceId: string,
  timeFilter: TimePeriodFilter,
  options?: {
    page?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'totalVehicles';
    sortOrder?: 'asc' | 'desc';
  }
) {
  try {
    const db = await connectToDatabase();
    const passdataCollection = db.collection('passdata');

    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const sortOrder = options?.sortOrder === 'desc' ? -1 : 1;

    // Aggregate PassData into 15-minute time slots
    const pipeline = [
      {
        $match: {
          deviceId,
          timestamp: {
            $gte: timeFilter.startDate,
            $lte: timeFilter.endDate
          }
        }
      },
      {
        $project: {
          deviceId: 1,
          vehicleType: 1,
          speed: '$crossSectionSpeed',
          laneNum: '$laneNumber',
          timestamp: 1,
          // Convert UTC timestamp to UTC+8 (Asia/Kuala_Lumpur) for grouping
          // Add 8 hours in milliseconds (8 * 60 * 60 * 1000 = 28800000)
          localTimestamp: {
            $add: ['$timestamp', 28800000]
          }
        }
      },
      {
        $project: {
          deviceId: 1,
          vehicleType: 1,
          speed: 1,
          laneNum: 1,
          timestamp: 1,
          // Extract date components from local timestamp (UTC+8)
          year: { $year: '$localTimestamp' },
          month: { $month: '$localTimestamp' },
          day: { $dayOfMonth: '$localTimestamp' },
          hour: { $hour: '$localTimestamp' },
          // Round minutes to nearest 15-minute interval (0, 15, 30, 45)
          minute: {
            $multiply: [
              { $floor: { $divide: [{ $minute: '$localTimestamp' }, 15] } },
              15
            ]
          }
        }
      },
      {
        $project: {
          deviceId: 1,
          vehicleType: 1,
          speed: 1,
          laneNum: 1,
          timestamp: 1,
          // Format as YYYY-MM-DD-HH-MM
          timeSlot: {
            $concat: [
              { $toString: '$year' },
              '-',
              { $cond: [
                { $lt: ['$month', 10] },
                { $concat: ['0', { $toString: '$month' }] },
                { $toString: '$month' }
              ]},
              '-',
              { $cond: [
                { $lt: ['$day', 10] },
                { $concat: ['0', { $toString: '$day' }] },
                { $toString: '$day' }
              ]},
              '-',
              { $cond: [
                { $lt: ['$hour', 10] },
                { $concat: ['0', { $toString: '$hour' }] },
                { $toString: '$hour' }
              ]},
              '-',
              { $cond: [
                { $lt: ['$minute', 10] },
                { $concat: ['0', { $toString: '$minute' }] },
                { $toString: '$minute' }
              ]}
            ]
          }
        }
      },
      {
        $group: {
          _id: '$timeSlot',
          totalVehicles: { $sum: 1 },
          avgSpeed: { $avg: '$speed' },
          speedViolations: {
            $sum: {
              $cond: [{ $gt: ['$speed', 60] }, 1, 0]
            }
          },
          // All 15 vehicle types from ClairWav Protocol V2.1 (codes 0-14)
          other: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['other', '0']] }, 1, 0]
            }
          },
          bicycle: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['bicycle', '1']] }, 1, 0]
            }
          },
          motorcycle: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['motorcycle', '2']] }, 1, 0]
            }
          },
          tricycle: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['tricycle', '3']] }, 1, 0]
            }
          },
          bus: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['bus', '4']] }, 1, 0]
            }
          },
          van: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['van', '5']] }, 1, 0]
            }
          },
          car: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['car', '6']] }, 1, 0]
            }
          },
          suv: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['suv', '7']] }, 1, 0]
            }
          },
          large_truck: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['large_truck', '8']] }, 1, 0]
            }
          },
          medium_truck: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['medium_truck', '9']] }, 1, 0]
            }
          },
          light_truck: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['light_truck', '10']] }, 1, 0]
            }
          },
          dangerous_goods: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['dangerous_goods', '11']] }, 1, 0]
            }
          },
          engineering_vehicle: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['engineering_vehicle', '12']] }, 1, 0]
            }
          },
          pedestrian: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['pedestrian', '13']] }, 1, 0]
            }
          },
          medium_bus: {
            $sum: {
              $cond: [{ $in: ['$vehicleType', ['medium_bus', '14']] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { _id: sortOrder }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ];

    const [data, totalCount] = await Promise.all([
      passdataCollection.aggregate(pipeline).toArray(),
      passdataCollection.countDocuments({
        deviceId,
        timestamp: {
          $gte: timeFilter.startDate,
          $lte: timeFilter.endDate
        }
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: data.map((item: any) => ({
        timeSlot: item._id,
        vehicleTypes: {
          other: item.other || 0,
          bicycle: item.bicycle || 0,
          motorcycle: item.motorcycle || 0,
          tricycle: item.tricycle || 0,
          bus: item.bus || 0,
          van: item.van || 0,
          car: item.car || 0,
          suv: item.suv || 0,
          large_truck: item.large_truck || 0,
          medium_truck: item.medium_truck || 0,
          light_truck: item.light_truck || 0,
          dangerous_goods: item.dangerous_goods || 0,
          engineering_vehicle: item.engineering_vehicle || 0,
          pedestrian: item.pedestrian || 0,
          medium_bus: item.medium_bus || 0
        },
        totalVehicles: item.totalVehicles || 0,
        averageSpeed: item.avgSpeed || 0,
        speedViolations: item.speedViolations || 0
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('❌ Error aggregating PassData historically:', error);
    throw error;
  }
}
