import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function POST() {
  try {
    console.log('🧪 Generating test real-time classification data...');
    
    // Generate some test PassData
    const testData = [
      {
        deviceId: 'test',
        timestamp: new Date(),
        laneNumber: 11,
        crossSectionPosition: 25.5,
        crossSectionSpeed: 45.2,
        headwayTime: 2.1,
        passingTime: new Date().toISOString(),
        occupancyDuration: 1.8,
        occupancyStatus: 1,
        vehicleType: 'car'
      },
      {
        deviceId: 'test',
        timestamp: new Date(),
        laneNumber: 12,
        crossSectionPosition: 30.2,
        crossSectionSpeed: 52.1,
        headwayTime: 1.8,
        passingTime: new Date().toISOString(),
        occupancyDuration: 2.2,
        occupancyStatus: 1,
        vehicleType: 'suv'
      },
      {
        deviceId: 'test',
        timestamp: new Date(),
        laneNumber: 31,
        crossSectionPosition: 28.7,
        crossSectionSpeed: 38.5,
        headwayTime: 3.2,
        passingTime: new Date().toISOString(),
        occupancyDuration: 2.8,
        occupancyStatus: 1,
        vehicleType: 'truck'
      },
      {
        deviceId: 'test',
        timestamp: new Date(),
        laneNumber: 32,
        crossSectionPosition: 22.1,
        crossSectionSpeed: 65.3,
        headwayTime: 1.2,
        passingTime: new Date().toISOString(),
        occupancyDuration: 1.1,
        occupancyStatus: 1,
        vehicleType: 'motorcycle'
      },
      {
        deviceId: 'test',
        timestamp: new Date(),
        laneNumber: 11,
        crossSectionPosition: 26.8,
        crossSectionSpeed: 48.7,
        headwayTime: 2.5,
        passingTime: new Date().toISOString(),
        occupancyDuration: 2.1,
        occupancyStatus: 1,
        vehicleType: 'van'
      }
    ];
    
    // Process each test data entry
    for (const data of testData) {
      classificationProcessor.processPassDataForClassification(data);
    }
    
    // Get updated metrics
    const metrics = classificationProcessor.getClassificationMetrics('test');
    const summary = classificationProcessor.getClassificationSummary('test');
    
    console.log('✅ Generated test data:', metrics);
    
    return NextResponse.json({
      success: true,
      message: 'Test data generated successfully',
      data: {
        metrics,
        summary,
        recordsProcessed: testData.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
