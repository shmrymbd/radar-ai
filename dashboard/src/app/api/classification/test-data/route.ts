import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function POST() {
  try {
    // Generate some test pass data
    const testPassData = [
      {
        deviceId: 'Radar04',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        laneNumber: 12,
        crossSectionPosition: 30,
        crossSectionSpeed: 45.2,
        headwayTime: 2.5,
        occupancyDuration: 3.2,
        occupancyStatus: 'entering',
        vehicleType: 'car'
      },
      {
        deviceId: 'Radar04',
        timestamp: new Date(Date.now() - 240000), // 4 minutes ago
        laneNumber: 11,
        crossSectionPosition: 30,
        crossSectionSpeed: 38.7,
        headwayTime: 1.8,
        occupancyDuration: 2.9,
        occupancyStatus: 'entering',
        vehicleType: 'suv'
      },
      {
        deviceId: 'Radar04',
        timestamp: new Date(Date.now() - 180000), // 3 minutes ago
        laneNumber: 12,
        crossSectionPosition: 30,
        crossSectionSpeed: 52.1,
        headwayTime: 3.1,
        occupancyDuration: 4.1,
        occupancyStatus: 'exiting',
        vehicleType: 'truck'
      },
      {
        deviceId: 'Radar04',
        timestamp: new Date(Date.now() - 120000), // 2 minutes ago
        laneNumber: 11,
        crossSectionPosition: 30,
        crossSectionSpeed: 28.3,
        headwayTime: 2.2,
        occupancyDuration: 2.5,
        occupancyStatus: 'entering',
        vehicleType: 'motorcycle'
      },
      {
        deviceId: 'Radar04',
        timestamp: new Date(Date.now() - 60000), // 1 minute ago
        laneNumber: 12,
        crossSectionPosition: 30,
        crossSectionSpeed: 41.8,
        headwayTime: 1.9,
        occupancyDuration: 3.7,
        occupancyStatus: 'entering',
        vehicleType: 'van'
      },
      {
        deviceId: 'Radar04',
        timestamp: new Date(Date.now() - 30000), // 30 seconds ago
        laneNumber: 11,
        crossSectionPosition: 30,
        crossSectionSpeed: 35.6,
        headwayTime: 2.8,
        occupancyDuration: 3.1,
        occupancyStatus: 'exiting',
        vehicleType: 'car'
      }
    ];

    // Process each test pass data
    for (const passData of testPassData) {
      classificationProcessor.processPassDataForClassification(passData);
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${testPassData.length} test pass events`,
      data: {
        processedCount: testPassData.length,
        vehicleTypes: ['car', 'suv', 'truck', 'motorcycle', 'van'],
        timeRange: 'Last 5 minutes'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error processing test data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process test data',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
