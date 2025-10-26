import { NextRequest, NextResponse } from 'next/server';
import { videoStorage } from '@/lib/video-storage';
import { VideoRecording } from '@/types/camera';

/**
 * GET /api/video/recordings
 * List video recordings
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get('cameraId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let recordings: VideoRecording[];

    if (cameraId) {
      recordings = videoStorage.getRecordingsByCamera(cameraId);
    } else {
      recordings = videoStorage.listRecordings();
    }

    // Apply pagination
    const paginatedRecordings = recordings.slice(offset, offset + limit);
    const totalCount = recordings.length;

    return NextResponse.json({
      success: true,
      recordings: paginatedRecordings,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/video/recordings
 * Start video recording
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cameraId, duration = 60000 } = body; // Default 1 minute

    if (!cameraId) {
      return NextResponse.json(
        { success: false, error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    // Generate recording filename
    const timestamp = new Date();
    const filename = videoStorage.generateFilename(cameraId, timestamp);
    const recordingPath = videoStorage.getVideoPath(filename);

    // Create recording metadata
    const recording: VideoRecording = {
      id: filename.replace(/\.(webm|mp4)$/, ''),
      cameraId,
      filename,
      startTime: timestamp,
      endTime: new Date(timestamp.getTime() + duration),
      duration,
      size: 0,
      path: recordingPath
    };

    // TODO: Implement actual recording logic with RTSPtoWebRTC service
    // For now, return the recording metadata
    return NextResponse.json({
      success: true,
      recording,
      message: 'Recording started'
    }, { status: 201 });

  } catch (error) {
    console.error('Error starting recording:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start recording' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/video/recordings
 * Delete video recording
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }

    const success = videoStorage.deleteRecording(filename);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Recording not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Recording deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting recording:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete recording' },
      { status: 500 }
    );
  }
}
