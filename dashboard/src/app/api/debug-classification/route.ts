import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function GET() {
  try {
    console.log('🔍 Debugging classification processor...');
    
    // Check if the processor has any data
    const deviceId = 'test';
    
    // Try to get metrics without processing new data
    const metrics = classificationProcessor.getClassificationMetrics(deviceId);
    console.log('📊 Current metrics:', metrics);
    
    // Check internal data structures
    const processor = classificationProcessor as any;
    const classificationData = processor.classificationData;
    const timeBasedData = processor.timeBasedData;
    
    console.log('📈 Classification data size:', classificationData?.size || 0);
    console.log('⏰ Time-based data size:', timeBasedData?.size || 0);
    
    // Check if device data exists
    const deviceClassificationData = classificationData?.get(deviceId);
    const deviceTimeBasedData = timeBasedData?.get(deviceId);
    
    console.log('🔧 Device classification data:', deviceClassificationData?.size || 0);
    console.log('🕐 Device time-based data:', deviceTimeBasedData?.size || 0);
    
    // Try to process a simple test entry
    const testData = {
      deviceId: 'test',
      timestamp: new Date(),
      laneNumber: 11,
      crossSectionPosition: 25.5,
      crossSectionSpeed: 45.2,
      headwayTime: 2.1,
      occupancyDuration: 1.8,
      occupancyStatus: 'entering',
      vehicleType: 'car'
    };
    
    console.log('🧪 Testing with simple data:', testData);
    
    try {
      classificationProcessor.processPassDataForClassification(testData, deviceId);
      console.log('✅ Simple test data processed successfully');
    } catch (error) {
      console.error('❌ Error processing simple test data:', error);
    }
    
    // Get updated metrics
    const updatedMetrics = classificationProcessor.getClassificationMetrics(deviceId);
    console.log('📊 Updated metrics:', updatedMetrics);
    
    return NextResponse.json({
      success: true,
      debug: {
        originalMetrics: metrics,
        updatedMetrics: updatedMetrics,
        classificationDataSize: classificationData?.size || 0,
        timeBasedDataSize: timeBasedData?.size || 0,
        deviceClassificationDataSize: deviceClassificationData?.size || 0,
        deviceTimeBasedDataSize: deviceTimeBasedData?.size || 0,
        testDataProcessed: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
