import { NextRequest, NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';
import { withApiProtection } from '@/lib/middleware';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function GET(request: NextRequest) {
  // Apply authentication and rate limiting
  const protection = withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'test';
    
    const metrics = classificationProcessor.getClassificationMetrics(deviceId);
    
    return NextResponse.json({
      success: true,
      data: metrics,
      deviceId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching classification metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch classification metrics',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
