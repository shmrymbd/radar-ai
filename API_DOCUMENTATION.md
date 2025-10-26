# Radar AI Traffic Dashboard - API Documentation

## Overview

This document provides comprehensive API documentation for the Radar AI Traffic Dashboard, including the new video streaming capabilities. The API is built with Next.js and provides RESTful endpoints for radar data, vehicle classification, and video streaming.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

### API Key Authentication (Implemented)

All API endpoints are protected with API key authentication and rate limiting via middleware (`src/lib/middleware.ts`).

**Setup (Required for Production):**
```bash
# Generate a secure API key
export API_KEY=$(openssl rand -base64 32)

# Add to .env.local
echo "API_KEY=your-generated-key" >> .env.local
```

**Request Headers:**
```bash
# Option 1: x-api-key header
curl -H "x-api-key: your-api-key" http://localhost:3000/api/dashboard

# Option 2: Authorization Bearer token
curl -H "Authorization: Bearer your-api-key" http://localhost:3000/api/classification
```

**Development Mode:**
- If `API_KEY` environment variable is NOT set, all requests are allowed (no authentication required)
- This is for development convenience only
- **CRITICAL:** Always set `API_KEY` in production environments

**Authentication Errors:**
```json
{
  "error": "Unauthorized",
  "message": "Missing API key. Provide x-api-key header or Authorization: Bearer <key>"
}
```

### Rate Limiting

Two rate limiting tiers protect against abuse:

**General API Endpoints (100 requests/minute):**
- Dashboard, Classification, Tracking, Lanes APIs
- Rate limit applied per IP address or API key
- Blocked for 5 minutes if limit exceeded

**Export Endpoints (10 requests/minute):**
- `/api/classification/export` and data export routes
- Stricter limits to prevent resource abuse
- Blocked for 10 minutes if limit exceeded

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 45
Retry-After: 45
```

**Rate Limit Error Response (HTTP 429):**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Blocked until 2025-10-27T10:30:00Z",
  "retryAfter": 300
}
```

### Protected Endpoints

The following endpoints require authentication (as of 2025-10-27):
- ✅ `/api/dashboard`
- ✅ `/api/classification`
- ✅ `/api/classification/summary`
- ✅ `/api/classification/metrics`
- ✅ `/api/classification/export`
- ✅ `/api/tracking`
- ✅ `/api/tracking/vehicles`
- ✅ `/api/lanes`

## Response Format

All API responses follow this format:

```json
{
  "success": boolean,
  "data": object | array,
  "error": string | null,
  "timestamp": string
}
```

## Radar Data API

### Get Dashboard Summary

**Endpoint**: `GET /api/dashboard`

**Description**: Retrieves real-time dashboard summary including vehicle counts, lane status, and traffic metrics.

**Response**:
```json
{
  "success": true,
  "data": {
    "totalVehicles": 45,
    "activeLanes": 4,
    "averageSpeed": 32.5,
    "queueLengths": {
      "lane11": 12.3,
      "lane12": 8.7,
      "lane13": 15.2,
      "lane485": 9.1
    },
    "trafficData": {
      "flowRate": 120,
      "density": 0.8,
      "occupancy": 0.65
    },
    "timestamp": "2025-10-26T08:30:00.000Z"
  }
}
```

### Get Lane Status

**Endpoint**: `GET /api/lanes`

**Description**: Retrieves detailed lane status information.

**Response**:
```json
{
  "success": true,
  "data": {
    "lanes": [
      {
        "id": "lane11",
        "status": "active",
        "queueLength": 12.3,
        "speed": 28.5,
        "occupancy": 0.7,
        "vehicleCount": 8
      }
    ]
  }
}
```

### Get Signal Timing

**Endpoint**: `GET /api/signal-timing`

**Description**: Retrieves current signal timing configuration.

**Response**:
```json
{
  "success": true,
  "data": {
    "currentPhase": "green",
    "phaseDuration": 30,
    "cycleTime": 120,
    "timing": {
      "red": 45,
      "yellow": 5,
      "green": 30
    }
  }
}
```

## Vehicle Classification API

### Get Classification Summary

**Endpoint**: `GET /api/classification/summary`

**Description**: Retrieves vehicle classification summary and statistics.

**Response**:
```json
{
  "success": true,
  "data": {
    "totalVehicles": 150,
    "classifications": {
      "car": 85,
      "van": 25,
      "suv": 30,
      "truck": 10
    },
    "accuracy": 0.94,
    "timeRange": {
      "start": "2025-10-26T08:00:00.000Z",
      "end": "2025-10-26T09:00:00.000Z"
    }
  }
}
```

### Get Classification Metrics

**Endpoint**: `GET /api/classification/metrics`

**Description**: Retrieves detailed classification metrics and performance data.

**Response**:
```json
{
  "success": true,
  "data": {
    "processingTime": 45.2,
    "throughput": 2.5,
    "accuracy": 0.94,
    "confidence": 0.87,
    "metrics": {
      "precision": 0.92,
      "recall": 0.89,
      "f1Score": 0.90
    }
  }
}
```

### Process Real Data

**Endpoint**: `POST /api/classification/process-real-data`

**Description**: Processes real-time radar data for vehicle classification.

**Request Body**:
```json
{
  "radarData": {
    "timestamp": "2025-10-26T08:30:00.000Z",
    "vehicles": [
      {
        "id": "v001",
        "position": { "x": 10.5, "y": 2.3 },
        "speed": 25.0,
        "length": 4.2
      }
    ]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "processedVehicles": 1,
    "classifications": [
      {
        "vehicleId": "v001",
        "classification": "car",
        "confidence": 0.92,
        "timestamp": "2025-10-26T08:30:00.000Z"
      }
    ]
  }
}
```

## Video Streaming API

### Camera Management

#### Get Cameras

**Endpoint**: `GET /api/video/cameras`

**Description**: Retrieves list of configured cameras.

**Response**:
```json
{
  "success": true,
  "cameras": [
    {
      "id": "camera_1761466795351_gtiooghna",
      "name": "Camera 192.168.7.231",
      "rtspUrl": "rtsp://192.168.7.231/live/main_stream",
      "resolution": {
        "width": 1920,
        "height": 1080
      },
      "frameRate": 30,
      "bitrate": 2000000,
      "isActive": false,
      "status": {
        "isConnected": true,
        "lastConnected": "2025-10-26T08:30:00.000Z"
      },
      "createdAt": "2025-10-26T08:19:55.351Z",
      "updatedAt": "2025-10-26T08:19:55.351Z"
    }
  ]
}
```

#### Add Camera

**Endpoint**: `POST /api/video/cameras`

**Description**: Adds a new camera configuration.

**Request Body**:
```json
{
  "name": "Intersection Camera 1",
  "rtspUrl": "rtsp://admin:password@192.168.1.100:554/stream",
  "username": "admin",
  "password": "password",
  "resolution": {
    "width": 1920,
    "height": 1080
  },
  "frameRate": 30,
  "bitrate": 2000000
}
```

**Response**:
```json
{
  "success": true,
  "camera": {
    "id": "camera_1761466795351_gtiooghna",
    "name": "Intersection Camera 1",
    "rtspUrl": "rtsp://admin:password@192.168.1.100:554/stream",
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "frameRate": 30,
    "bitrate": 2000000,
    "isActive": false,
    "createdAt": "2025-10-26T08:30:00.000Z",
    "updatedAt": "2025-10-26T08:30:00.000Z"
  }
}
```

#### Update Camera

**Endpoint**: `PUT /api/video/cameras`

**Description**: Updates an existing camera configuration.

**Request Body**:
```json
{
  "id": "camera_1761466795351_gtiooghna",
  "name": "Updated Camera Name",
  "resolution": {
    "width": 1280,
    "height": 720
  },
  "frameRate": 25
}
```

**Response**:
```json
{
  "success": true,
  "camera": {
    "id": "camera_1761466795351_gtiooghna",
    "name": "Updated Camera Name",
    "rtspUrl": "rtsp://admin:password@192.168.1.100:554/stream",
    "resolution": {
      "width": 1280,
      "height": 720
    },
    "frameRate": 25,
    "bitrate": 2000000,
    "isActive": false,
    "updatedAt": "2025-10-26T08:35:00.000Z"
  }
}
```

#### Test Camera Connection

**Endpoint**: `POST /api/video/cameras/test`

**Description**: Tests camera connectivity and configuration.

**Request Body**:
```json
{
  "rtspUrl": "rtsp://admin:password@192.168.1.100:554/stream",
  "username": "admin",
  "password": "password"
}
```

**Response**:
```json
{
  "success": true,
  "connection": {
    "isConnected": true,
    "responseTime": 150,
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "frameRate": 30
  }
}
```

### Stream Management

#### Get Active Streams

**Endpoint**: `GET /api/video/streams`

**Description**: Retrieves list of active video streams.

**Response**:
```json
{
  "success": true,
  "streams": [
    {
      "cameraId": "camera_1761466795351_gtiooghna",
      "streamId": "stream_camera_1761466795351_gtiooghna_1761466797643",
      "isActive": true,
      "startTime": "2025-10-26T08:19:57.643Z",
      "viewerCount": 2,
      "hlsUrl": "/api/video/hls/stream_camera_1761466795351_gtiooghna_1761466797643/playlist.m3u8",
      "isLive": true
    }
  ]
}
```

#### Start Stream

**Endpoint**: `POST /api/video/streams`

**Description**: Starts a video stream for a camera.

**Request Body**:
```json
{
  "cameraId": "camera_1761466795351_gtiooghna",
  "rtspUrl": "rtsp://192.168.7.231/live/main_stream"
}
```

**Response**:
```json
{
  "success": true,
  "stream": {
    "cameraId": "camera_1761466795351_gtiooghna",
    "streamId": "stream_camera_1761466795351_gtiooghna_1761466797643",
    "isActive": true,
    "startTime": "2025-10-26T08:19:57.643Z",
    "viewerCount": 0
  },
  "hlsUrl": "/api/video/hls/stream_camera_1761466795351_gtiooghna_1761466797643/playlist.m3u8",
  "message": "Stream started (placeholder HLS created)"
}
```

#### Stop Stream

**Endpoint**: `DELETE /api/video/streams`

**Description**: Stops a video stream.

**Query Parameters**:
- `cameraId` (required): Camera ID to stop stream for

**Response**:
```json
{
  "success": true,
  "message": "Stream stopped successfully"
}
```

### HLS Streaming

#### Get HLS Playlist

**Endpoint**: `GET /api/video/hls/{streamId}/playlist.m3u8`

**Description**: Serves HLS playlist for video streaming.

**Response**: HLS playlist content
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:1
#EXT-X-MEDIA-SEQUENCE:132
#EXTINF:0.600000,
segment_132.ts
#EXTINF:0.600000,
segment_133.ts
```

#### Get HLS Segment

**Endpoint**: `GET /api/video/hls/{streamId}/segment_{number}.ts`

**Description**: Serves HLS video segments.

**Response**: Video segment data (binary)

### Video Recording

#### Get Recordings

**Endpoint**: `GET /api/video/recordings`

**Description**: Retrieves list of video recordings.

**Response**:
```json
{
  "success": true,
  "recordings": [
    {
      "id": "rec_1761466795351",
      "cameraId": "camera_1761466795351_gtiooghna",
      "startTime": "2025-10-26T08:00:00.000Z",
      "endTime": "2025-10-26T08:30:00.000Z",
      "duration": 1800,
      "fileSize": 52428800,
      "filePath": "/recordings/rec_1761466795351.mp4"
    }
  ]
}
```

#### Start Recording

**Endpoint**: `POST /api/video/recordings`

**Description**: Starts video recording for a camera.

**Request Body**:
```json
{
  "cameraId": "camera_1761466795351_gtiooghna",
  "duration": 1800
}
```

**Response**:
```json
{
  "success": true,
  "recording": {
    "id": "rec_1761466795351",
    "cameraId": "camera_1761466795351_gtiooghna",
    "startTime": "2025-10-26T08:30:00.000Z",
    "duration": 1800,
    "status": "recording"
  }
}
```

#### Stop Recording

**Endpoint**: `PUT /api/video/recordings/{recordingId}/stop`

**Description**: Stops video recording.

**Response**:
```json
{
  "success": true,
  "recording": {
    "id": "rec_1761466795351",
    "cameraId": "camera_1761466795351_gtiooghna",
    "startTime": "2025-10-26T08:30:00.000Z",
    "endTime": "2025-10-26T08:45:00.000Z",
    "duration": 900,
    "status": "completed"
  }
}
```

#### Download Recording

**Endpoint**: `GET /api/video/recordings/{recordingId}/download`

**Description**: Downloads a video recording file.

**Response**: Video file download

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2025-10-26T08:30:00.000Z"
}
```

### Common Error Codes

- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error
- `CAMERA_NOT_FOUND` - Camera with specified ID not found
- `STREAM_NOT_FOUND` - Stream with specified ID not found
- `RTSP_CONNECTION_FAILED` - Failed to connect to RTSP camera
- `HLS_GENERATION_FAILED` - Failed to generate HLS stream

### Example Error Responses

```json
{
  "success": false,
  "error": "Camera not found",
  "code": "CAMERA_NOT_FOUND",
  "timestamp": "2025-10-26T08:30:00.000Z"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. In production, implement appropriate rate limiting:

- 100 requests per minute per IP
- 1000 requests per hour per IP

## CORS Configuration

The API includes CORS headers for cross-origin requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## WebSocket Endpoints

### Real-time Data Updates

**Endpoint**: `ws://localhost:3000/ws/radar`

**Description**: WebSocket connection for real-time radar data updates.

**Message Format**:
```json
{
  "type": "radar_update",
  "data": {
    "vehicles": [...],
    "lanes": [...],
    "timestamp": "2025-10-26T08:30:00.000Z"
  }
}
```

### Video Stream Updates

**Endpoint**: `ws://localhost:3000/ws/video`

**Description**: WebSocket connection for video stream status updates.

**Message Format**:
```json
{
  "type": "stream_update",
  "data": {
    "cameraId": "camera_1761466795351_gtiooghna",
    "status": "live",
    "viewerCount": 2
  }
}
```

## SDK and Client Libraries

### JavaScript/TypeScript

```typescript
// Camera management
const cameras = await fetch('/api/video/cameras').then(r => r.json());

// Start stream
const stream = await fetch('/api/video/streams', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cameraId: 'camera_123',
    rtspUrl: 'rtsp://camera-url'
  })
}).then(r => r.json());

// HLS video player
import Hls from 'hls.js';

const video = document.getElementById('video');
const hls = new Hls();
hls.loadSource('/api/video/hls/stream-id/playlist.m3u8');
hls.attachMedia(video);
```

### Python

```python
import requests

# Get cameras
response = requests.get('http://localhost:3000/api/video/cameras')
cameras = response.json()

# Start stream
stream_data = {
    'cameraId': 'camera_123',
    'rtspUrl': 'rtsp://camera-url'
}
response = requests.post('http://localhost:3000/api/video/streams', json=stream_data)
stream = response.json()
```

## Testing

### API Testing with curl

```bash
# Get cameras
curl http://localhost:3000/api/video/cameras

# Add camera
curl -X POST http://localhost:3000/api/video/cameras \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Camera","rtspUrl":"rtsp://test"}'

# Start stream
curl -X POST http://localhost:3000/api/video/streams \
  -H "Content-Type: application/json" \
  -d '{"cameraId":"camera_123","rtspUrl":"rtsp://test"}'

# Test HLS playlist
curl http://localhost:3000/api/video/hls/stream-id/playlist.m3u8
```

### Postman Collection

A Postman collection is available for testing all API endpoints. Import the collection and configure the base URL for your environment.

## Changelog

### Version 1.0.0 (2025-10-26)

- Initial API release
- Radar data endpoints
- Vehicle classification endpoints
- Video streaming endpoints
- Camera management
- HLS streaming support
- Video recording functionality

---

For additional support or questions about the API, please refer to the main documentation or contact the development team.
