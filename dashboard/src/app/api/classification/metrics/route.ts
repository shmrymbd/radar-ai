import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function GET() {
  try {
    const metrics = classificationProcessor.getClassificationMetrics();
    
    return NextResponse.json({
      success: true,
      data: metrics,
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
