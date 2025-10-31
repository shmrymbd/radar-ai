import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsProcessor } from '@/lib/analytics-processor';
import { ClassificationProcessor } from '@/lib/classification-processor';

/**
 * POST /api/analytics/query - Process natural language query and filter classification data
 * Body:
 * - query: string (natural language query)
 * - deviceId: string (default: 'P1-center')
 *
 * Examples:
 * - "Show me truck traffic during rush hour"
 * - "Cars speeding between 2pm and 4pm"
 * - "Lane 11 occupancy on weekdays"
 *
 * Returns:
 * - filter: Parsed filter from natural language query
 * - data: Filtered classification data
 * - summary: Summary statistics for filtered data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, deviceId = 'test' } = body;

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: query',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const analyticsProcessor = AnalyticsProcessor.getInstance();
    const classificationProcessor = ClassificationProcessor.getInstance();

    // Process natural language query into structured filter
    const filter = analyticsProcessor.processNaturalLanguageQuery(query, deviceId);

    // Get classification data
    const metrics = classificationProcessor.getClassificationMetrics(deviceId);
    const summary = classificationProcessor.getClassificationSummary(deviceId);

    // Apply filters to data (simplified - in production would filter actual data)
    const filteredSummary = { ...summary };

    // Filter by vehicle type if specified
    if (filter.vehicleTypes && filter.vehicleTypes.length > 0 && summary.vehicleTypeCounts) {
      const filteredTypeCounts: any = {};
      filter.vehicleTypes.forEach(type => {
        if (summary.vehicleTypeCounts && summary.vehicleTypeCounts[type]) {
          filteredTypeCounts[type] = summary.vehicleTypeCounts[type];
        }
      });
      filteredSummary.vehicleTypeCounts = filteredTypeCounts;

      // Recalculate total vehicles
      filteredSummary.totalVehicles = Object.values(filteredTypeCounts).reduce((sum: number, count: any) => sum + count, 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        filter,
        metrics: {
          filtered: filteredSummary,
          original: summary
        }
      },
      deviceId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error processing natural language query:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process query',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
