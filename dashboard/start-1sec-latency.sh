#!/bin/bash

echo "🚀 Starting 1-Second Latency Video Streaming..."

# Simple single camera configuration for 1-second latency
CAMERA_ID="camera_192_168_7_231"
RTSP_URL="rtsp://192.168.7.231/live/main_stream"
OUTPUT_DIR="./hls-output/${CAMERA_ID}_$(date +%s)"
LOG_FILE="camera_1sec_latency.log"

mkdir -p "$OUTPUT_DIR"

echo "📹 Starting Camera Stream: $RTSP_URL"
echo "📁 Output Directory: $OUTPUT_DIR"

# Ultra low latency FFmpeg command
ffmpeg -rtsp_transport tcp \
  -analyzeduration 500000 -probesize 500000 \
  -i "$RTSP_URL" \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -g 15 -keyint_min 15 \
  -c:a aac -ar 44100 -ac 2 \
  -f hls \
  -hls_time 0.5 \
  -hls_list_size 2 \
  -hls_flags delete_segments \
  -hls_segment_filename "${OUTPUT_DIR}/segment_%03d.ts" \
  -fflags +genpts -avoid_negative_ts make_zero \
  -max_delay 500000 \
  "${OUTPUT_DIR}/playlist.m3u8" -y > "$LOG_FILE" 2>&1 &

FFMPEG_PID=$!
echo "🎥 FFmpeg PID: $FFMPEG_PID"
echo "$FFMPEG_PID" > "${OUTPUT_DIR}/ffmpeg.pid"

echo "✅ 1-second latency streaming started!"
echo "📊 Stream URL: http://localhost:8083/hls/${CAMERA_ID}_$(date +%s)/playlist.m3u8"
echo "📋 Log: tail -f $LOG_FILE"
echo "🛑 Stop: kill $FFMPEG_PID"
