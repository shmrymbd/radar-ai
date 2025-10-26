import { NextRequest, NextResponse } from 'next/server';
import { CameraConfig, CameraStatus, CameraTestResult } from '@/types/camera';

// In-memory storage for camera configurations (in production, use database)
let cameraConfigs: CameraConfig[] = [];
let cameraStatuses: Map<string, CameraStatus> = new Map();

// RTSP to WebRTC service URL
const RTSP_TO_WEBRTC_URL = process.env.RTSP_TO_WEBRTC_URL || 'http://localhost:8083';

/**
 * GET /api/video/cameras
 * List all camera configurations
 */
// Function to check camera connectivity
async function checkCameraConnectivity(camera: CameraConfig): Promise<boolean> {
  try {
    // For now, we'll assume cameras are connected if they have a valid RTSP URL
    // In a real implementation, you would test the actual RTSP connection
    return !!(camera.rtspUrl && camera.rtspUrl.startsWith('rtsp://'));
  } catch (error) {
    console.error(`Error checking connectivity for camera ${camera.id}:`, error);
    return false;
  }
}

export async function GET() {
  try {
    // Check connectivity for all cameras
    const camerasWithStatus = await Promise.all(
      cameraConfigs.map(async (config) => {
        const isConnected = await checkCameraConnectivity(config);
        
        // Update the status in memory
        cameraStatuses.set(config.id, {
          id: config.id,
          isConnected
        });

        return {
          ...config,
          status: {
            id: config.id,
            isConnected
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      cameras: camerasWithStatus
    });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cameras' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/video/cameras
 * Create a new camera configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      rtspUrl,
      username,
      password,
      resolution = { width: 1920, height: 1080 },
      frameRate = 30,
      bitrate = 2000000
    } = body;

    // Validate required fields
    if (!name || !rtspUrl) {
      return NextResponse.json(
        { success: false, error: 'Name and RTSP URL are required' },
        { status: 400 }
      );
    }

    // Validate RTSP URL format
    if (!rtspUrl.startsWith('rtsp://')) {
      return NextResponse.json(
        { success: false, error: 'Invalid RTSP URL format' },
        { status: 400 }
      );
    }

    // Create new camera configuration
    const newCamera: CameraConfig = {
      id: `camera_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      rtspUrl,
      username,
      password,
      resolution,
      frameRate,
      bitrate,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    cameraConfigs.push(newCamera);

    // Initialize camera status as connected (since it has a valid RTSP URL)
    cameraStatuses.set(newCamera.id, {
      id: newCamera.id,
      isConnected: true
    });

    return NextResponse.json({
      success: true,
      camera: newCamera
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create camera' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/video/cameras
 * Update camera configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    const cameraIndex = cameraConfigs.findIndex(camera => camera.id === id);
    if (cameraIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Update camera configuration
    cameraConfigs[cameraIndex] = {
      ...cameraConfigs[cameraIndex],
      ...updates,
      updatedAt: new Date()
    };

    return NextResponse.json({
      success: true,
      camera: cameraConfigs[cameraIndex]
    });

  } catch (error) {
    console.error('Error updating camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update camera' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/video/cameras
 * Delete camera configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    const cameraIndex = cameraConfigs.findIndex(camera => camera.id === id);
    if (cameraIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Remove camera configuration
    cameraConfigs.splice(cameraIndex, 1);
    cameraStatuses.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Camera deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete camera' },
      { status: 500 }
    );
  }
}
