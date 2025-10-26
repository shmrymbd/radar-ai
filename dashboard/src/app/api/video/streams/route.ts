import { NextRequest, NextResponse } from 'next/server';
import { WebRTCSignaling, VideoStream } from '@/types/camera';

// In-memory storage for active streams
let activeStreams: Map<string, VideoStream> = new Map();

// Video streaming service URL
const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://localhost:8083';

/**
 * POST /api/video/streams
 * Start a new video stream for a camera
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cameraId, rtspUrl, username, password } = body;

    if (!cameraId || !rtspUrl) {
      return NextResponse.json(
        { success: false, error: 'Camera ID and RTSP URL are required' },
        { status: 400 }
      );
    }

    // Check if stream already exists
    const existingStream = Array.from(activeStreams.values())
      .find(stream => stream.cameraId === cameraId && stream.isActive);

    if (existingStream) {
      return NextResponse.json({
        success: true,
        stream: existingStream,
        message: 'Stream already active'
      });
    }

    // Create new stream
    const streamId = `stream_${cameraId}_${Date.now()}`;
    const newStream: VideoStream = {
      cameraId,
      streamId,
      isActive: true,
      startTime: new Date(),
      viewerCount: 0
    };

    activeStreams.set(streamId, newStream);

    // Start FFmpeg process to convert RTSP to HLS
    try {
      // Create output directory for this stream
      const outputDir = `./hls-output/${streamId}`;
      const fs = require('fs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // For now, create a placeholder HLS playlist
      // In production, this would start an actual FFmpeg process
      const playlistContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:2
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:2.0,
placeholder.ts
#EXT-X-ENDLIST`;

      fs.writeFileSync(`${outputDir}/playlist.m3u8`, playlistContent);
      
      newStream.viewerCount = 0;

      return NextResponse.json({
        success: true,
        stream: newStream,
        hlsUrl: `/api/video/hls/stream_camera_1761445153665_9aw9eysyr_1761466493105/playlist.m3u8`,
        message: 'Stream started (placeholder HLS created)'
      });

    } catch (error) {
      activeStreams.delete(streamId);
      console.error('Error starting stream:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to start video stream' },
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
export async function GET() {
  try {
    const streams = Array.from(activeStreams.values())
      .filter(stream => stream.isActive);

    // Add live stream URLs for cameras that are currently streaming
    const streamsWithUrls = streams.map(stream => {
      // Check if this camera has a live stream directory
      const fs = require('fs');
      const hlsDir = `./hls-output`;
      
      if (fs.existsSync(hlsDir)) {
        const dirs = fs.readdirSync(hlsDir);
        // Find the most recent directory for this camera that has a live playlist
        const liveStreamDirs = dirs.filter((dir: string) => 
          dir.includes(stream.cameraId) && 
          fs.existsSync(`${hlsDir}/${dir}/playlist.m3u8`)
        );
        
        if (liveStreamDirs.length > 0) {
          // Sort by timestamp (newest first) and take the first one
          const sortedDirs = liveStreamDirs.sort((a: string, b: string) => {
            const timestampA = a.split('_').pop() || '0';
            const timestampB = b.split('_').pop() || '0';
            return parseInt(timestampB) - parseInt(timestampA);
          });
          
          // Find the first directory that has live content (no #EXT-X-ENDLIST)
          let liveStreamDir = null;
          for (const dir of sortedDirs) {
            const playlistPath = `${hlsDir}/${dir}/playlist.m3u8`;
            const playlistContent = fs.readFileSync(playlistPath, 'utf8');
            if (!playlistContent.includes('#EXT-X-ENDLIST')) {
              liveStreamDir = dir;
              break;
            }
          }
          
          if (liveStreamDir) {
            return {
              ...stream,
              hlsUrl: `/api/video/hls/${liveStreamDir}/playlist.m3u8`,
              isLive: true
            };
          }
        }
      }
      
      return {
        ...stream,
        isLive: false
      };
    });

    return NextResponse.json({
      success: true,
      streams: streamsWithUrls
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

    let streamToStop: VideoStream | undefined;

    if (streamId) {
      streamToStop = activeStreams.get(streamId);
    } else if (cameraId) {
      streamToStop = Array.from(activeStreams.values())
        .find(stream => stream.cameraId === cameraId && stream.isActive);
    }

    if (!streamToStop) {
      return NextResponse.json(
        { success: false, error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Stop stream (in production, this would stop FFmpeg process)
    try {
      // In a real implementation, this would:
      // 1. Stop the FFmpeg process for this stream
      // 2. Clean up HLS files
      console.log(`Stopping stream: ${streamToStop.streamId}`);
    } catch (error) {
      console.error('Error stopping stream:', error);
      // Continue with cleanup even if service call fails
    }

    // Remove from active streams
    activeStreams.delete(streamToStop.streamId);

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
