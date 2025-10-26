import { NextRequest, NextResponse } from 'next/server';
import { videoStorage } from '@/lib/video-storage';
import fs from 'fs';

/**
 * GET /api/video/recordings/download
 * Download video recording
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { success: false, error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const filePath = videoStorage.getVideoPath(filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Create read stream
    const fileStream = fs.createReadStream(filePath);

    // Set response headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'video/webm');
    headers.set('Content-Length', fileSize.toString());
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Cache-Control', 'no-cache');

    // Return file stream
    return new NextResponse(fileStream as any, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error downloading recording:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download recording' },
      { status: 500 }
    );
  }
}
