import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsProcessor } from '@/lib/analytics-processor';

/**
 * GET /api/analytics/anomaly-detection - Detect traffic pattern anomalies
 * Query params:
 * - deviceId: string (default: 'P1-center')
 * - includeHistory: boolean (default: false) - Include historical anomalies
 *
 * Returns:
 * - anomalies: List of detected anomalies with severity and suggested actions
 * - baseline: Expected traffic baseline metrics
 * - history: Historical anomalies (if includeHistory=true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';
    const includeHistory = searchParams.get('includeHistory') === 'true';

    const processor = AnalyticsProcessor.getInstance();
    const detection = processor.detectAnomalies(deviceId);

    // Convert Maps to objects for JSON serialization
    const serializableDetection = {
      anomalies: detection.anomalies.map(anomaly => ({
        ...anomaly,
        timestamp: anomaly.timestamp.toISOString()
      })),
      baseline: {
        volumeRange: detection.baseline.volumeRange,
        speedRange: detection.baseline.speedRange,
        vehicleTypeMix: Object.fromEntries(detection.baseline.vehicleTypeMix)
      }
    };

    const response: any = {
      success: true,
      data: serializableDetection,
      deviceId,
      timestamp: new Date().toISOString()
    };

    // Include history if requested
    if (includeHistory) {
      const history = processor.getAnomalyHistory(deviceId);
      response.history = history.map(h => ({
        anomalies: h.anomalies.map(a => ({
          ...a,
          timestamp: a.timestamp.toISOString()
        })),
        baseline: {
          volumeRange: h.baseline.volumeRange,
          speedRange: h.baseline.speedRange,
          vehicleTypeMix: Object.fromEntries(h.baseline.vehicleTypeMix)
        }
      }));
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error detecting anomalies:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to detect anomalies',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
