#!/bin/bash

echo "🔄 Starting HLS sync process..."

SOURCE_DIR="hls-output/camera_192_168_7_231_1761466323"
TARGET_DIR="hls-output/stream_camera_1761466795351_gtiooghna_1761466797643"

while true; do
  # Copy the latest playlist
  if [ -f "$SOURCE_DIR/playlist.m3u8" ]; then
    cp "$SOURCE_DIR/playlist.m3u8" "$TARGET_DIR/"
    echo "📋 Updated playlist: $(date)"
  fi
  
  # Copy the latest segments (keep last 5)
  if [ -d "$SOURCE_DIR" ]; then
    ls -t "$SOURCE_DIR"/segment_*.ts | head -5 | xargs -I {} cp {} "$TARGET_DIR/"
    echo "📹 Updated segments: $(date)"
  fi
  
  sleep 1
done
