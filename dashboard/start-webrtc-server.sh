#!/bin/bash

# Start WebRTC Server for Ultra-Low Latency Video Streaming
# Uses MediaMTX for RTSP to WebRTC conversion via Docker Compose

set -e  # Exit on error

echo "🚀 Starting MediaMTX WebRTC Server..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

# Check if docker compose is available (try new command first, then legacy)
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "❌ Error: Docker Compose not found"
    echo "Please install Docker Compose and try again"
    exit 1
fi

echo "Using: $DOCKER_COMPOSE"
echo ""

# Check if mediamtx container already exists and is running
if [ "$(docker ps -q -f name=radar-mediamtx)" ]; then
    echo "✅ MediaMTX container is already running"
    echo ""
    docker ps -f name=radar-mediamtx --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "Ports:"
    echo "  - RTSP: 8554 (RTSP camera input)"
    echo "  - WebRTC: 8889 (Browser WebRTC connections)"
    echo "  - API: 9997 (Management API)"
    echo "  - Metrics: 9998 (Prometheus metrics)"
    echo ""
    echo "Commands:"
    echo "  - View logs: docker logs -f radar-mediamtx"
    echo "  - Check health: curl http://localhost:9997/v3/config/global/get"
    echo "  - Stop: $DOCKER_COMPOSE -f docker-compose.webrtc.yml down"
    echo "  - Restart: $DOCKER_COMPOSE -f docker-compose.webrtc.yml restart"
    echo ""
    exit 0
fi

# Start MediaMTX using docker compose
echo "📦 Starting MediaMTX container with Docker Compose..."
$DOCKER_COMPOSE -f docker-compose.webrtc.yml up -d

# Wait for container to be healthy
echo "⏳ Waiting for MediaMTX to be healthy..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if [ "$(docker ps -q -f name=radar-mediamtx -f health=healthy)" ]; then
        echo "✅ MediaMTX is healthy!"
        break
    fi

    ATTEMPT=$((ATTEMPT + 1))
    echo -n "."
    sleep 1
done

echo ""

# Check if container is running
if [ "$(docker ps -q -f name=radar-mediamtx)" ]; then
    echo ""
    echo "✅ MediaMTX WebRTC Server started successfully!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 Container Status:"
    docker ps -f name=radar-mediamtx --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "📡 WebRTC Server Endpoints:"
    echo "  - RTSP Input:     rtsp://localhost:8554/<stream-name>"
    echo "  - WebRTC Browser: http://localhost:8889/<stream-name>/whep"
    echo "  - Management API: http://localhost:9997"
    echo "  - Health Check:   http://localhost:9997/v3/config/global/get"
    echo "  - Metrics:        http://localhost:9998/metrics"
    echo ""
    echo "🎥 Camera Configuration:"
    echo "  Cameras are automatically registered when you start streaming"
    echo "  Stream path format: camera_<cameraId>"
    echo "  Example: camera_192.168.7.238 → http://localhost:8889/camera_192.168.7.238/whep"
    echo ""
    echo "📊 Monitoring & Management:"
    echo "  - View logs:     docker logs -f radar-mediamtx"
    echo "  - Check health:  curl http://localhost:9997/v3/config/global/get"
    echo "  - View metrics:  curl http://localhost:9998/metrics"
    echo "  - List paths:    curl http://localhost:9997/v3/paths/list"
    echo ""
    echo "🛑 Management Commands:"
    echo "  - Stop:    $DOCKER_COMPOSE -f docker-compose.webrtc.yml down"
    echo "  - Restart: $DOCKER_COMPOSE -f docker-compose.webrtc.yml restart"
    echo "  - Logs:    $DOCKER_COMPOSE -f docker-compose.webrtc.yml logs -f"
    echo "  - Status:  $DOCKER_COMPOSE -f docker-compose.webrtc.yml ps"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎯 Next Steps:"
    echo "  1. Start dashboard: cd dashboard && npm run dev:full"
    echo "  2. Open browser: http://localhost:3000/video-streaming"
    echo "  3. Start camera stream - will automatically use WebRTC!"
    echo ""
    echo "⚡ Expected Latency: 300-500ms (VLC-like real-time)"
    echo ""
else
    echo ""
    echo "❌ Error: MediaMTX container failed to start"
    echo ""
    echo "📋 Troubleshooting Steps:"
    echo ""
    echo "1. Check Docker logs:"
    echo "   docker logs radar-mediamtx"
    echo ""
    echo "2. Check if ports are already in use:"
    echo "   netstat -tuln | grep -E '(8554|8889|9997|9998)'"
    echo "   # Or on macOS:"
    echo "   lsof -i :8554,8889,9997,9998"
    echo ""
    echo "3. Check Docker Compose configuration:"
    echo "   $DOCKER_COMPOSE -f docker-compose.webrtc.yml config"
    echo ""
    echo "4. Try manual cleanup and restart:"
    echo "   $DOCKER_COMPOSE -f docker-compose.webrtc.yml down"
    echo "   docker system prune -f"
    echo "   $DOCKER_COMPOSE -f docker-compose.webrtc.yml up -d"
    echo ""
    exit 1
fi
