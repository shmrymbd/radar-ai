import { NextRequest, NextResponse } from 'next/server';
import { videoStreamManager } from '@/lib/video-stream-manager';

/**
 * POST /api/video/cleanup
 * Cleanup old HLS stream files
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { olderThanHours = 24 } = body;

    if (typeof olderThanHours !== 'number' || olderThanHours < 1) {
      return NextResponse.json(
        { success: false, error: 'olderThanHours must be a number >= 1' },
        { status: 400 }
      );
    }

    console.log(`🧹 Starting cleanup of streams older than ${olderThanHours} hours`);

    videoStreamManager.cleanupOldStreams(olderThanHours);

    return NextResponse.json({
      success: true,
      message: `Cleaned up streams older than ${olderThanHours} hours`
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { success: false, error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/cleanup
 * Get cleanup status and recommendations
 */
export async function GET() {
  try {
    const fs = require('fs');
    const path = require('path');
    const hlsDir = './hls-output';

    if (!fs.existsSync(hlsDir)) {
      return NextResponse.json({
        success: true,
        totalSize: 0,
        streamCount: 0,
        oldestStream: null,
        newestStream: null
      });
    }

    const dirs = fs.readdirSync(hlsDir);
    const activeStreams = videoStreamManager.getActiveStreams();
    const activeStreamDirs = new Set(
      activeStreams.map(s => path.basename(s.outputDir))
    );

    let totalSize = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const dir of dirs) {
      const dirPath = path.join(hlsDir, dir);
      const stats = fs.statSync(dirPath);

      if (stats.isDirectory()) {
        // Calculate directory size
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const fileStats = fs.statSync(filePath);
          totalSize += fileStats.size;
        }

        // Track timestamps
        if (stats.mtimeMs < oldestTimestamp) {
          oldestTimestamp = stats.mtimeMs;
        }
        if (stats.mtimeMs > newestTimestamp) {
          newestTimestamp = stats.mtimeMs;
        }
      }
    }

    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    const ageHours = ((Date.now() - oldestTimestamp) / (1000 * 60 * 60)).toFixed(1);

    return NextResponse.json({
      success: true,
      totalSize: `${totalSizeMB} MB`,
      streamCount: dirs.length,
      activeStreamCount: activeStreams.length,
      inactiveStreamCount: dirs.length - activeStreams.length,
      oldestStreamAge: `${ageHours} hours`,
      recommendation: dirs.length > 10 ? 'Consider running cleanup' : 'No cleanup needed'
    });

  } catch (error) {
    console.error('Error getting cleanup status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cleanup status' },
      { status: 500 }
    );
  }
}
