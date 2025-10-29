import { NextRequest, NextResponse } from 'next/server';
import { LaneConfigService } from '@/lib/lane-config-service';
import { withApiProtection } from '@/lib/middleware';
import { LaneConfig } from '@/types/lane-config';

/**
 * GET /api/lane-config?device={deviceId}
 * Get lane configuration for a device
 */
export async function GET(request: NextRequest) {
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const laneConfigService = LaneConfigService.getInstance();
    const config = await laneConfigService.getLaneConfig(deviceId);

    return NextResponse.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching lane config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lane configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lane-config
 * Create or update lane configuration
 */
export async function POST(request: NextRequest) {
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const body = await request.json();
    const { deviceId, lanes } = body;

    console.log('POST /api/lane-config - Received:', {
      deviceId,
      laneCount: lanes?.length,
      hasLanes: Array.isArray(lanes)
    });

    if (!deviceId || !lanes || !Array.isArray(lanes)) {
      console.error('Invalid request body:', { deviceId, lanes: lanes?.length });
      return NextResponse.json(
        { success: false, error: 'Invalid request body. DeviceId and lanes array required.' },
        { status: 400 }
      );
    }

    if (lanes.length === 0) {
      console.error('Empty lanes array');
      return NextResponse.json(
        { success: false, error: 'Lanes array cannot be empty' },
        { status: 400 }
      );
    }

    // Validate lane config structure - basic validation only
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      if (typeof lane.laneNumber !== 'number') {
        console.error(`Lane ${i}: laneNumber is not a number:`, lane.laneNumber);
        return NextResponse.json(
          { success: false, error: `Lane ${i}: laneNumber must be a number` },
          { status: 400 }
        );
      }
      if (typeof lane.customName !== 'string') {
        console.error(`Lane ${i}: customName is not a string:`, lane.customName);
        return NextResponse.json(
          { success: false, error: `Lane ${i}: customName must be a string` },
          { status: 400 }
        );
      }
      if (typeof lane.enabled !== 'boolean') {
        console.error(`Lane ${i}: enabled is not a boolean:`, lane.enabled);
        return NextResponse.json(
          { success: false, error: `Lane ${i}: enabled must be a boolean` },
          { status: 400 }
        );
      }
      // Optional fields - will use defaults if not provided
      // thresholds, alerts, displayOptions are optional
    }

    console.log('Validation passed, saving to MongoDB...');
    const laneConfigService = LaneConfigService.getInstance();
    const config = await laneConfigService.saveLaneConfig(deviceId, lanes as LaneConfig[]);

    console.log('Successfully saved lane configuration');
    return NextResponse.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving lane config:', error);
    return NextResponse.json(
      { success: false, error: `Failed to save lane configuration: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lane-config?device={deviceId}
 * Delete lane configuration for a device
 */
export async function DELETE(request: NextRequest) {
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const laneConfigService = LaneConfigService.getInstance();
    const deleted = await laneConfigService.deleteLaneConfig(deviceId);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Lane configuration deleted' : 'No configuration found',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting lane config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete lane configuration' },
      { status: 500 }
    );
  }
}
