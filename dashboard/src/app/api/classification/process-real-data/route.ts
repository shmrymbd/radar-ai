import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';
import { RadarDataProcessor } from '@/lib/radar-processor';
import { RedisStorage } from '@/lib/redis-storage';

const classificationProcessor = ClassificationProcessor.getInstance();
const radarProcessor = RadarDataProcessor.getInstance();
const redisStorage = RedisStorage.getInstance();

export async function POST() {
  try {
    console.log('🔄 Processing real radar data for classification...');
    
    // Get recent pass events from Redis
    const recentPassEvents = await redisStorage.getLatestPassData(20);
    
    if (recentPassEvents.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No recent pass events found in Redis',
        data: { processedCount: 0 }
      });
    }

    console.log(`📊 Found ${recentPassEvents.length} recent pass events`);
    
    // Process each pass event through the radar processor
    // This will automatically feed data to the classification processor
    let processedCount = 0;
    for (const passEvent of recentPassEvents) {
      try {
        // Convert the pass event to the format expected by radar processor
        const passData = {
          frameType: '0x05' as const,
          deviceId: passEvent.deviceId,
          timestamp: passEvent.timestamp.toISOString(),
          laneNumber: passEvent.laneNumber,
          crossSectionPosition: passEvent.crossSectionPosition,
          crossSectionSpeed: passEvent.crossSectionSpeed,
          headwayTime: passEvent.headwayTime,
          passingTime: passEvent.timestamp.toISOString(),
          occupancyDuration: passEvent.occupancyDuration,
          occupancyStatus: passEvent.occupancyStatus === 'entering' ? 1 : 0,
          vehicleType: getVehicleTypeCode(passEvent.vehicleType)
        };

        // Process through radar processor (this will automatically call classification processor)
        radarProcessor.processPassData(passData);
        processedCount++;
        
        console.log(`✅ Processed vehicle: ${passEvent.vehicleType} at ${passEvent.timestamp.toISOString()}`);
      } catch (error) {
        console.error(`❌ Error processing pass event:`, error);
      }
    }

    // Get updated classification metrics
    const metrics = classificationProcessor.getClassificationMetrics();
    const summary = classificationProcessor.getClassificationSummary();

    console.log(`🎯 Classification data updated: ${metrics.totalVehicles} total vehicles`);

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} real pass events`,
      data: {
        processedCount,
        totalVehicles: metrics.totalVehicles,
        vehicleTypes: metrics.vehicleTypes.map(vt => vt.vehicleType),
        timeRange: 'Real radar data',
        metrics: {
          totalVehicles: metrics.totalVehicles,
          uniqueVehicleTypes: summary.uniqueVehicleTypes,
          averageSpeed: summary.averageSpeed
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Error processing real data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process real radar data',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to convert vehicle type names to numeric codes
function getVehicleTypeCode(vehicleType: string): number {
  const typeMap: { [key: string]: number } = {
    'car': 1,
    'van': 2,
    'suv': 3,
    'truck': 4,
    'bicycle': 5,
    'motorcycle': 6,
    'bus': 7,
    'large_truck': 8,
    'medium_truck': 9,
    'light_truck': 10,
    'dangerous_goods': 11,
    'engineering_vehicle': 12,
    'pedestrian': 13
  };
  
  // Handle case variations
  const normalizedType = vehicleType.toLowerCase().replace(/\s+/g, '_');
  return typeMap[normalizedType] || 1; // Default to car if unknown
}
