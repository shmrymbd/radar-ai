import { NextRequest, NextResponse } from 'next/server';
import { CameraConfig, CameraStatus, CameraTestResult } from '@/types/camera';
import { CameraStorage } from '@/lib/camera-storage';
import { withApiProtection } from '@/lib/middleware';

// Camera storage singleton
const cameraStorage = CameraStorage.getInstance();

// In-memory cache for camera statuses (connection status is ephemeral)
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

export async function GET(request: NextRequest) {
  // Authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    // Fetch all cameras from MongoDB
    const cameraConfigs = await cameraStorage.getAllCameras();

    // Check connectivity for all cameras
    const camerasWithStatus = await Promise.all(
      cameraConfigs.map(async (config) => {
        const isConnected = await checkCameraConnectivity(config);

        // Update the status in memory cache
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
  // Authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

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

    // Save to MongoDB
    const savedCamera = await cameraStorage.createCamera(newCamera);

    // Initialize camera status as connected (since it has a valid RTSP URL)
    cameraStatuses.set(savedCamera.id, {
      id: savedCamera.id,
      isConnected: true
    });

    return NextResponse.json({
      success: true,
      camera: savedCamera
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
  // Authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    // Update camera in MongoDB
    const updatedCamera = await cameraStorage.updateCamera(id, updates);

    if (!updatedCamera) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      camera: updatedCamera
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
  // Authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    // Delete camera from MongoDB
    const deleted = await cameraStorage.deleteCamera(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Remove from status cache
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
