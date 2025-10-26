import { NextRequest, NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';
import { RedisStorage } from '@/lib/redis-storage';

const classificationProcessor = ClassificationProcessor.getInstance();
const redisStorage = RedisStorage.getInstance();

export async function POST(request: NextRequest) {
  try {
    console.log('📡 Processing real radar data from Redis...');
    
    // Get real pass data from Redis
    const realPassData = await redisStorage.getLatestPassData(50); // Get last 50 entries
    
    if (realPassData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No real radar data available in Redis',
        message: 'Please ensure radar data is being streamed to Redis'
      }, { status: 404 });
    }
    
    console.log(`📊 Found ${realPassData.length} real pass data entries`);
    
    // Process each real data entry for classification
    let processedCount = 0;
    for (const data of realPassData) {
      try {
        // Convert vehicle type name to string for classification
        let vehicleType = data.vehicleType;
        if (typeof vehicleType === 'string') {
          // Map string vehicle types to classification strings
          const typeMap: { [key: string]: string } = {
            'car': 'car',
            'van': 'van',
            'suv': 'suv',
            'truck': 'truck',
            'motorcycle': 'motorcycle',
            'bus': 'van', // Map bus to van for classification
            'unknown': 'car' // Default to car for unknown types
          };
          vehicleType = typeMap[vehicleType.toLowerCase()] || 'car';
        }
        
        // Create processed data with proper vehicle type and device ID
        const processedData = {
          ...data,
          vehicleType: vehicleType,
          deviceId: 'test' // Use 'test' device ID for classification processor
        };
        
        classificationProcessor.processPassDataForClassification(processedData, 'test');
        processedCount++;
      } catch (error) {
        console.error(`Error processing entry:`, error);
        // Continue processing other entries
      }
    }
    
    console.log(`✅ Successfully processed ${processedCount} real radar data entries`);
    
    // Get updated metrics
    const metrics = classificationProcessor.getClassificationMetrics('test');
    const summary = classificationProcessor.getClassificationSummary('test');
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedCount} real radar data entries`,
      data: {
        processedCount,
        totalAvailable: realPassData.length,
        metrics,
        summary,
        sampleData: realPassData.slice(0, 3) // Show first 3 entries as sample
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error processing real radar data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process real radar data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}