#!/bin/bash

# Start Live RTSP to HLS Streaming for Radar Cameras
# This script converts real RTSP streams to HLS format

echo "🚀 Starting Live RTSP to HLS Streaming for Radar Cameras..."

# Camera 1: rtsp://192.168.7.230/live/main_stream
CAMERA1_ID="camera_1761443762368_q4fgbkrwb"
CAMERA1_RTSP="rtsp://admin:password@192.168.7.230/live/main_stream"
CAMERA1_OUTPUT_DIR="./hls-output/stream_${CAMERA1_ID}_$(date +%s)"

# Camera 2: rtsp://192.168.7.231/live/main_stream  
CAMERA2_ID="camera_1761445153665_9aw9eysyr"
CAMERA2_RTSP="rtsp://192.168.7.231/live/main_stream"
CAMERA2_OUTPUT_DIR="./hls-output/stream_${CAMERA2_ID}_$(date +%s)"

# Create output directories
mkdir -p "$CAMERA1_OUTPUT_DIR"
mkdir -p "$CAMERA2_OUTPUT_DIR"

echo "📹 Starting Camera 1 Stream: $CAMERA1_RTSP"
echo "📁 Output Directory: $CAMERA1_OUTPUT_DIR"

# Start FFmpeg for Camera 1 (in background)
ffmpeg -i "$CAMERA1_RTSP" \
  -c:v libx264 \
  -c:a aac \
  -f hls \
  -hls_time 2 \
  -hls_list_size 5 \
  -hls_flags delete_segments \
  -hls_segment_filename "$CAMERA1_OUTPUT_DIR/segment_%03d.ts" \
  "$CAMERA1_OUTPUT_DIR/playlist.m3u8" \
  -y &

CAMERA1_PID=$!
echo "🎥 Camera 1 FFmpeg PID: $CAMERA1_PID"

echo "📹 Starting Camera 2 Stream: $CAMERA2_RTSP"
echo "📁 Output Directory: $CAMERA2_OUTPUT_DIR"

# Start FFmpeg for Camera 2 (in background)
ffmpeg -i "$CAMERA2_RTSP" \
  -c:v libx264 \
  -c:a aac \
  -f hls \
  -hls_time 2 \
  -hls_list_size 5 \
  -hls_flags delete_segments \
  -hls_segment_filename "$CAMERA2_OUTPUT_DIR/segment_%03d.ts" \
  "$CAMERA2_OUTPUT_DIR/playlist.m3u8" \
  -y &

CAMERA2_PID=$!
echo "🎥 Camera 2 FFmpeg PID: $CAMERA2_PID"

# Save PIDs for cleanup
echo "$CAMERA1_PID" > camera1_ffmpeg.pid
echo "$CAMERA2_PID" > camera2_ffmpeg.pid
echo "$CAMERA1_OUTPUT_DIR" > camera1_output_dir.txt
echo "$CAMERA2_OUTPUT_DIR" > camera2_output_dir.txt

echo "✅ Live streaming started!"
echo "📊 Monitor streams at:"
echo "   Camera 1: http://localhost:8083/hls/$(basename $CAMERA1_OUTPUT_DIR)/playlist.m3u8"
echo "   Camera 2: http://localhost:8083/hls/$(basename $CAMERA2_OUTPUT_DIR)/playlist.m3u8"
echo ""
echo "🛑 To stop streams, run: ./stop-live-streams.sh"
echo "📋 To check status, run: ps aux | grep ffmpeg"
