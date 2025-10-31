import { NextRequest, NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';
import { TimePeriodFilter } from '@/types/classification-history';

const classificationProcessor = ClassificationProcessor.getInstance();

/**
 * Export aggregated classification statistics
 * Supports: CSV, JSON
 *
 * Query parameters:
 * - deviceId: Device ID (default: 'P1-center')
 * - timePeriod: '24hrs' | 'yesterday' | 'month' (default: '24hrs')
 * - format: 'csv' | 'json' (default: 'json')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';
    const timePeriod = searchParams.get('timePeriod') || '24hrs';
    const format = searchParams.get('format') || 'json';

    // Validate format
    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid format',
          details: 'Format must be either "csv" or "json"'
        },
        { status: 400 }
      );
    }

    // Create time filter based on period
    const timeFilter = createTimeFilter(timePeriod);

    // Get aggregated historical data
    const aggregatedData = await classificationProcessor.getAggregatedHistoricalData(
      deviceId,
      timeFilter
    );

    if (!aggregatedData) {
      return NextResponse.json(
        {
          success: false,
          error: 'No data available for export',
          details: 'No aggregated data found for the specified time period'
        },
        { status: 404 }
      );
    }

    // Export based on format
    if (format === 'csv') {
      const csv = convertAggregatedToCSV(aggregatedData, deviceId, timePeriod);
      const filename = `classification-summary-${deviceId}-${timePeriod}-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      // JSON format
      const filename = `classification-summary-${deviceId}-${timePeriod}-${new Date().toISOString().slice(0, 10)}.json`;
      const jsonData = JSON.stringify({
        deviceId,
        timePeriod,
        exportDate: new Date().toISOString(),
        summary: aggregatedData
      }, null, 2);

      return new NextResponse(jsonData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

  } catch (error) {
    console.error('❌ Error exporting aggregated classification data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export aggregated data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Convert aggregated data to CSV format
 */
function convertAggregatedToCSV(data: any, deviceId: string, timePeriod: string): string {
  const lines = [];

  // Header
  lines.push(`Classification Summary Report`);
  lines.push(`Device ID,${deviceId}`);
  lines.push(`Time Period,${timePeriod}`);
  lines.push(`Export Date,${new Date().toISOString()}`);
  lines.push('');

  // Overall Statistics
  lines.push('Overall Statistics');
  lines.push('Metric,Value');
  lines.push(`Total Vehicles,${data.totalVehicles}`);
  lines.push(`Average Speed (km/h),${data.averageSpeed?.toFixed(2) || '0.00'}`);
  lines.push(`Speed Violations,${data.speedViolations}`);
  lines.push(`Peak Hour,${data.peakHour || 'N/A'}`);
  lines.push('');

  // Vehicle Type Distribution
  lines.push('Vehicle Type Distribution');
  lines.push('Vehicle Type,Percentage');

  if (data.vehicleTypeDistribution) {
    for (const [type, percentage] of Object.entries(data.vehicleTypeDistribution)) {
      lines.push(`${type},${(percentage as number).toFixed(2)}%`);
    }
  }

  return lines.join('\n');
}

/**
 * Create time filter based on period
 */
function createTimeFilter(timePeriod: string): TimePeriodFilter {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (timePeriod) {
    case '24hrs':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      startDate = yesterday;
      endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  return {
    type: timePeriod as '24hrs' | 'yesterday' | 'month',
    startDate,
    endDate
  };
}
