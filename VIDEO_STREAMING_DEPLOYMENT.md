# Video Streaming System - Deployment Guide

## Overview

This guide provides detailed instructions for deploying the video streaming system with 1-second latency RTSP to HLS conversion. The system supports multiple IP cameras with real-time streaming, recording, and management capabilities.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IP Cameras    │    │   FFmpeg        │    │   Next.js API   │
│   (RTSP)        │───▶│   Processing    │───▶│   (HLS Serving) │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   HLS Segments  │    │   Browser       │
                       │   (0.6s each)   │    │   (hls.js)      │
                       └─────────────────┘    └─────────────────┘
```

## Prerequisites

### Hardware Requirements

- **CPU**: Multi-core processor (4+ cores recommended)
- **RAM**: 8GB+ (16GB recommended for multiple streams)
- **Storage**: SSD recommended for HLS segment storage
- **Network**: Gigabit Ethernet for camera streams

### Software Requirements

- **FFmpeg**: v4.4.0+ with H.264 support
- **Node.js**: v18.0.0+
- **Docker**: v20.10.0+ (optional)
- **hls.js**: v1.4.0+ (included in package.json)

## Installation Methods

### Method 1: Docker Deployment (Recommended)

#### 1.1 Setup Docker Compose

```bash
# Create docker-compose.video.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: radar-video-nginx
    ports:
      - "8083:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./video-storage:/var/www/html/recordings
      - ./hls-output:/var/www/html/hls
    restart: unless-stopped
    networks:
      - radar-network

  ffmpeg:
    image: alpine:latest
    container_name: radar-video-ffmpeg
    volumes:
      - ./video-storage:/recordings
      - ./hls-output:/hls
    command: ["sh", "-c", "echo 'FFmpeg service ready for RTSP to HLS conversion' && tail -f /dev/null"]
    restart: unless-stopped
    networks:
      - radar-network

networks:
  radar-network:
    driver: bridge
```

#### 1.2 Start Services

```bash
# Start video streaming services
docker-compose -f docker-compose.video.yml up -d

# Verify services are running
docker ps
```

### Method 2: Manual Installation

#### 2.1 Install FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
```bash
# Download from https://ffmpeg.org/download.html
# Add to PATH
```

#### 2.2 Create Directories

```bash
mkdir -p hls-output video-storage
chmod 755 hls-output video-storage
```

#### 2.3 Install Node.js Dependencies

```bash
cd dashboard
npm install hls.js
```

## Configuration

### 1. Camera Configuration

#### 1.1 Add Cameras via Dashboard

1. Navigate to http://localhost:3000/video-streaming
2. Click "Camera Settings" tab
3. Click "Add Camera"
4. Fill in camera details:

```
Camera Name: Intersection Camera 1
RTSP URL: rtsp://admin:password@192.168.1.100:554/stream
Resolution: 1920x1080
Frame Rate: 30 fps
Bitrate: 2000000 bps
```

#### 1.2 Test Camera Connection

```bash
# Test RTSP connectivity
ffprobe rtsp://admin:password@192.168.1.100:554/stream

# Expected output:
# Input #0, rtsp, from 'rtsp://...':
#   Duration: N/A, start: 0.000000, bitrate: N/A
#   Stream #0:0: Video: h264, yuv420p, 1920x1080, 30 fps
```

### 2. FFmpeg Configuration

#### 2.1 Ultra-Low Latency Settings

Create `start-1sec-latency.sh`:

```bash
#!/bin/bash

echo "🚀 Starting 1-Second Latency Video Streaming..."

# Camera Configuration
CAMERA_ID="camera_192_168_7_231"
RTSP_URL="rtsp://192.168.7.231/live/main_stream"
OUTPUT_DIR="./hls-output/${CAMERA_ID}_$(date +%s)"
LOG_FILE="camera_1sec_latency.log"

# Ensure hls-output directory exists
mkdir -p ./hls-output

# Clean up previous HLS output for this camera
rm -rf ./hls-output/${CAMERA_ID}_*

mkdir -p "$OUTPUT_DIR"
echo "📹 Starting Camera Stream: $RTSP_URL"
echo "📁 Output Directory: $OUTPUT_DIR"

# FFmpeg command for 1-second latency HLS
ffmpeg -rtsp_transport tcp -analyzeduration 1000000 -probesize 1000000 \
  -i "$RTSP_URL" \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -c:a aac \
  -f hls \
  -hls_time 0.6 \
  -hls_list_size 2 \
  -hls_flags delete_segments \
  -hls_segment_filename "${OUTPUT_DIR}/segment_%03d.ts" \
  -g 15 -keyint_min 15 \
  -fflags +genpts -avoid_negative_ts make_zero \
  -max_delay 500000 -flags +global_header -bsf:a aac_adtstoasc -vsync 1 -fps_mode passthrough \
  -avioflags direct -fflags nobuffer -probesize 32 -analyzeduration 0 -max_interleave_delta 0 \
  -rw_timeout 5000000 -reorder_queue_size 0 \
  "${OUTPUT_DIR}/playlist.m3u8" -y > "$LOG_FILE" 2>&1 &

FFMPEG_PID=$!
echo "🎥 FFmpeg PID: $FFMPEG_PID"
echo "$FFMPEG_PID" > "${OUTPUT_DIR}/ffmpeg.pid"

echo "✅ 1-second latency streaming started!"
echo "📊 Stream URL: http://localhost:3000/api/video/hls/${CAMERA_ID}_$(date +%s)/playlist.m3u8"
echo "📋 Log: tail -f $LOG_FILE"
echo "🛑 Stop: kill $FFMPEG_PID"
```

#### 2.2 Make Script Executable

```bash
chmod +x start-1sec-latency.sh
```

### 3. Next.js API Configuration

#### 3.1 HLS Serving API

The system includes a Next.js API route at `/api/video/hls/[...path]` that:

- Serves HLS playlists and segments
- Provides proper CORS headers
- Sets correct MIME types
- Handles file security

#### 3.2 Stream Management API

Endpoints available:

- `GET /api/video/cameras` - List cameras
- `POST /api/video/cameras` - Add camera
- `PUT /api/video/cameras` - Update camera
- `GET /api/video/streams` - List active streams
- `POST /api/video/streams` - Start stream
- `DELETE /api/video/streams` - Stop stream

## Deployment Steps

### Step 1: Start Core Services

```bash
# Start Next.js application
cd dashboard
npm run dev

# In another terminal, start video streaming
./start-1sec-latency.sh
```

### Step 2: Verify Deployment

#### 2.1 Check FFmpeg Process

```bash
ps aux | grep ffmpeg
# Should show FFmpeg process running
```

#### 2.2 Check HLS Output

```bash
ls -la hls-output/
# Should show camera directories with .m3u8 and .ts files
```

#### 2.3 Test HLS Playlist

```bash
curl http://localhost:3000/api/video/hls/camera_*/playlist.m3u8
# Should return HLS playlist content
```

#### 2.4 Test Video Segments

```bash
curl -I http://localhost:3000/api/video/hls/camera_*/segment_000.ts
# Should return 200 OK with video/mp2t content type
```

### Step 3: Browser Testing

1. Open http://localhost:3000/video-streaming
2. Verify camera appears in the list
3. Click "Start Stream" for a camera
4. Verify video plays with low latency

## Performance Optimization

### 1. Latency Optimization

#### 1.1 FFmpeg Parameters

For 1-second latency:

```bash
-hls_time 0.6          # 0.6-second segments
-hls_list_size 2       # Keep 2 segments (1.2s total)
-preset ultrafast      # Fastest encoding
-tune zerolatency      # Zero latency tuning
```

#### 1.2 Network Optimization

```bash
-rtsp_transport tcp    # Use TCP for stability
-analyzeduration 1M    # Quick analysis
-probesize 1M          # Small probe size
```

### 2. Resource Management

#### 2.1 CPU Usage

Monitor FFmpeg CPU usage:
```bash
top -p $(pgrep ffmpeg)
```

#### 2.2 Memory Usage

Monitor HLS output directory:
```bash
du -sh hls-output/
```

#### 2.3 Disk Space

Set up log rotation:
```bash
# Add to crontab
0 2 * * * find /path/to/hls-output -name "*.ts" -mtime +1 -delete
```

### 3. Quality Settings

#### 3.1 Resolution Scaling

For multiple cameras, scale resolution:

```bash
# 1080p for primary camera
-vf scale=1920:1080

# 720p for secondary cameras
-vf scale=1280:720
```

#### 3.2 Bitrate Control

```bash
# High quality
-b:v 2000000

# Medium quality
-b:v 1000000

# Low quality
-b:v 500000
```

## Monitoring and Maintenance

### 1. Health Monitoring

#### 1.1 FFmpeg Process Monitoring

```bash
# Check if FFmpeg is running
pgrep ffmpeg

# Check FFmpeg logs
tail -f camera_1sec_latency.log
```

#### 1.2 HLS Stream Monitoring

```bash
# Check playlist updates
watch -n 1 'curl -s http://localhost:3000/api/video/hls/camera_*/playlist.m3u8 | tail -5'
```

#### 1.3 API Health Check

```bash
# Check API endpoints
curl http://localhost:3000/api/video/streams
```

### 2. Log Management

#### 2.1 Log Rotation

Create `/etc/logrotate.d/radar-video`:

```
/path/to/camera_*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 root root
}
```

#### 2.2 Error Monitoring

```bash
# Monitor for errors
grep -i error camera_1sec_latency.log

# Monitor for connection issues
grep -i "connection refused" camera_1sec_latency.log
```

### 3. Performance Metrics

#### 3.1 Latency Measurement

```bash
# Measure end-to-end latency
# 1. Note timestamp in video
# 2. Compare with current time
# 3. Calculate difference
```

#### 3.2 Throughput Monitoring

```bash
# Monitor network usage
iftop -i eth0

# Monitor disk I/O
iotop
```

## Troubleshooting

### Common Issues

#### 1. Video Not Playing

**Symptoms:**
- Black video player
- "Connecting to camera..." message persists
- Browser console shows HLS errors

**Solutions:**
```bash
# Check FFmpeg process
ps aux | grep ffmpeg

# Check HLS output
ls -la hls-output/

# Test RTSP connection
ffprobe rtsp://camera-url

# Check API response
curl http://localhost:3000/api/video/streams
```

#### 2. High Latency

**Symptoms:**
- Video delay > 2 seconds
- Stuttering playback

**Solutions:**
```bash
# Reduce segment duration
-hls_time 0.5

# Reduce playlist size
-hls_list_size 2

# Use faster preset
-preset ultrafast
```

#### 3. Connection Drops

**Symptoms:**
- Intermittent video loss
- "Camera Offline" status

**Solutions:**
```bash
# Use TCP transport
-rtsp_transport tcp

# Increase timeout
-rw_timeout 10000000

# Add reconnection logic
```

#### 4. Poor Video Quality

**Symptoms:**
- Pixelated video
- Artifacts

**Solutions:**
```bash
# Increase bitrate
-b:v 3000000

# Use better codec settings
-c:v libx264 -profile:v high -level 4.0

# Adjust resolution
-vf scale=1920:1080
```

### Debug Commands

```bash
# Test RTSP stream
ffprobe -v quiet -print_format json -show_format -show_streams rtsp://camera-url

# Test HLS playlist
curl -v http://localhost:3000/api/video/hls/stream-id/playlist.m3u8

# Monitor FFmpeg output
ffmpeg -rtsp_transport tcp -i rtsp://camera-url -f null -

# Check network connectivity
ping camera-ip
telnet camera-ip 554
```

## Production Deployment

### 1. Systemd Service

Create `/etc/systemd/system/radar-video.service`:

```ini
[Unit]
Description=Radar Video Streaming Service
After=network.target

[Service]
Type=simple
User=radar
WorkingDirectory=/path/to/radar-ai/dashboard
ExecStart=/path/to/start-1sec-latency.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl enable radar-video
sudo systemctl start radar-video
```

### 2. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/video/hls/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        add_header Cache-Control no-cache;
    }
}
```

### 3. SSL Configuration

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Security Considerations

### 1. Camera Security

- Change default passwords
- Use strong authentication
- Enable RTSP authentication
- Use VPN for remote access

### 2. Network Security

- Firewall configuration
- Network segmentation
- Regular security updates
- Access control lists

### 3. Data Protection

- Encrypt video recordings
- Secure API endpoints
- Regular backups
- Audit logging

## Backup and Recovery

### 1. Video Recordings Backup

```bash
# Backup video recordings
tar -czf video-recordings-$(date +%Y%m%d).tar.gz video-storage/

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backup/video-recordings"
SOURCE_DIR="/path/to/video-storage"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf "$BACKUP_DIR/video-recordings-$DATE.tar.gz" $SOURCE_DIR

# Keep only last 30 days
find $BACKUP_DIR -name "video-recordings-*.tar.gz" -mtime +30 -delete
```

### 2. Configuration Backup

```bash
# Backup configuration
cp -r hls-output/ /backup/hls-output-$(date +%Y%m%d)/
cp camera_*.log /backup/logs/
```

### 3. Recovery Procedures

```bash
# Restore video recordings
tar -xzf video-recordings-YYYYMMDD.tar.gz -C /path/to/video-storage/

# Restart services
sudo systemctl restart radar-video
```

---

## Quick Reference

### Essential Commands

```bash
# Start video streaming
./start-1sec-latency.sh

# Stop video streaming
pkill ffmpeg

# Check status
ps aux | grep ffmpeg
curl http://localhost:3000/api/video/streams

# Monitor logs
tail -f camera_1sec_latency.log

# Test camera
ffprobe rtsp://camera-url
```

### Configuration Files

- `start-1sec-latency.sh` - FFmpeg startup script
- `nginx.conf` - Nginx configuration
- `docker-compose.video.yml` - Docker services
- `.env.local` - Environment variables

### Important URLs

- Dashboard: http://localhost:3000/video-streaming
- API: http://localhost:3000/api/video/
- HLS Stream: http://localhost:3000/api/video/hls/stream-id/playlist.m3u8

For additional support, refer to the main deployment guide or contact the development team.
