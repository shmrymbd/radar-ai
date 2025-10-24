import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function GET() {
  try {
    const summary = classificationProcessor.getClassificationSummary();
    
    return NextResponse.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching classification summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch classification summary',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
