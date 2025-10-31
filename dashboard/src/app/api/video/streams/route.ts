import { NextRequest, NextResponse } from 'next/server';
import { WebRTCSignaling, VideoStream } from '@/types/camera';
import { videoStreamManager } from '@/lib/video-stream-manager';
import { withApiProtection } from '@/lib/middleware';

/**
 * POST /api/video/streams
 * Start a new video stream for a camera
 */
export async function POST(request: NextRequest) {
  // Authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const body = await request.json();
    const { cameraId, rtspUrl, username, password } = body;

    if (!cameraId || !rtspUrl) {
      return NextResponse.json(
        { success: false, error: 'Camera ID and RTSP URL are required' },
        { status: 400 }
      );
    }

    // Check if FFmpeg is available
    const ffmpegAvailable = await videoStreamManager.checkFFmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json(
        {
          success: false,
          error: 'FFmpeg is not installed or not available in PATH. Please install FFmpeg to enable video streaming.'
        },
        { status: 503 }
      );
    }

    // Check if stream already exists for this camera
    const existingStream = videoStreamManager.getStreamByCamera(cameraId);
    if (existingStream) {
      return NextResponse.json({
        success: true,
        stream: {
          cameraId: existingStream.cameraId,
          streamId: existingStream.streamId,
          isActive: existingStream.isActive,
          startTime: existingStream.startTime,
          viewerCount: 0
        },
        hlsUrl: `/api/video/hls/${existingStream.streamId}/playlist.m3u8`,
        message: 'Stream already active'
      });
    }

    // Start new stream with FFmpeg
    try {
      const { streamId, hlsUrl } = await videoStreamManager.startStream({
        cameraId,
        rtspUrl,
        username,
        password
      });

      const newStream: VideoStream = {
        cameraId,
        streamId,
        isActive: true,
        startTime: new Date(),
        viewerCount: 0
      };

      return NextResponse.json({
        success: true,
        stream: newStream,
        hlsUrl,
        message: 'Stream started successfully with FFmpeg'
      }, { status: 201 });

    } catch (error) {
      console.error('Error starting FFmpeg stream:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start video stream'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error creating stream:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create stream' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/streams
 * Get active video streams
 */
export async function GET(request: NextRequest) {
  // Authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const activeStreams = videoStreamManager.getActiveStreams();

    const streams = activeStreams.map(stream => ({
      cameraId: stream.cameraId,
      streamId: stream.streamId,
      isActive: stream.isActive,
      startTime: stream.startTime,
      viewerCount: 0,
      hlsUrl: `/api/video/hls/${stream.streamId}/playlist.m3u8`,
      isLive: true
    }));

    return NextResponse.json({
      success: true,
      streams,
      count: streams.length
    });

  } catch (error) {
    console.error('Error fetching streams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch streams' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/video/streams
 * Stop a video stream
 */
export async function DELETE(request: NextRequest) {
  // Authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const { searchParams } = new URL(request.url);
    const streamId = searchParams.get('streamId');
    const cameraId = searchParams.get('cameraId');

    if (!streamId && !cameraId) {
      return NextResponse.json(
        { success: false, error: 'Stream ID or Camera ID is required' },
        { status: 400 }
      );
    }

    let stopped = false;

    if (streamId) {
      stopped = await videoStreamManager.stopStream(streamId);
    } else if (cameraId) {
      stopped = await videoStreamManager.stopStreamByCamera(cameraId);
    }

    if (!stopped) {
      return NextResponse.json(
        { success: false, error: 'Stream not found or already stopped' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Stream stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping stream:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop stream' },
      { status: 500 }
    );
  }
}
