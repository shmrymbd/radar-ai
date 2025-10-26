import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function POST() {
  try {
    console.log('🔄 Manually triggering classification data aggregation...');

    await classificationProcessor.triggerManualAggregation();

    return NextResponse.json({
      success: true,
      message: 'Manual aggregation completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error triggering manual aggregation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger aggregation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
