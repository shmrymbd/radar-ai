import { NextRequest, NextResponse } from 'next/server';
import { RedisStorage } from '@/lib/redis-storage';
import { withApiProtection } from '@/lib/middleware';
import { validateAndSanitizeDeviceId } from '@/lib/device-validation';

export async function GET(request: NextRequest) {
  // Apply authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const { searchParams } = new URL(request.url);
    const rawDeviceId = searchParams.get('device');

    // Validate device ID
    const deviceValidation = validateAndSanitizeDeviceId(rawDeviceId, 'P1-center', false);
    if (!deviceValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid device ID',
          details: deviceValidation.error,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const deviceId = deviceValidation.deviceId;
    
    const redisStorage = RedisStorage.getInstance();
    
    // Set the device prefix for this request
    redisStorage.setDevicePrefix(deviceId);
    
    // Get device-specific dashboard summary
    let dashboardSummary = await redisStorage.getDeviceDashboardSummary(deviceId);

    // For test device or when no Redis data, generate dynamic summary
    if (deviceId === 'test' || !dashboardSummary) {
      dashboardSummary = await generateDynamicDashboardSummary(deviceId);
    } else {
      // For real devices with Redis data, enrich laneStatus with vehicle type breakdown
      dashboardSummary = await enrichDashboardWithVehicleBreakdown(dashboardSummary, deviceId);
    }

    return NextResponse.json({
      success: true,
      data: dashboardSummary,
      device: deviceId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Generate dynamic dashboard summary for test devices
 */
async function generateDynamicDashboardSummary(deviceId: string) {
  // Fetch current vehicle data to calculate real-time summary
  // Use dynamic port detection from environment or default to 3000
  const port = process.env.PORT || '3000';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${port}`;
  const vehicleResponse = await fetch(`${baseUrl}/api/tracking/vehicles?device=${deviceId}`);
  const vehicleData = await vehicleResponse.json();
  
  if (!vehicleData.success || !vehicleData.data) {
    return {
      timestamp: new Date(),
      objectData: null,
      laneStatus: null,
      recentPassEvents: [],
      trafficData: null,
      regionData: null,
      summary: {
        totalVehicles: 0,
        averageSpeed: 0,
        lanesWithQueues: 0,
        totalVehiclesOnline: 0,
        averageOccupancyRate: 0,
        totalFlowRate: 0,
        trafficDensity: 0,
        alerts: []
      }
    };
  }
  
  const vehicles = vehicleData.data;
  const totalVehicles = vehicles.length;
  const averageSpeed = totalVehicles > 0 ? vehicles.reduce((sum: number, v: any) => sum + v.position.speed, 0) / totalVehicles : 0;
  const totalVehiclesOnline = vehicles.filter((v: any) => v.isVisible).length;

  // Calculate traffic density (vehicles per km)
  const detectionZoneLength = 0.3; // 300m in km
  const trafficDensity = totalVehicles / detectionZoneLength;

  // Calculate occupancy rate
  const averageOccupancyRate = totalVehiclesOnline > 0 ? (totalVehiclesOnline / 10) * 100 : 0; // Assume max 10 vehicles

  // Generate alerts based on conditions
  const alerts = [];
  if (averageSpeed < 10) alerts.push('Low speed detected');
  if (trafficDensity > 50) alerts.push('High traffic density');
  if (totalVehiclesOnline > 8) alerts.push('High vehicle count');

  // Calculate vehicle type breakdown per lane
  const laneNumbers = [11, 12, 31, 32];
  const laneVehicleTypeBreakdown = new Map<number, Record<string, number>>();

  // Initialize breakdown for each lane
  laneNumbers.forEach(laneNo => {
    laneVehicleTypeBreakdown.set(laneNo, {});
  });

  // Group vehicles by lane and count by type
  vehicles.forEach((vehicle: any) => {
    const laneNo = vehicle.position.laneNo; // Use laneNo not lane
    const vehicleType = vehicle.position.vehicleType || 'other';

    if (laneVehicleTypeBreakdown.has(laneNo)) {
      const breakdown = laneVehicleTypeBreakdown.get(laneNo)!;
      breakdown[vehicleType] = (breakdown[vehicleType] || 0) + 1;
    }
  });

  // Calculate per-lane statistics
  const laneEntries = laneNumbers.map((laneNo, index) => {
    const laneVehicles = vehicles.filter((v: any) => v.position.laneNo === laneNo); // Use laneNo not lane
    const vehicleCount = laneVehicles.length;
    const laneAvgSpeed = vehicleCount > 0 ? laneVehicles.reduce((sum: number, v: any) => sum + v.position.speed, 0) / vehicleCount : 0;
    const vehicleTypeBreakdown = laneVehicleTypeBreakdown.get(laneNo) || {};

    return {
      entryIndex: index,
      lane: {
        number: laneNo,
        description: laneNo <= 13 ? `Upstream Lane ${laneNo - 10} (Inner to Outer)` : `Downstream Lane ${laneNo - 30} (Inner to Outer)`
      },
      queue: {
        length: vehicleCount * 8, // Estimate 8m per vehicle
        head: 0,
        tail: 0,
        vehicleCount: vehicleCount,
        exceedsLimit: vehicleCount > 5,
        overflow: false
      },
      vehicleSpacing: vehicleCount > 0 ? (300 / vehicleCount) : 0,
      vehiclesOnline: vehicleCount,
      vehicleTypeBreakdown: vehicleTypeBreakdown,
      speeds: {
        average: laneAvgSpeed,
        percentile85: laneAvgSpeed * 0.85,
        leadVehicle: laneAvgSpeed * 1.1,
        trailingVehicle: laneAvgSpeed * 0.9
      },
      positions: {
        // Use deterministic calculation based on lane and vehicle count
        leadVehicle: (laneNo * 10 + vehicleCount * 5) % 50 + 10,
        trailingVehicle: (laneNo * 15 + vehicleCount * 3) % 60 + 20
      },
      spaceOccupancyRate: (vehicleCount / 10) * 100,
      reserved: 0
    };
  });

  // Generate realistic lane status data
  const laneStatus = {
    frameType: '0x04',
    frameTypeName: 'Lane Status Data',
    deviceId: deviceId,
    timestamp: new Date(),
    numEntries: 4,
    entriesDecoded: 4,
    entries: laneEntries,
    packetSize: 170,
    summary: {
      totalLanes: 4,
      lanesWithQueues: laneEntries.filter(e => e.queue.length > 20).length,
      averageQueueLength: laneEntries.reduce((sum, e) => sum + e.queue.length, 0) / laneEntries.length,
      totalVehiclesOnline: totalVehiclesOnline,
      averageOccupancyRate: Math.round(averageOccupancyRate * 100) / 100,
      alerts: alerts
    }
  };

  // Generate realistic recent pass events
  const recentPassEvents = [];
  const vehicleTypes = ['car', 'suv', 'truck', 'motorcycle', 'van'];
  const lanes = [11, 12, 31, 32];
  
  for (let i = 0; i < 5; i++) {
    recentPassEvents.push({
      deviceId: deviceId,
      timestamp: new Date(Date.now() - Math.random() * 300000), // Random time in last 5 minutes
      laneNumber: lanes[Math.floor(Math.random() * lanes.length)],
      crossSectionPosition: 30,
      crossSectionSpeed: Math.random() * 40 + 20,
      headwayTime: Math.random() * 5 + 1,
      occupancyDuration: Math.random() * 3 + 1,
      occupancyStatus: Math.random() > 0.5 ? 'entering' : 'exiting',
      vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)]
    });
  }

  return {
    timestamp: new Date(),
    objectData: null,
    laneStatus: laneStatus, // Include lane status with vehicle type breakdown
    recentPassEvents: recentPassEvents,
    trafficData: null,
    regionData: null,
    summary: {
      totalVehicles,
      averageSpeed: Math.round(averageSpeed * 100) / 100,
      lanesWithQueues: Math.min(3, Math.ceil(totalVehicles / 3)), // Estimate based on vehicle count
      totalVehiclesOnline,
      averageOccupancyRate: Math.round(averageOccupancyRate * 100) / 100,
      totalFlowRate: Math.round(trafficDensity * 10), // Convert to flow rate
      trafficDensity: Math.round(trafficDensity * 100) / 100,
      alerts
    }
  };
}

/**
 * Enrich dashboard summary with vehicle type breakdown for all devices
 */
async function enrichDashboardWithVehicleBreakdown(dashboardSummary: any, deviceId: string): Promise<any> {
  // Fetch current vehicle data to calculate vehicle type breakdown
  // Use try-catch to handle fetch failures gracefully
  let vehicleData;
  try {
    // Use dynamic port detection from environment or default to 3000
    const port = process.env.PORT || '3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${port}`;
    const vehicleResponse = await fetch(`${baseUrl}/api/tracking/vehicles?device=${deviceId}`, {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    vehicleData = await vehicleResponse.json();
  } catch (error) {
    console.warn('Failed to fetch vehicle data for breakdown, continuing without it:', error);
    return dashboardSummary;
  }

  if (!vehicleData.success || !vehicleData.data || !dashboardSummary.laneStatus) {
    return dashboardSummary;
  }

  const vehicles = vehicleData.data;

  // Get lane numbers from existing laneStatus
  const laneNumbers = dashboardSummary.laneStatus.entries.map((entry: any) => entry.lane?.number).filter(Boolean);

  // Calculate vehicle type breakdown per lane
  const laneVehicleTypeBreakdown = new Map<number, Record<string, number>>();

  // Initialize breakdown for each lane
  laneNumbers.forEach((laneNo: number) => {
    laneVehicleTypeBreakdown.set(laneNo, {});
  });

  // Group vehicles by lane and count by type
  vehicles.forEach((vehicle: any) => {
    const laneNo = vehicle.position.laneNo;
    const vehicleType = vehicle.position.vehicleType || 'other';

    if (laneVehicleTypeBreakdown.has(laneNo)) {
      const breakdown = laneVehicleTypeBreakdown.get(laneNo)!;
      breakdown[vehicleType] = (breakdown[vehicleType] || 0) + 1;
    }
  });

  // Enrich each lane entry with vehicle type breakdown
  dashboardSummary.laneStatus.entries = dashboardSummary.laneStatus.entries.map((entry: any) => {
    const laneNo = entry.lane?.number;
    const vehicleTypeBreakdown = laneVehicleTypeBreakdown.get(laneNo) || {};

    return {
      ...entry,
      vehicleTypeBreakdown
    };
  });

  return dashboardSummary;
}
