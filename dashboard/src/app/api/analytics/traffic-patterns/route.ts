import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsProcessor } from '@/lib/analytics-processor';

/**
 * GET /api/analytics/traffic-patterns - Recognize traffic patterns and trends
 * Query params:
 * - deviceId: string (default: 'P1-center')
 *
 * Returns:
 * - peakHours: Morning, evening, and midday peak hours with intensity
 * - dayOfWeekPatterns: Traffic patterns by day of week
 * - seasonalTrends: Current trend and volatility analysis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';

    const processor = AnalyticsProcessor.getInstance();
    const patterns = processor.recognizeTrafficPatterns(deviceId);

    // Convert Maps to objects for JSON serialization
    const dayOfWeekPatternsObj: any = {};
    patterns.dayOfWeekPatterns.forEach((data, day) => {
      dayOfWeekPatternsObj[day] = {
        averageVolume: data.averageVolume,
        peakHour: data.peakHour,
        vehicleTypeMix: Object.fromEntries(data.vehicleTypeMix)
      };
    });

    const serializablePatterns = {
      peakHours: patterns.peakHours,
      dayOfWeekPatterns: dayOfWeekPatternsObj,
      seasonalTrends: patterns.seasonalTrends
    };

    return NextResponse.json({
      success: true,
      data: serializablePatterns,
      deviceId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error recognizing traffic patterns:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to recognize traffic patterns',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
