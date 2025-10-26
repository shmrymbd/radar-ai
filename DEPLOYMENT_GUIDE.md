# Radar AI Traffic Dashboard - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Radar AI Traffic Dashboard with video streaming capabilities. The system includes:

- **Traffic Signal Control Dashboard** - Real-time radar data monitoring and signal control
- **Vehicle Classification System** - AI-powered vehicle type detection and analytics
- **Video Streaming System** - RTSP camera integration with 1-second latency HLS streaming
- **Multi-Device Support** - Dynamic radar device selection and management

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Radar Units   │    │   RTSP Cameras  │    │   External DB   │
│   (ClairWav-T80)│    │   (IP Cameras)  │    │  (MongoDB/Redis)│
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
┌─────────▼───────┐    ┌─────────▼───────┐    ┌─────────▼───────┐
│  Radar Data     │    │  Video Stream   │    │  Data Storage   │
│  Processing     │    │  Processing     │    │  & Caching      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Next.js Dashboard     │
                    │   (Frontend + API)        │
                    └───────────────────────────┘
```

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **RAM**: Minimum 8GB, Recommended 16GB+
- **Storage**: 50GB+ available space
- **Network**: Stable internet connection for radar data and camera streams

### Software Dependencies

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Docker**: v20.10.0 or higher
- **Docker Compose**: v2.0.0 or higher
- **FFmpeg**: v4.4.0 or higher (for video streaming)
- **MongoDB**: v5.0 or higher
- **Redis**: v6.0 or higher

### Hardware Requirements

- **Radar Units**: ClairWav-T80 radar systems
- **Cameras**: IP cameras with RTSP support
- **Network**: Gigabit Ethernet recommended for video streaming

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd radar-ai
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
cd dashboard
npm install

# Install FFmpeg (Ubuntu/Debian)
sudo apt update
sudo apt install ffmpeg

# Install FFmpeg (macOS)
brew install ffmpeg

# Install FFmpeg (Windows)
# Download from https://ffmpeg.org/download.html
```

### 3. Environment Configuration

Create environment files:

```bash
# Create .env.local in dashboard directory
cd dashboard
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/radar-ai
REDIS_URL=redis://localhost:6379

# Application Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Video Streaming Configuration
VIDEO_SERVICE_URL=http://localhost:8083
HLS_OUTPUT_DIR=./hls-output
VIDEO_STORAGE_DIR=./video-storage

# Radar Configuration
RADAR_DEVICE_IP=192.168.6.22
RADAR_DEVICE_PORT=3001
```

### 4. Database Setup

#### MongoDB Setup

```bash
# Start MongoDB service
sudo systemctl start mongod
# OR using Docker
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Create database and collections
mongo
use radar-ai
db.createCollection("vehicles")
db.createCollection("lanes")
db.createCollection("cameras")
db.createCollection("recordings")
```

#### Redis Setup

```bash
# Start Redis service
sudo systemctl start redis
# OR using Docker
docker run -d --name redis -p 6379:6379 redis:latest
```

### 5. Video Streaming Infrastructure

#### Docker Compose Setup

```bash
# Start video streaming services
cd dashboard
docker-compose -f docker-compose.video.yml up -d
```

#### Manual FFmpeg Setup (Alternative)

```bash
# Create directories
mkdir -p hls-output video-storage

# Start FFmpeg for each camera
./start-1sec-latency.sh
```

## Deployment Options

### Option 1: Development Deployment

```bash
# Start development server
cd dashboard
npm run dev

# Start video streaming
./start-1sec-latency.sh

# Start radar data processing
npm run start:radar
```

**Access URLs:**
- Dashboard: http://localhost:3000
- Video Streaming: http://localhost:3000/video-streaming
- API: http://localhost:3000/api

### Option 2: Production Deployment

#### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Using Docker

```bash
# Build Docker image
docker build -t radar-ai-dashboard .

# Run container
docker run -d \
  --name radar-dashboard \
  -p 3000:3000 \
  -p 8083:8083 \
  -v $(pwd)/hls-output:/app/hls-output \
  -v $(pwd)/video-storage:/app/video-storage \
  radar-ai-dashboard
```

### Option 3: Cloud Deployment

#### AWS EC2 Deployment

```bash
# Launch EC2 instance (t3.large or larger)
# Install dependencies
sudo apt update
sudo apt install nodejs npm docker.io docker-compose

# Clone and setup
git clone <repository-url>
cd radar-ai/dashboard
npm install
npm run build

# Configure security groups
# - Port 3000 (HTTP)
# - Port 8083 (Video streaming)
# - Port 27017 (MongoDB)
# - Port 6379 (Redis)
```

#### Docker Swarm Deployment

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml radar-ai
```

## Configuration

### Radar Device Configuration

1. **Connect Radar Units**
   - Ensure radar units are powered and connected to network
   - Verify IP addresses and ports
   - Test connectivity: `ping <radar-ip>`

2. **Configure Device Settings**
   - Access dashboard at http://localhost:3000
   - Navigate to Device Settings
   - Add radar devices with correct IP addresses

### Camera Configuration

1. **Add RTSP Cameras**
   - Navigate to Video Streaming tab
   - Click "Camera Settings"
   - Add camera with RTSP URL format: `rtsp://username:password@ip:port/stream`

2. **Test Camera Connectivity**
   - Use built-in test function
   - Verify video feed appears in dashboard

### Video Streaming Optimization

For optimal 1-second latency:

```bash
# Use optimized FFmpeg settings
./start-1sec-latency.sh

# Monitor performance
tail -f camera_1sec_latency.log
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check application status
curl http://localhost:3000/api/health

# Check video streaming
curl http://localhost:3000/api/video/streams

# Check radar data
curl http://localhost:3000/api/radar/status
```

### Log Monitoring

```bash
# Application logs
pm2 logs radar-dashboard

# Video streaming logs
tail -f camera_1sec_latency.log

# System logs
journalctl -u radar-ai -f
```

### Performance Monitoring

```bash
# Monitor system resources
htop

# Monitor network traffic
iftop

# Monitor disk usage
df -h
```

## Troubleshooting

### Common Issues

#### Video Not Streaming

1. **Check FFmpeg Process**
   ```bash
   ps aux | grep ffmpeg
   ```

2. **Verify Camera Connectivity**
   ```bash
   ffprobe rtsp://camera-url
   ```

3. **Check HLS Output**
   ```bash
   ls -la hls-output/
   curl http://localhost:3000/api/video/hls/stream-id/playlist.m3u8
   ```

#### Radar Data Not Updating

1. **Check Radar Connection**
   ```bash
   ping <radar-ip>
   telnet <radar-ip> 3001
   ```

2. **Verify WebSocket Connection**
   - Check browser console for WebSocket errors
   - Verify radar data processing service is running

#### Database Connection Issues

1. **Check MongoDB**
   ```bash
   sudo systemctl status mongod
   mongo --eval "db.adminCommand('ismaster')"
   ```

2. **Check Redis**
   ```bash
   sudo systemctl status redis
   redis-cli ping
   ```

### Performance Optimization

#### Video Streaming

- **Reduce Latency**: Use `start-1sec-latency.sh` script
- **Optimize Bandwidth**: Adjust bitrate in camera settings
- **Monitor Resources**: Ensure sufficient CPU and memory

#### Database Performance

- **Index Optimization**: Add indexes for frequently queried fields
- **Connection Pooling**: Configure appropriate pool sizes
- **Caching**: Use Redis for frequently accessed data

## Security Considerations

### Network Security

- Use HTTPS in production
- Implement proper firewall rules
- Use VPN for remote access
- Regular security updates

### Data Protection

- Encrypt sensitive data
- Implement access controls
- Regular backups
- Audit logging

### Camera Security

- Change default passwords
- Use secure RTSP authentication
- Network isolation for cameras
- Regular firmware updates

## Backup and Recovery

### Database Backup

```bash
# MongoDB backup
mongodump --db radar-ai --out /backup/mongodb/

# Redis backup
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backup/redis/
```

### Video Recording Backup

```bash
# Backup video recordings
tar -czf video-recordings-$(date +%Y%m%d).tar.gz video-storage/
```

### System Recovery

1. **Restore Database**
   ```bash
   mongorestore --db radar-ai /backup/mongodb/radar-ai/
   ```

2. **Restore Application**
   ```bash
   git pull origin main
   npm install
   npm run build
   pm2 restart radar-dashboard
   ```

## Scaling

### Horizontal Scaling

- Use load balancers for multiple instances
- Implement database clustering
- Use CDN for video content
- Microservices architecture

### Vertical Scaling

- Increase server resources
- Optimize database performance
- Use faster storage (SSD)
- Increase network bandwidth

## Support and Maintenance

### Regular Maintenance

- **Daily**: Check system health and logs
- **Weekly**: Review performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Full system backup and disaster recovery testing

### Monitoring Tools

- **Application**: PM2 monitoring
- **System**: htop, iotop, netstat
- **Database**: MongoDB Compass, Redis Commander
- **Video**: FFmpeg logs, HLS analytics

### Contact Information

- **Technical Support**: [support-email]
- **Documentation**: [docs-url]
- **Issue Tracking**: [github-issues-url]

---

## Quick Start Checklist

- [ ] Install Node.js and dependencies
- [ ] Setup MongoDB and Redis
- [ ] Configure environment variables
- [ ] Start video streaming services
- [ ] Add radar devices
- [ ] Configure RTSP cameras
- [ ] Test all functionality
- [ ] Setup monitoring
- [ ] Configure backups
- [ ] Deploy to production

For additional support, refer to the project documentation or contact the development team.
