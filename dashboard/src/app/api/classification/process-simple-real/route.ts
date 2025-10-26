import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function POST() {
  try {
    console.log('📡 Processing simple real data for classification...');
    
    // Create some simple test data based on real radar patterns
    const testData = [
      {
        deviceId: 'test',
        timestamp: new Date(),
        laneNumber: 11,
        crossSectionPosition: 25.5,
        crossSectionSpeed: 45.2,
        headwayTime: 2.1,
        occupancyDuration: 1.8,
        occupancyStatus: 'entering',
        vehicleType: 'car'
      },
      {
        deviceId: 'test',
        timestamp: new Date(),
        laneNumber: 12,
        crossSectionPosition: 30.2,
        crossSectionSpeed: 52.1,
        headwayTime: 1.8,
        occupancyDuration: 2.2,
        occupancyStatus: 'entering',
        vehicleType: 'suv'
      },
      {
        deviceId: 'test',
        timestamp: new Date(),
        laneNumber: 31,
        crossSectionPosition: 28.7,
        crossSectionSpeed: 38.5,
        headwayTime: 3.2,
        occupancyDuration: 2.8,
        occupancyStatus: 'exiting',
        vehicleType: 'truck'
      },
      {
        deviceId: 'test',
        timestamp: new Date(),
        laneNumber: 32,
        crossSectionPosition: 22.1,
        crossSectionSpeed: 65.3,
        headwayTime: 1.2,
        occupancyDuration: 1.1,
        occupancyStatus: 'entering',
        vehicleType: 'motorcycle'
      },
      {
        deviceId: 'test',
        timestamp: new Date(),
        laneNumber: 11,
        crossSectionPosition: 26.8,
        crossSectionSpeed: 48.7,
        headwayTime: 2.5,
        occupancyDuration: 2.1,
        occupancyStatus: 'entering',
        vehicleType: 'van'
      }
    ];
    
    // Process each test data entry
    for (const data of testData) {
      try {
        classificationProcessor.processPassDataForClassification(data, 'test');
        console.log(`✅ Processed: ${data.vehicleType} in lane ${data.laneNumber}`);
      } catch (error) {
        console.error(`❌ Error processing ${data.vehicleType}:`, error);
      }
    }
    
    // Get updated metrics
    const metrics = classificationProcessor.getClassificationMetrics('test');
    const summary = classificationProcessor.getClassificationSummary('test');
    
    console.log('📊 Final metrics:', metrics);
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${testData.length} test data entries`,
      data: {
        processedCount: testData.length,
        metrics,
        summary,
        testData
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error processing simple real data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process simple real data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
