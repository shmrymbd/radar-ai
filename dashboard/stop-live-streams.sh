#!/bin/bash

# Stop Live RTSP to HLS Streaming
echo "🛑 Stopping Live RTSP to HLS Streaming..."

# Stop Camera 1 FFmpeg process
if [ -f camera1_ffmpeg.pid ]; then
    CAMERA1_PID=$(cat camera1_ffmpeg.pid)
    if ps -p $CAMERA1_PID > /dev/null; then
        echo "🛑 Stopping Camera 1 FFmpeg (PID: $CAMERA1_PID)..."
        kill $CAMERA1_PID
        echo "✅ Camera 1 FFmpeg stopped"
    else
        echo "⚠️  Camera 1 FFmpeg process not found"
    fi
    rm camera1_ffmpeg.pid
else
    echo "⚠️  Camera 1 PID file not found"
fi

# Stop Camera 2 FFmpeg process
if [ -f camera2_ffmpeg.pid ]; then
    CAMERA2_PID=$(cat camera2_ffmpeg.pid)
    if ps -p $CAMERA2_PID > /dev/null; then
        echo "🛑 Stopping Camera 2 FFmpeg (PID: $CAMERA2_PID)..."
        kill $CAMERA2_PID
        echo "✅ Camera 2 FFmpeg stopped"
    else
        echo "⚠️  Camera 2 FFmpeg process not found"
    fi
    rm camera2_ffmpeg.pid
else
    echo "⚠️  Camera 2 PID file not found"
fi

# Clean up any remaining FFmpeg processes
echo "🧹 Cleaning up any remaining FFmpeg processes..."
pkill -f "ffmpeg.*rtsp" 2>/dev/null || true

echo "✅ All live streams stopped!"
