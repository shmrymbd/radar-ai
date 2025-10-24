import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const vehicleTypes = searchParams.get('vehicleTypes')?.split(',');
    const lanes = searchParams.get('lanes')?.split(',').map(Number);
    const aggregationPeriod = searchParams.get('aggregationPeriod') as '1min' | '15min' | '1hour' | 'daily' || '1hour';

    // Get classification metrics
    const metrics = classificationProcessor.getClassificationMetrics();
    const summary = classificationProcessor.getClassificationSummary();

    // Apply filters if provided
    let filteredMetrics = metrics;
    if (vehicleTypes || lanes || startTime || endTime) {
      const filters = {
        vehicleTypes,
        lanes,
        timeRange: startTime && endTime ? {
          start: new Date(startTime),
          end: new Date(endTime)
        } : undefined,
        aggregationPeriod
      };
      filteredMetrics = classificationProcessor.filterClassificationData(filters);
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics: filteredMetrics,
        summary,
        filters: {
          vehicleTypes,
          lanes,
          startTime,
          endTime,
          aggregationPeriod
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error fetching classification data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch classification data',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, filters, format } = body;

    switch (action) {
      case 'export':
        const exportData = classificationProcessor.exportClassificationData(format || 'json');
        return NextResponse.json({
          success: true,
          data: exportData
        });

      case 'filter':
        const filteredData = classificationProcessor.filterClassificationData(filters);
        return NextResponse.json({
          success: true,
          data: filteredData
        });

      case 'historical':
        const { startTime, endTime } = body;
        const historicalData = classificationProcessor.getHistoricalData(
          new Date(startTime),
          new Date(endTime)
        );
        return NextResponse.json({
          success: true,
          data: historicalData
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error processing classification request:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process classification request',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
