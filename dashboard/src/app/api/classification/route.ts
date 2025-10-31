import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { withApiProtection } from '@/lib/middleware';

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

    // Default to last 24 hours if no time range specified
    if (!startTime && !endTime) {
      filter.timestamp = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    } else if (startTime || endTime) {
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

    // Get vehicles matching filter
    const vehicles = await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(10000) // Limit to 10k records for performance
      .toArray();

    // Calculate metrics from MongoDB data
    const metrics = calculateMetricsFromVehicles(vehicles);
    const summary = calculateSummaryFromVehicles(vehicles);

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        summary,
        deviceId,
        source: 'mongodb',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error fetching classification data:', error);
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
      vehicleTypes: {},
      averageSpeeds: {},
      laneUtilization: {},
      peakHours: {},
      timestamp: new Date().toISOString()
    };
  }

  // Vehicle type counts
  const vehicleTypes: Record<string, { count: number; percentage: number }> = {};
  vehicles.forEach(v => {
    const type = v.vehicleType || 'other';
    if (!vehicleTypes[type]) {
      vehicleTypes[type] = { count: 0, percentage: 0 };
    }
    vehicleTypes[type].count++;
  });

  // Calculate percentages
  Object.keys(vehicleTypes).forEach(type => {
    vehicleTypes[type].percentage = (vehicleTypes[type].count / vehicles.length) * 100;
  });

  // Average speeds by vehicle type
  const speedByType = new Map<string, { total: number; count: number }>();
  vehicles.forEach(v => {
    const type = v.vehicleType || 'other';
    const speed = v.crossSectionSpeed || 0;
    const existing = speedByType.get(type) || { total: 0, count: 0 };
    speedByType.set(type, {
      total: existing.total + speed,
      count: existing.count + 1
    });
  });

  const averageSpeeds: Record<string, number> = {};
  speedByType.forEach((data, type) => {
    averageSpeeds[type] = data.total / data.count;
  });

  // Lane utilization
  const laneUtilization: Record<string, { count: number; percentage: number }> = {};
  vehicles.forEach(v => {
    const lane = String(v.laneNumber || 0);
    if (!laneUtilization[lane]) {
      laneUtilization[lane] = { count: 0, percentage: 0 };
    }
    laneUtilization[lane].count++;
  });

  // Calculate lane percentages
  Object.keys(laneUtilization).forEach(lane => {
    laneUtilization[lane].percentage = (laneUtilization[lane].count / vehicles.length) * 100;
  });

  // Peak hours
  const hourlyCountsMap = new Map<number, number>();
  vehicles.forEach(v => {
    const hour = new Date(v.timestamp).getHours();
    hourlyCountsMap.set(hour, (hourlyCountsMap.get(hour) || 0) + 1);
  });

  const peakHours: Record<string, number> = {};
  hourlyCountsMap.forEach((count, hour) => {
    peakHours[String(hour)] = count;
  });

  return {
    totalVehicles: vehicles.length,
    vehicleTypes,
    averageSpeeds,
    laneUtilization,
    peakHours,
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculate summary statistics from vehicle data
 */
function calculateSummaryFromVehicles(vehicles: any[]) {
  if (vehicles.length === 0) {
    return {
      totalVehicles: 0,
      uniqueVehicleTypes: 0,
      averageSpeed: 0,
      speedViolations: 0,
      peakHour: null,
      trafficComposition: [],
      laneUtilization: []
    };
  }

  // Unique vehicle types
  const uniqueTypes = new Set(vehicles.map(v => v.vehicleType || 'other'));
  const uniqueVehicleTypes = uniqueTypes.size;

  // Average speed
  const totalSpeed = vehicles.reduce((sum, v) => sum + (v.crossSectionSpeed || 0), 0);
  const averageSpeed = totalSpeed / vehicles.length;

  // Speed violations (assuming 60 km/h limit)
  const speedViolations = vehicles.filter(v => (v.crossSectionSpeed || 0) > 60).length;

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

  // Traffic composition
  const typeCountsMap = new Map<string, number>();
  vehicles.forEach(v => {
    const type = v.vehicleType || 'other';
    typeCountsMap.set(type, (typeCountsMap.get(type) || 0) + 1);
  });

  const trafficComposition = Array.from(typeCountsMap.entries()).map(([type, count]) => ({
    type,
    count,
    percentage: (count / vehicles.length) * 100
  }));

  // Lane utilization
  const laneCountsMap = new Map<number, number>();
  vehicles.forEach(v => {
    const lane = v.laneNumber || 0;
    laneCountsMap.set(lane, (laneCountsMap.get(lane) || 0) + 1);
  });

  const laneUtilization = Array.from(laneCountsMap.entries()).map(([lane, count]) => ({
    lane,
    count,
    percentage: (count / vehicles.length) * 100
  }));

  return {
    totalVehicles: vehicles.length,
    uniqueVehicleTypes,
    averageSpeed,
    speedViolations,
    peakHour,
    trafficComposition,
    laneUtilization
  };
}
