import { NextResponse } from 'next/server';
import { videoStreamManager } from '@/lib/video-stream-manager';

/**
 * GET /api/video/health
 * Check video streaming service health
 */
export async function GET() {
  try {
    // Check if FFmpeg is available
    const ffmpegAvailable = await videoStreamManager.checkFFmpegAvailable();

    // Get active streams count
    const activeStreams = videoStreamManager.getActiveStreams();

    return NextResponse.json({
      success: true,
      status: ffmpegAvailable ? 'healthy' : 'degraded',
      ffmpegAvailable,
      activeStreamsCount: activeStreams.length,
      activeStreams: activeStreams.map(stream => ({
        streamId: stream.streamId,
        cameraId: stream.cameraId,
        startTime: stream.startTime,
        isActive: stream.isActive
      }))
    });

  } catch (error) {
    console.error('Error checking video service health:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 500 }
    );
  }
}
