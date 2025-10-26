import { NextRequest, NextResponse } from 'next/server';
import { CameraTestResult } from '@/types/camera';

/**
 * POST /api/video/cameras/test
 * Test camera connection and configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rtspUrl, username, password } = body;

    if (!rtspUrl) {
      return NextResponse.json(
        { success: false, error: 'RTSP URL is required' },
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

    // Test camera connection
    const testResult = await testCameraConnection(rtspUrl, username, password);

    return NextResponse.json({
      success: true,
      result: testResult
    });

  } catch (error) {
    console.error('Error testing camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test camera connection' },
      { status: 500 }
    );
  }
}

/**
 * Test camera connection by attempting to connect to RTSP stream
 */
async function testCameraConnection(
  rtspUrl: string,
  username?: string,
  password?: string
): Promise<CameraTestResult> {
  try {
    const startTime = Date.now();
    
    // Construct full RTSP URL with credentials if provided
    let fullRtspUrl = rtspUrl;
    if (username && password) {
      const url = new URL(rtspUrl);
      url.username = username;
      url.password = password;
      fullRtspUrl = url.toString();
    }

    // Test connection using RTSPtoWebRTC service
    const testUrl = `http://localhost:8083/api/stream/test`;
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: fullRtspUrl,
        options: {
          video: true,
          audio: false
        }
      }),
      // Set timeout for connection test
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      const result = await response.json();
      
      return {
        success: true,
        latency,
        resolution: result.resolution || { width: 1920, height: 1080 },
        frameRate: result.frameRate || 30
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

  } catch (error) {
    console.error('Camera connection test failed:', error);
    
    let errorMessage = 'Connection test failed';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Connection timeout - camera may be unreachable';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Camera host not found - check network connectivity';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused - check camera IP and port';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}
