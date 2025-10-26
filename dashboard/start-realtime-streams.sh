#!/bin/bash

echo "🚀 Starting Real-time RTSP to HLS Streaming for Radar Cameras..."

# Camera 1 Configuration
CAMERA1_ID="camera_1761443762368_q4fgbkrwb"
CAMERA1_RTSP_URL="rtsp://admin:password@192.168.7.230/live/main_stream"
CAMERA1_OUTPUT_DIR="./hls-output/${CAMERA1_ID}_$(date +%s)"
CAMERA1_LOG_FILE="camera1_realtime_ffmpeg.log"

# Camera 2 Configuration
CAMERA2_ID="camera_1761445153665_9aw9eysyr"
CAMERA2_RTSP_URL="rtsp://192.168.7.231/live/main_stream"
CAMERA2_OUTPUT_DIR="./hls-output/${CAMERA2_ID}_$(date +%s)"
CAMERA2_LOG_FILE="camera2_realtime_ffmpeg.log"

# Ensure hls-output directory exists
mkdir -p ./hls-output

# Function to start FFmpeg for a camera with real-time optimizations
start_realtime_ffmpeg() {
  local camera_id=$1
  local rtsp_url=$2
  local output_dir=$3
  local log_file=$4

  mkdir -p "$output_dir"
  echo "📹 Starting Real-time Camera $camera_id Stream: $rtsp_url"
  echo "📁 Output Directory: $output_dir"

  # FFmpeg command optimized for real-time streaming
  # -rtsp_transport tcp: Force TCP for RTSP to avoid UDP issues
  # -analyzeduration 2M -probesize 2M: Faster analysis for real-time
  # -c:v libx264 -preset ultrafast -tune zerolatency: Maximum speed encoding
  # -g 30 -keyint_min 30: Keyframe every 30 frames for better seeking
  # -c:a aac -ar 44100 -ac 2: Audio settings
  # -f hls: Output format HLS
  # -hls_time 1: 1-second segments for lower latency
  # -hls_list_size 3: Keep only 3 segments for minimal delay
  # -hls_flags delete_segments: Delete old segments immediately
  # -hls_segment_filename: Naming convention for segments
  # -y: Overwrite output files without asking
  # -fflags +genpts: Generate presentation timestamps
  # -avoid_negative_ts make_zero: Handle timestamp issues
  ffmpeg -rtsp_transport tcp -analyzeduration 2000000 -probesize 2000000 \
    -i "$rtsp_url" \
    -c:v libx264 -preset ultrafast -tune zerolatency \
    -g 30 -keyint_min 30 \
    -c:a aac -ar 44100 -ac 2 \
    -f hls \
    -hls_time 1 \
    -hls_list_size 3 \
    -hls_flags delete_segments \
    -hls_segment_filename "${output_dir}/segment_%03d.ts" \
    -fflags +genpts -avoid_negative_ts make_zero \
    "${output_dir}/playlist.m3u8" -y > "$log_file" 2>&1 &
  
  echo "🎥 Camera $camera_id FFmpeg PID: $!"
  echo "$!" > "${output_dir}/ffmpeg.pid" # Store PID for stopping
}

# Start streaming for both cameras
start_realtime_ffmpeg "$CAMERA1_ID" "$CAMERA1_RTSP_URL" "$CAMERA1_OUTPUT_DIR" "$CAMERA1_LOG_FILE"
start_realtime_ffmpeg "$CAMERA2_ID" "$CAMERA2_RTSP_URL" "$CAMERA2_OUTPUT_DIR" "$CAMERA2_LOG_FILE"

echo "✅ Real-time streaming started!"
echo "📊 Monitor streams at:"
echo "   Camera 1: http://localhost:8083/hls/${CAMERA1_ID}_$(date +%s)/playlist.m3u8"
echo "   Camera 2: http://localhost:8083/hls/${CAMERA2_ID}_$(date +%s)/playlist.m3u8"
echo ""
echo "📋 Check logs:"
echo "   Camera 1: tail -f $CAMERA1_LOG_FILE"
echo "   Camera 2: tail -f $CAMERA2_LOG_FILE"
echo ""
echo "🛑 To stop streams, run: ./stop-live-streams.sh"
echo ""
echo "⚡ Real-time optimizations applied:"
echo "   - 1-second HLS segments (vs 2-second)"
echo "   - 3 segments in playlist (vs 5)"
echo "   - Faster codec analysis"
echo "   - Better timestamp handling"
echo "   - Optimized for low latency"
