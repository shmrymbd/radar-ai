import { NextRequest, NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';
import { TimePeriodFilter } from '@/types/classification-history';
import { withApiProtection } from '@/lib/middleware';
import { getPerformanceMonitor } from '@/lib/performance-monitor';

const classificationProcessor = ClassificationProcessor.getInstance();
const monitor = getPerformanceMonitor();

/**
 * Export classification historical data in various formats
 * Supports: CSV, JSON
 *
 * Query parameters:
 * - deviceId: Device ID (default: 'test')
 * - timePeriod: '24hrs' | 'yesterday' | 'month' (default: '24hrs')
 * - format: 'csv' | 'json' (default: 'json')
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Apply authentication and stricter export rate limiting
  const protection = withApiProtection(request, true); // true = use export rate limiter
  if (!protection.ok) {
    const duration = Date.now() - startTime;
    monitor.recordRequest('/api/classification/export', 'GET', duration, protection.response!.status, { error: true });
    return protection.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'test';
    const timePeriod = searchParams.get('timePeriod') || '24hrs';
    const format = searchParams.get('format') || 'json';

    // Validate format
    if (!['csv', 'json'].includes(format)) {
      const duration = Date.now() - startTime;
      monitor.recordRequest('/api/classification/export', 'GET', duration, 400, { error: true });

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

    // Get all historical data (no pagination for export)
    const result = await classificationProcessor.getHistoricalChartData(
      deviceId,
      timeFilter,
      { limit: 10000 } // Large limit for export
    );

    if (!result.data || result.data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No data available for export',
          details: 'No historical data found for the specified time period'
        },
        { status: 404 }
      );
    }

    // Export based on format
    if (format === 'csv') {
      const csv = convertToCSV(result.data);
      const filename = `classification-${deviceId}-${timePeriod}-${new Date().toISOString().slice(0, 10)}.csv`;

      const duration = Date.now() - startTime;
      monitor.recordRequest('/api/classification/export', 'GET', duration, 200);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Response-Time': `${duration}ms`,
          'X-Records-Exported': result.data.length.toString()
        },
      });
    } else {
      // JSON format
      const filename = `classification-${deviceId}-${timePeriod}-${new Date().toISOString().slice(0, 10)}.json`;
      const jsonData = JSON.stringify({
        deviceId,
        timePeriod,
        exportDate: new Date().toISOString(),
        totalRecords: result.data.length,
        data: result.data
      }, null, 2);

      const duration = Date.now() - startTime;
      monitor.recordRequest('/api/classification/export', 'GET', duration, 200);

      return new NextResponse(jsonData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Response-Time': `${duration}ms`,
          'X-Records-Exported': result.data.length.toString()
        },
      });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    monitor.recordRequest('/api/classification/export', 'GET', duration, 500, { error: true });

    console.error('❌ Error exporting classification data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Convert data array to CSV format
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  // CSV headers
  const headers = [
    'Time Slot',
    'Total Vehicles',
    'Cars',
    'SUVs',
    'Trucks',
    'Motorcycles',
    'Vans',
    'Average Speed (km/h)',
    'Speed Violations'
  ];

  // CSV rows
  const rows = data.map(item => [
    item.timeSlot,
    item.totalVehicles,
    item.vehicleTypes.car || 0,
    item.vehicleTypes.suv || 0,
    item.vehicleTypes.truck || 0,
    item.vehicleTypes.motorcycle || 0,
    item.vehicleTypes.van || 0,
    item.averageSpeed?.toFixed(2) || '0.00',
    item.speedViolations || 0
  ]);

  // Combine headers and rows
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ];

  return csvLines.join('\n');
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
