import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';
import { RadarDataProcessor } from '@/lib/radar-processor';
import { RedisStorage } from '@/lib/redis-storage';

const classificationProcessor = ClassificationProcessor.getInstance();
const radarProcessor = RadarDataProcessor.getInstance();
const redisStorage = RedisStorage.getInstance();

export async function POST() {
  try {
    console.log('🔄 Auto-processing latest radar data for classification...');
    
    // Get only the most recent pass events (last 5 minutes)
    const recentPassEvents = await redisStorage.getLatestPassData(10);
    
    if (recentPassEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new pass events to process',
        data: { processedCount: 0, totalVehicles: 0 }
      });
    }

    // Filter events from the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEvents = recentPassEvents.filter(event => 
      new Date(event.timestamp) > fiveMinutesAgo
    );

    if (recentEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No recent pass events in the last 5 minutes',
        data: { processedCount: 0, totalVehicles: 0 }
      });
    }

    console.log(`📊 Processing ${recentEvents.length} recent pass events`);
    
    // Process each recent pass event
    let processedCount = 0;
    for (const passEvent of recentEvents) {
      try {
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

        radarProcessor.processPassData(passData);
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing pass event:`, error);
      }
    }

    // Get updated metrics
    const metrics = classificationProcessor.getClassificationMetrics();
    const summary = classificationProcessor.getClassificationSummary();

    console.log(`🎯 Auto-processed ${processedCount} new vehicles. Total: ${metrics.totalVehicles}`);

    return NextResponse.json({
      success: true,
      message: `Auto-processed ${processedCount} new pass events`,
      data: {
        processedCount,
        totalVehicles: metrics.totalVehicles,
        newVehicles: processedCount,
        vehicleTypes: metrics.vehicleTypes.map(vt => ({
          type: vt.vehicleType,
          count: vt.count,
          percentage: vt.percentage
        })),
        averageSpeed: summary.averageSpeed,
        uniqueVehicleTypes: summary.uniqueVehicleTypes
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Error in auto-processing:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to auto-process radar data',
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
  
  const normalizedType = vehicleType.toLowerCase().replace(/\s+/g, '_');
  return typeMap[normalizedType] || 1;
}
