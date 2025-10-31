import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsProcessor } from '@/lib/analytics-processor';

/**
 * GET /api/analytics/smart-alerts - Get all smart alerts and check for triggered alerts
 * Query params:
 * - deviceId: string (default: 'P1-center')
 * - checkTriggers: boolean (default: false) - Check and return triggered alerts
 *
 * POST /api/analytics/smart-alerts - Create a new smart alert
 * Body:
 * - name: string
 * - condition: { metric: string, operator: string, threshold: number | [number, number] }
 * - actions: string[]
 * - enabled: boolean
 * - deviceId: string
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';
    const checkTriggers = searchParams.get('checkTriggers') === 'true';

    const processor = AnalyticsProcessor.getInstance();

    const response: any = {
      success: true,
      deviceId,
      timestamp: new Date().toISOString()
    };

    if (checkTriggers) {
      // Check for triggered alerts
      const triggeredAlerts = processor.checkAlerts(deviceId);
      response.triggeredAlerts = triggeredAlerts.map(alert => ({
        ...alert,
        lastTriggered: alert.lastTriggered?.toISOString()
      }));
    }

    // Get all alerts
    const allAlerts = processor.getAlerts(deviceId);
    response.alerts = allAlerts.map(alert => ({
      ...alert,
      lastTriggered: alert.lastTriggered?.toISOString()
    }));

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching smart alerts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch smart alerts',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      condition,
      actions,
      enabled = true,
      deviceId = 'test'
    } = body;

    // Validate required fields
    if (!name || !condition || !actions) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, condition, actions',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validate condition
    if (!condition.metric || !condition.operator || condition.threshold === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Invalid condition: must have metric, operator, and threshold',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const processor = AnalyticsProcessor.getInstance();
    const alert = processor.createAlert({
      name,
      condition,
      actions,
      enabled
    }, deviceId);

    return NextResponse.json({
      success: true,
      data: {
        ...alert,
        lastTriggered: alert.lastTriggered?.toISOString()
      },
      deviceId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error creating smart alert:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create smart alert',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
