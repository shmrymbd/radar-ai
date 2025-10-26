#!/bin/bash

# Script to start FFmpeg process for RTSP to HLS conversion
# Usage: ./start-ffmpeg-stream.sh <stream_id> <rtsp_url> <output_dir>

STREAM_ID=$1
RTSP_URL=$2
OUTPUT_DIR=$3

if [ -z "$STREAM_ID" ] || [ -z "$RTSP_URL" ] || [ -z "$OUTPUT_DIR" ]; then
    echo "Usage: $0 <stream_id> <rtsp_url> <output_dir>"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR/$STREAM_ID"

# Start FFmpeg process to convert RTSP to HLS
ffmpeg -i "$RTSP_URL" \
    -c:v libx264 \
    -c:a aac \
    -preset ultrafast \
    -tune zerolatency \
    -f hls \
    -hls_time 2 \
    -hls_list_size 3 \
    -hls_flags delete_segments \
    -hls_segment_filename "$OUTPUT_DIR/$STREAM_ID/segment_%03d.ts" \
    "$OUTPUT_DIR/$STREAM_ID/playlist.m3u8" \
    -y

echo "FFmpeg process started for stream $STREAM_ID"
