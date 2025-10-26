#!/bin/bash

# Start RTSP to WebRTC conversion service for video streaming
echo "Starting RTSP to WebRTC conversion service..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Create video storage directory if it doesn't exist
mkdir -p video-storage

# Start the service using docker-compose
docker-compose -f docker-compose.video.yml up -d

# Wait for service to start
echo "Waiting for service to start..."
sleep 5

# Check if service is running
if docker ps | grep -q "radar-video-streaming"; then
    echo "✅ RTSP to WebRTC service is running on port 8083"
    echo "📹 Service URL: http://localhost:8083"
    echo "📁 Video storage: ./video-storage"
else
    echo "❌ Failed to start RTSP to WebRTC service"
    echo "Check logs with: docker-compose -f docker-compose.video.yml logs"
    exit 1
fi

echo "🎥 Video streaming service is ready!"
