#!/bin/bash

# Test script for video streaming service
echo "🎥 Testing Video Streaming Service..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if RTSPtoWebRTC service is running
echo "📡 Checking RTSPtoWebRTC service status..."
if docker ps | grep -q "radar-video-streaming"; then
    echo "✅ RTSPtoWebRTC service is running"
else
    echo "⚠️  RTSPtoWebRTC service is not running. Starting it now..."
    ./start-video-streaming.sh
    if [ $? -ne 0 ]; then
        echo "❌ Failed to start video streaming service"
        exit 1
    fi
fi

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
sleep 3

# Test service health
echo "🏥 Testing service health..."
HEALTH_URL="http://localhost:8083/api/health"
if curl -s -f "$HEALTH_URL" > /dev/null; then
    echo "✅ Service health check passed"
else
    echo "❌ Service health check failed"
    echo "   URL: $HEALTH_URL"
    echo "   Make sure the service is running on port 8083"
fi

# Test service endpoints
echo "🔍 Testing service endpoints..."

# Test stream list endpoint
echo "📋 Testing stream list endpoint..."
STREAMS_URL="http://localhost:8083/api/streams"
if curl -s -f "$STREAMS_URL" > /dev/null; then
    echo "✅ Stream list endpoint accessible"
else
    echo "❌ Stream list endpoint not accessible"
fi

# Test with sample RTSP URL (this will fail but should not crash the service)
echo "🧪 Testing with sample RTSP URL..."
TEST_URL="http://localhost:8083/api/stream/test"
TEST_PAYLOAD='{"url":"rtsp://test.example.com:554/stream","options":{"video":true,"audio":false}}'

if curl -s -X POST -H "Content-Type: application/json" -d "$TEST_PAYLOAD" "$TEST_URL" > /dev/null; then
    echo "✅ Test endpoint accessible (expected to fail with test URL)"
else
    echo "⚠️  Test endpoint not accessible or failed (this is expected with test URL)"
fi

# Display service information
echo ""
echo "📊 Service Information:"
echo "   Service URL: http://localhost:8083"
echo "   Health Check: http://localhost:8083/api/health"
echo "   Stream List: http://localhost:8083/api/streams"
echo "   Web Interface: http://localhost:8083 (if available)"

# Check video storage directory
echo ""
echo "📁 Video Storage:"
if [ -d "video-storage" ]; then
    echo "✅ Video storage directory exists: ./video-storage"
    ls -la video-storage/ | head -5
else
    echo "❌ Video storage directory not found"
fi

echo ""
echo "🎯 Next Steps:"
echo "   1. Configure real RTSP cameras in the dashboard"
echo "   2. Test camera connections using the Camera Settings tab"
echo "   3. Start video streams using the Live Streams tab"
echo "   4. Monitor video recordings in the Recordings tab"

echo ""
echo "🎥 Video streaming service test completed!"
