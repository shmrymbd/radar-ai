#!/bin/bash

echo "🚀 Starting Ultra Low Latency RTSP to HLS Streaming (Target: 1 second)..."

# Camera 1 Configuration
CAMERA1_ID="camera_1761443762368_q4fgbkrwb"
CAMERA1_RTSP_URL="rtsp://admin:password@192.168.7.230/live/main_stream"
CAMERA1_OUTPUT_DIR="./hls-output/${CAMERA1_ID}_$(date +%s)"
CAMERA1_LOG_FILE="camera1_ultra_low_latency.log"

# Camera 2 Configuration
CAMERA2_ID="camera_1761445153665_9aw9eysyr"
CAMERA2_RTSP_URL="rtsp://192.168.7.231/live/main_stream"
CAMERA2_OUTPUT_DIR="./hls-output/${CAMERA2_ID}_$(date +%s)"
CAMERA2_LOG_FILE="camera2_ultra_low_latency.log"

# Ensure hls-output directory exists
mkdir -p ./hls-output

# Function to start FFmpeg for ultra low latency
start_ultra_low_latency_ffmpeg() {
  local camera_id=$1
  local rtsp_url=$2
  local output_dir=$3
  local log_file=$4

  mkdir -p "$output_dir"
  echo "📹 Starting Ultra Low Latency Camera $camera_id Stream: $rtsp_url"
  echo "📁 Output Directory: $output_dir"

  # FFmpeg command optimized for ultra low latency (target: 1 second)
  # -rtsp_transport tcp: Force TCP for RTSP to avoid UDP issues
  # -analyzeduration 1M -probesize 1M: Minimal analysis for fastest startup
  # -c:v libx264 -preset ultrafast -tune zerolatency: Maximum speed encoding
  # -g 15 -keyint_min 15: Keyframe every 15 frames (0.5s at 30fps)
  # -c:a aac -ar 44100 -ac 2: Audio settings
  # -f hls: Output format HLS
  # -hls_time 0.5: 0.5-second segments for minimal latency
  # -hls_list_size 2: Keep only 2 segments (1 second total)
  # -hls_flags delete_segments: Delete old segments immediately
  # -hls_segment_filename: Naming convention for segments
  # -y: Overwrite output files without asking
  # -fflags +genpts: Generate presentation timestamps
  # -avoid_negative_ts make_zero: Handle timestamp issues
  # -max_delay 500000: Maximum delay 0.5 seconds
  # -reorder_queue_size 0: Disable reordering for lower latency
  ffmpeg -rtsp_transport tcp -analyzeduration 1000000 -probesize 1000000 \
    -i "$rtsp_url" \
    -c:v libx264 -preset ultrafast -tune zerolatency \
    -g 15 -keyint_min 15 \
    -c:a aac -ar 44100 -ac 2 \
    -f hls \
    -hls_time 0.5 \
    -hls_list_size 2 \
    -hls_flags delete_segments \
    -hls_segment_filename "${output_dir}/segment_%03d.ts" \
    -fflags +genpts -avoid_negative_ts make_zero \
    -max_delay 500000 -reorder_queue_size 0 \
    "${output_dir}/playlist.m3u8" -y > "$log_file" 2>&1 &
  
  echo "🎥 Camera $camera_id FFmpeg PID: $!"
  echo "$!" > "${output_dir}/ffmpeg.pid" # Store PID for stopping
}

# Start streaming for both cameras
start_ultra_low_latency_ffmpeg "$CAMERA1_ID" "$CAMERA1_RTSP_URL" "$CAMERA1_OUTPUT_DIR" "$CAMERA1_LOG_FILE"
start_ultra_low_latency_ffmpeg "$CAMERA2_ID" "$CAMERA2_RTSP_URL" "$CAMERA2_OUTPUT_DIR" "$CAMERA2_LOG_FILE"

echo "✅ Ultra low latency streaming started!"
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
echo "⚡ Ultra Low Latency optimizations applied:"
echo "   - 0.5-second HLS segments (vs 1-second)"
echo "   - 2 segments in playlist (vs 3)"
echo "   - Minimal codec analysis (1M vs 2M)"
echo "   - Keyframes every 15 frames (0.5s at 30fps)"
echo "   - Maximum delay 0.5 seconds"
echo "   - Disabled reordering queue"
echo "   - Target latency: ~1 second"
