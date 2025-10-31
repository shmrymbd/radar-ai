import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { withApiProtection } from '@/lib/middleware';

/**
 * Classification API that queries MongoDB directly
 * This replaces the in-memory ClassificationProcessor approach
 */
export async function GET(request: NextRequest) {
  // Apply authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const vehicleTypes = searchParams.get('vehicleTypes')?.split(',');
    const lanes = searchParams.get('lanes')?.split(',').map(Number);

    const db = await connectToDatabase();
    const collection = db.collection('passdata');

    // Build query filter
    const filter: any = { deviceId };

    if (startTime || endTime) {
      filter.timestamp = {};
      if (startTime) filter.timestamp.$gte = new Date(startTime);
      if (endTime) filter.timestamp.$lte = new Date(endTime);
    }

    if (vehicleTypes && vehicleTypes.length > 0) {
      filter.vehicleType = { $in: vehicleTypes };
    }

    if (lanes && lanes.length > 0) {
      filter.laneNumber = { $in: lanes };
    }

    // Get all vehicles matching filter
    const vehicles = await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .toArray();

    // Calculate metrics from MongoDB data
    const metrics = calculateMetricsFromVehicles(vehicles);
    const summary = calculateSummaryFromVehicles(vehicles);

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        summary,
        source: 'mongodb',
        filters: {
          deviceId,
          vehicleTypes,
          lanes,
          startTime,
          endTime
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error fetching classification data from MongoDB:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch classification data',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Calculate classification metrics from vehicle data
 */
function calculateMetricsFromVehicles(vehicles: any[]) {
  if (vehicles.length === 0) {
    return {
      totalVehicles: 0,
      vehicleTypeCounts: [],
      laneDistribution: [],
      averageSpeed: 0,
      speedByVehicleType: [],
      hourlyDistribution: []
    };
  }

  // Vehicle type counts
  const typeCountsMap = new Map<string, number>();
  vehicles.forEach(v => {
    const type = v.vehicleType || 'unknown';
    typeCountsMap.set(type, (typeCountsMap.get(type) || 0) + 1);
  });

  const vehicleTypeCounts = Array.from(typeCountsMap.entries()).map(([type, count]) => ({
    type,
    count,
    percentage: (count / vehicles.length) * 100
  }));

  // Lane distribution
  const laneCountsMap = new Map<number, number>();
  vehicles.forEach(v => {
    const lane = v.laneNumber || 0;
    laneCountsMap.set(lane, (laneCountsMap.get(lane) || 0) + 1);
  });

  const laneDistribution = Array.from(laneCountsMap.entries()).map(([lane, count]) => ({
    lane,
    count,
    percentage: (count / vehicles.length) * 100
  }));

  // Average speed
  const totalSpeed = vehicles.reduce((sum, v) => sum + (v.crossSectionSpeed || 0), 0);
  const averageSpeed = totalSpeed / vehicles.length;

  // Speed by vehicle type
  const speedByType = new Map<string, { total: number; count: number }>();
  vehicles.forEach(v => {
    const type = v.vehicleType || 'unknown';
    const speed = v.crossSectionSpeed || 0;
    const existing = speedByType.get(type) || { total: 0, count: 0 };
    speedByType.set(type, {
      total: existing.total + speed,
      count: existing.count + 1
    });
  });

  const speedByVehicleType = Array.from(speedByType.entries()).map(([type, data]) => ({
    type,
    averageSpeed: data.total / data.count
  }));

  // Hourly distribution
  const hourlyCountsMap = new Map<number, number>();
  vehicles.forEach(v => {
    const hour = new Date(v.timestamp).getHours();
    hourlyCountsMap.set(hour, (hourlyCountsMap.get(hour) || 0) + 1);
  });

  const hourlyDistribution = Array.from(hourlyCountsMap.entries()).map(([hour, count]) => ({
    hour,
    count
  }));

  return {
    totalVehicles: vehicles.length,
    vehicleTypeCounts,
    laneDistribution,
    averageSpeed,
    speedByVehicleType,
    hourlyDistribution
  };
}

/**
 * Calculate summary statistics from vehicle data
 */
function calculateSummaryFromVehicles(vehicles: any[]) {
  if (vehicles.length === 0) {
    return {
      totalVehicles: 0,
      timeRange: null,
      peakHour: null,
      busiestLane: null,
      averageSpeed: 0
    };
  }

  // Time range
  const timestamps = vehicles.map(v => new Date(v.timestamp).getTime());
  const timeRange = {
    start: new Date(Math.min(...timestamps)),
    end: new Date(Math.max(...timestamps))
  };

  // Peak hour
  const hourlyCountsMap = new Map<number, number>();
  vehicles.forEach(v => {
    const hour = new Date(v.timestamp).getHours();
    hourlyCountsMap.set(hour, (hourlyCountsMap.get(hour) || 0) + 1);
  });

  let peakHour = null;
  let maxCount = 0;
  hourlyCountsMap.forEach((count, hour) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = { hour, count };
    }
  });

  // Busiest lane
  const laneCountsMap = new Map<number, number>();
  vehicles.forEach(v => {
    const lane = v.laneNumber || 0;
    laneCountsMap.set(lane, (laneCountsMap.get(lane) || 0) + 1);
  });

  let busiestLane = null;
  maxCount = 0;
  laneCountsMap.forEach((count, lane) => {
    if (count > maxCount) {
      maxCount = count;
      busiestLane = { lane, count };
    }
  });

  // Average speed
  const totalSpeed = vehicles.reduce((sum, v) => sum + (v.crossSectionSpeed || 0), 0);
  const averageSpeed = totalSpeed / vehicles.length;

  return {
    totalVehicles: vehicles.length,
    timeRange,
    peakHour,
    busiestLane,
    averageSpeed
  };
}
