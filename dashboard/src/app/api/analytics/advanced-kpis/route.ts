import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsProcessor } from '@/lib/analytics-processor';

/**
 * GET /api/analytics/advanced-kpis - Get advanced KPIs for traffic engineering
 * Query params:
 * - deviceId: string (default: 'P1-center')
 *
 * Returns:
 * - intersectionEfficiency: Intersection performance metrics
 * - laneUtilization: Lane balance and efficiency metrics
 * - speedCompliance: Speed compliance and violation analysis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';

    const processor = AnalyticsProcessor.getInstance();
    const kpis = processor.calculateAdvancedKPIs(deviceId);

    // Convert Maps to objects for JSON serialization
    const serializableKPIs = {
      intersectionEfficiency: {
        overall: kpis.intersectionEfficiency.overall,
        byVehicleType: Object.fromEntries(kpis.intersectionEfficiency.byVehicleType),
        throughputRate: kpis.intersectionEfficiency.throughputRate,
        peakCapacityUtilization: kpis.intersectionEfficiency.peakCapacityUtilization
      },
      laneUtilization: {
        efficiency: Object.fromEntries(kpis.laneUtilization.efficiency),
        balanceScore: kpis.laneUtilization.balanceScore,
        underutilizedLanes: kpis.laneUtilization.underutilizedLanes,
        overutilizedLanes: kpis.laneUtilization.overutilizedLanes,
        recommendations: kpis.laneUtilization.recommendations
      },
      speedCompliance: {
        overallRate: kpis.speedCompliance.overallRate,
        byVehicleType: Object.fromEntries(kpis.speedCompliance.byVehicleType),
        violations: {
          count: kpis.speedCompliance.violations.count,
          percentage: kpis.speedCompliance.violations.percentage,
          severityDistribution: Object.fromEntries(kpis.speedCompliance.violations.severityDistribution)
        },
        trends: {
          hourly: Object.fromEntries(kpis.speedCompliance.trends.hourly),
          peakVsOffPeak: kpis.speedCompliance.trends.peakVsOffPeak
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: serializableKPIs,
      deviceId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error calculating advanced KPIs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to calculate advanced KPIs',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
