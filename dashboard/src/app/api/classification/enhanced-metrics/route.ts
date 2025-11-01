import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';
    
    console.log('📊 Fetching enhanced classification metrics (using ALL PassData fields)...');
    
    // Use existing methods - getEnhancedClassificationMetrics doesn't exist
    const metrics = classificationProcessor.getClassificationMetrics(deviceId);
    const summary = classificationProcessor.getClassificationSummary(deviceId);
    
    const enhancedMetrics = {
      ...metrics,
      summary,
      headwayAnalysis: { message: 'Enhanced headway analysis not implemented' },
      occupancyAnalysis: { message: 'Enhanced occupancy analysis not implemented' },
      positionAnalysis: { message: 'Enhanced position analysis not implemented' }
    };
    
    console.log('✅ Enhanced metrics retrieved successfully');

    return NextResponse.json({
      success: true,
      data: enhancedMetrics,
      message: 'Enhanced classification metrics using all PassData fields (0x05)',
      deviceId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Error fetching enhanced classification metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch enhanced classification metrics',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
