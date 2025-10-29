# Radar AI Traffic Dashboard - API Documentation

## Overview

This document provides comprehensive API documentation for the Radar AI Traffic Dashboard. The API is built with Next.js 15 and provides RESTful endpoints for radar data, vehicle tracking, classification, analytics, video streaming, and lane configuration.

**Latest Update**: 2025-10-29
**API Version**: 2.0.0

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Table of Contents

- [Authentication](#authentication)
- [Multi-Device Support](#multi-device-support)
- [Response Format](#response-format)
- [Vehicle Type Classification](#vehicle-type-classification)
- [Radar Data API](#radar-data-api)
- [Vehicle Tracking API](#vehicle-tracking-api)
- [Lane Configuration API](#lane-configuration-api)
- [Classification API](#classification-api)
- [Analytics API](#analytics-api)
- [Video Streaming API](#video-streaming-api)
- [WebSocket API](#websocket-api)
- [Error Handling](#error-handling)

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

All API endpoints require authentication when `API_KEY` is set (production mode):
- ✅ `/api/dashboard`
- ✅ `/api/classification/*`
- ✅ `/api/tracking/*`
- ✅ `/api/lanes`
- ✅ `/api/lane-config`
- ✅ `/api/analytics/*`
- ✅ `/api/video/*`
- ✅ `/api/simple-redis`
- ✅ `/api/real-passdata`

## Multi-Device Support

All API endpoints support multi-device operation via the `device` or `deviceId` query parameter.

**Valid Device IDs:**
- `P1-center` - Primary device (most commonly used)
- `P3` - Secondary device
- `P1-o/h` - Overhead position

**Example:**
```bash
# Get data for specific device
curl "http://localhost:3000/api/tracking?device=P1-center"
curl "http://localhost:3000/api/classification?deviceId=P3"
```

**Important Notes:**
- All data is isolated by device ID
- Redis keys use format: `{deviceId}/passdata` (lowercase, case-sensitive)
- MongoDB queries filter by `deviceId` field
- Default device is `P1-center` when not specified

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

## Vehicle Type Classification

### Official Vehicle Type Mapping

The system uses the official ClairWav Communication Protocol V2.1 vehicle type mapping:

| Code | Vehicle Type | Description |
|------|--------------|-------------|
| 0 | other | Unclassified or other vehicle types |
| 1 | bicycle | Standard bicycle |
| 2 | motorcycle | Motorized two-wheel vehicle |
| 3 | tricycle | Three-wheel vehicle |
| 4 | bus | Public bus |
| 5 | van | Van/minivan |
| 6 | car | Standard passenger car |
| 7 | suv | Sport Utility Vehicle |
| 8 | large_truck | Large commercial truck |
| 9 | medium_truck | Medium commercial truck |
| 10 | light_truck | Light commercial truck |
| 11 | dangerous_goods | Dangerous goods transport vehicle |
| 12 | engineering_vehicle | Engineering/construction vehicle |
| 13 | pedestrian | Pedestrian detected |
| 14 | medium_bus | Medium-sized bus |

### Classification Accuracy

- **Fixed Issue**: Resolved 99.7% car classification problem
- **Root Cause**: Incorrect vehicle type mapping in radar processor
- **Solution**: Updated all services to use official VEHICLE_TYPE_MAP
- **Result**: Accurate vehicle type distribution reflecting real traffic composition

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

**Query Parameters**:
- `device` (string, optional): Device ID (default: 'P1-center')

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

### Simple Redis Test

**Endpoint**: `GET /api/simple-redis`

**Description**: Tests Redis connectivity and retrieves basic statistics.

**Query Parameters**:
- `device` (string, optional): Device ID (default: 'P1-center')

**Response**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "keyCount": 150,
    "deviceId": "P1-center",
    "sampleKeys": ["P1-center/passdata", "P1-center/objectdata"]
  }
}
```

## Vehicle Tracking API

### Get Tracked Vehicles

**Endpoint**: `GET /api/tracking`

**Description**: Retrieves real-time vehicle tracking data with coordinates and movement paths.

**Query Parameters**:
- `device` (string, optional): Device ID (default: 'P1-center')

**Response**:
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "12345",
        "laneNo": 11,
        "targetType": 6,
        "vehicleType": "car",
        "position": {
          "x": 10.5,
          "y": 2.3,
          "z": 0
        },
        "velocity": {
          "x": 15.2,
          "y": 0.1,
          "z": 0
        },
        "speed": 45.5,
        "acceleration": 0.2,
        "heading": 90.5,
        "length": 4.2,
        "width": 1.8,
        "rcs": -15.5,
        "snr": 20.3,
        "confidence": 0.95,
        "color": "#FF5733",
        "plateNumber": "ABC123",
        "timestamp": "2025-10-29T10:30:00.000Z"
      }
    ],
    "count": 45,
    "device": "P1-center",
    "timestamp": "2025-10-29T10:30:00.000Z"
  }
}
```

### Get Vehicle List

**Endpoint**: `GET /api/tracking/vehicles`

**Description**: Retrieves list of tracked vehicles with dynamic movement simulation for testing.

**Query Parameters**:
- `device` (string, optional): Device ID (default: 'P1-center')

**Response**: Same format as `/api/tracking`

**Note**: For test devices with no Redis data, this endpoint generates simulated vehicle data for development purposes.

### Get Vehicle Details

**Endpoint**: `GET /api/tracking/vehicles/[targetId]`

**Description**: Retrieves detailed information for a specific tracked vehicle.

**Path Parameters**:
- `targetId` (string, required): Vehicle target ID

**Query Parameters**:
- `device` (string, optional): Device ID (default: 'P1-center')

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "12345",
    "laneNo": 11,
    "targetType": 6,
    "vehicleType": "car",
    "position": {
      "x": 10.5,
      "y": 2.3,
      "z": 0
    },
    "trackHistory": [
      {
        "x": 10.3,
        "y": 2.3,
        "timestamp": "2025-10-29T10:29:55.000Z"
      },
      {
        "x": 10.5,
        "y": 2.3,
        "timestamp": "2025-10-29T10:30:00.000Z"
      }
    ],
    "speed": 45.5,
    "heading": 90.5,
    "timestamp": "2025-10-29T10:30:00.000Z"
  }
}
```

## Lane Configuration API

### Get Lane Configuration

**Endpoint**: `GET /api/lane-config`

**Description**: Retrieves lane configuration for a device including lane names, thresholds, alerts, and display options.

**Query Parameters**:
- `device` (string, required): Device ID

**Response**:
```json
{
  "success": true,
  "data": {
    "deviceId": "P1-center",
    "lanes": [
      {
        "laneNumber": 11,
        "customName": "North Bound Lane 1",
        "enabled": true,
        "direction": "incoming",
        "thresholds": {
          "queueLength": 50,
          "speed": 60,
          "occupancy": 0.8,
          "flow": 1200
        },
        "alerts": {
          "queueAlert": true,
          "speedAlert": true,
          "occupancyAlert": false
        },
        "displayOptions": {
          "showInDashboard": true,
          "color": "#3B82F6",
          "sortOrder": 1
        }
      }
    ],
    "updatedAt": "2025-10-29T10:30:00.000Z"
  },
  "timestamp": "2025-10-29T10:30:00.000Z"
}
```

### Save Lane Configuration

**Endpoint**: `POST /api/lane-config`

**Description**: Creates or updates lane configuration for a device.

**Request Body**:
```json
{
  "deviceId": "P1-center",
  "lanes": [
    {
      "laneNumber": 11,
      "customName": "North Bound Lane 1",
      "enabled": true,
      "direction": "incoming",
      "thresholds": {
        "queueLength": 50,
        "speed": 60,
        "occupancy": 0.8,
        "flow": 1200
      },
      "alerts": {
        "queueAlert": true,
        "speedAlert": true,
        "occupancyAlert": false
      },
      "displayOptions": {
        "showInDashboard": true,
        "color": "#3B82F6",
        "sortOrder": 1
      }
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Lane configuration saved successfully",
  "data": {
    "deviceId": "P1-center",
    "laneCount": 4,
    "updatedAt": "2025-10-29T10:30:00.000Z"
  },
  "timestamp": "2025-10-29T10:30:00.000Z"
}
```

**Lane Direction Values**:
- `incoming` - Traffic entering the intersection (⬇️)
- `outgoing` - Traffic leaving the intersection (⬆️)

## Vehicle Classification API

**Architecture Note**: As of 2025-10-27, the classification system uses a **MongoDB-first architecture** with NO in-memory caching or polling:
- MongoDB is the single source of truth
- Direct MongoDB queries with aggregation pipelines
- Real-time data via Redis Pub/Sub → PassDataSubscriber → MongoDB
- NO Redis polling or in-memory caching

### Get Classification Data

**Endpoint**: `GET /api/classification`

**Description**: Retrieves vehicle classification data from MongoDB with aggregation and filtering.

**Query Parameters**:
- `deviceId` (string, optional): Device ID (default: 'P1-center')
- `timeRange` (string, optional): Time range ('1h', '24h', '7d', default: '24h')

**Response**:
```json
{
  "success": true,
  "data": {
    "totalVehicles": 1234,
    "deviceId": "P1-center",
    "timeRange": "24h",
    "vehicleTypes": {
      "car": 850,
      "suv": 234,
      "truck": 150
    },
    "lanes": {
      "11": 400,
      "12": 350,
      "13": 300,
      "485": 184
    },
    "averageSpeed": 45.6,
    "speedDistribution": {
      "overspeeding": 234,
      "normal": 1000
    }
  },
  "timestamp": "2025-10-29T10:30:00.000Z"
}
```

### Get Classification Summary

**Endpoint**: `GET /api/classification/summary`

**Description**: Retrieves vehicle classification summary and statistics from MongoDB.

**Query Parameters**:
- `deviceId` (string, optional): Device ID (default: 'P1-center')

**Response**:
```json
{
  "success": true,
  "data": {
    "totalVehicles": 150,
    "classifications": {
      "car": 45,
      "van": 25,
      "suv": 30,
      "truck": 20,
      "motorcycle": 15,
      "bicycle": 10,
      "bus": 5
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

## Analytics API

### Get Analytics Data

**Endpoint**: `GET /api/analytics`

**Description**: Retrieves comprehensive traffic analytics data including vehicle classification, speed distribution, Level of Service (LOS), and traffic count trends.

**Query Parameters**:
- `deviceId` (string, optional): Device ID filter (default: 'test')
- `timeRange` (string, optional): Time range for data ('1h', '24h', '7d', default: '24h')

**Request Example**:
```bash
curl -H "x-api-key: your-api-key" \
  "http://localhost:3000/api/analytics?deviceId=Radar04&timeRange=24h"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalVehicles": 1234,
      "timeRange": "24h",
      "deviceId": "Radar04",
      "averageSpeed": 45.6
    },
    "vehicleClassification": [
      {
        "time": "2025-10-27T10:00:00Z",
        "class1": 45,
        "class2": 23,
        "class3": 12,
        "class4": 8,
        "class5": 3,
        "class6": 1
      }
    ],
    "trafficCount": [
      {
        "time": "2025-10-27T10:00:00Z",
        "count": 92,
        "class1": 45,
        "class2": 23,
        "class3": 12,
        "class4": 8,
        "class5": 3,
        "class6": 1
      }
    ],
    "speedPercentage": [
      {
        "name": "Overspeeding",
        "value": 234,
        "percentage": 19.0,
        "color": "#FF6B35"
      },
      {
        "name": "Normal Speed",
        "value": 1000,
        "percentage": 81.0,
        "color": "#FFD23F"
      }
    ],
    "speedCount": [
      {
        "time": "2025-10-27T10:00:00Z",
        "averageSpeed": 45.6,
        "count": 92
      }
    ],
    "levelOfService": [
      {
        "time": "2025-10-27T10:00:00Z",
        "losGrade": "B",
        "density": 12.5,
        "averageSpeed": 45.6
      }
    ],
    "vehicleCountByType": [
      {
        "name": "Passenger Car",
        "value": 850,
        "percentage": 68.9
      },
      {
        "name": "SUV",
        "value": 234,
        "percentage": 19.0
      },
      {
        "name": "Truck",
        "value": 150,
        "percentage": 12.1
      }
    ]
  },
  "timestamp": "2025-10-27T12:34:56Z"
}
```

### Export Analytics Data

**Endpoint**: `GET /api/analytics/export`

**Description**: Exports analytics data in various formats (CSV, JSON, Excel, PDF). Excel format includes multiple sheets for different data categories.

**Query Parameters**:
- `deviceId` (string, optional): Device ID filter (default: 'test')
- `format` (string, optional): Export format - 'csv', 'json', 'excel', 'pdf' (default: 'json')
- `includeKPIs` (boolean, optional): Include advanced KPIs in export (default: false)
- `includeAnomalies` (boolean, optional): Include anomaly detection results (default: false)
- `includePatterns` (boolean, optional): Include traffic pattern analysis (default: false)

**Request Examples**:
```bash
# Export as Excel with all data
curl -H "x-api-key: your-api-key" \
  "http://localhost:3000/api/analytics/export?deviceId=Radar04&format=excel&includeKPIs=true&includeAnomalies=true" \
  -o analytics-export.xlsx

# Export as CSV
curl -H "x-api-key: your-api-key" \
  "http://localhost:3000/api/analytics/export?deviceId=Radar04&format=csv" \
  -o analytics-export.csv

# Export as JSON with patterns
curl -H "x-api-key: your-api-key" \
  "http://localhost:3000/api/analytics/export?deviceId=Radar04&format=json&includePatterns=true"
```

**Excel Export Sheets**:
1. **Summary** - Device info, total vehicles, average speed, most common vehicle type
2. **Vehicle Types** - Distribution by vehicle classification with counts and percentages
3. **Speed Analysis** - Overspeeding, normal speed, and under-speed statistics
4. **Advanced KPIs** (if included) - Intersection efficiency, lane utilization, speed compliance
5. **Anomalies** (if included) - Detected traffic anomalies with severity and recommendations

**Response (JSON format)**:
```json
{
  "success": true,
  "data": {
    "deviceId": "Radar04",
    "timestamp": "2025-10-27T12:34:56Z",
    "summary": {
      "totalVehicles": 1234,
      "averageSpeed": 45.6,
      "mostCommonVehicleType": "Passenger Car",
      "vehicleTypeCounts": {
        "Passenger Car": 850,
        "SUV": 234,
        "Truck": 150
      }
    },
    "metrics": {
      "overspeedingCount": 234,
      "overspeedingPercentage": "19.0",
      "normalSpeedCount": 1000,
      "normalSpeedPercentage": "81.0"
    }
  },
  "format": "json",
  "timestamp": "2025-10-27T12:34:56Z"
}
```

**Response (CSV/Excel/PDF formats)**:
- File download with appropriate Content-Type and Content-Disposition headers
- Filename format: `traffic-analytics-{deviceId}-{timestamp}.{ext}`

**Error Response**:
```json
{
  "success": false,
  "error": "Failed to export analytics data",
  "message": "Error details",
  "timestamp": "2025-10-27T12:34:56Z"
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

## WebSocket API

### WebSocket Server

**Endpoint**: `ws://localhost:8080` (Unified WebSocket Server)

**Description**: Centralized WebSocket server for all real-time updates running on port 8080.

**Starting the Server**:
```bash
npm run websocket    # Start WebSocket server only
npm run dev:full     # Start Next.js + WebSocket together
```

### Message Channels

The WebSocket server supports multiple channels for different data types:

#### Dashboard Updates (`dashboard` channel)

**Subscribe Message**:
```json
{
  "type": "subscribe",
  "channel": "dashboard",
  "deviceId": "P1-center"
}
```

**Update Message**:
```json
{
  "type": "dashboard_update",
  "channel": "dashboard",
  "deviceId": "P1-center",
  "data": {
    "vehicleCount": 45,
    "lanes": [
      {
        "laneNumber": 11,
        "queueLength": 12.3,
        "speed": 45.5,
        "occupancy": 0.7
      }
    ],
    "timestamp": "2025-10-29T10:30:00.000Z"
  }
}
```

#### Vehicle Tracking Updates (`tracking` channel)

**Subscribe Message**:
```json
{
  "type": "subscribe",
  "channel": "tracking",
  "deviceId": "P1-center"
}
```

**Update Message**:
```json
{
  "type": "tracking_update",
  "channel": "tracking",
  "deviceId": "P1-center",
  "data": {
    "vehicles": [
      {
        "id": "12345",
        "position": { "x": 10.5, "y": 2.3 },
        "speed": 45.5,
        "vehicleType": "car"
      }
    ],
    "timestamp": "2025-10-29T10:30:00.000Z"
  }
}
```

#### Classification Updates (`classification` channel)

**Subscribe Message**:
```json
{
  "type": "subscribe",
  "channel": "classification",
  "deviceId": "P1-center"
}
```

**Update Message**:
```json
{
  "type": "classification_update",
  "channel": "classification",
  "deviceId": "P1-center",
  "data": {
    "vehicleType": "car",
    "laneNumber": 11,
    "speed": 45.5,
    "timestamp": "2025-10-29T10:30:00.000Z"
  }
}
```

#### Video Stream Updates (`video` channel)

**Subscribe Message**:
```json
{
  "type": "subscribe",
  "channel": "video",
  "cameraId": "camera_123"
}
```

**Update Message**:
```json
{
  "type": "video_update",
  "channel": "video",
  "data": {
    "cameraId": "camera_123",
    "status": "live",
    "viewerCount": 2,
    "streamHealth": "good"
  }
}
```

### Connection Management

**Client Example (JavaScript)**:
```javascript
// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:8080');

// Handle connection open
ws.onopen = () => {
  console.log('Connected to WebSocket server');

  // Subscribe to dashboard updates for device P1-center
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'dashboard',
    deviceId: 'P1-center'
  }));
};

// Handle incoming messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);

  if (message.type === 'dashboard_update') {
    // Update UI with new data
    updateDashboard(message.data);
  }
};

// Handle connection close
ws.onclose = () => {
  console.log('Disconnected from WebSocket server');
  // Implement reconnection logic
};

// Handle errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

**Unsubscribe Message**:
```json
{
  "type": "unsubscribe",
  "channel": "dashboard",
  "deviceId": "P1-center"
}
```

### Heartbeat / Keep-Alive

The server sends periodic ping messages to keep connections alive:

**Ping Message**:
```json
{
  "type": "ping",
  "timestamp": "2025-10-29T10:30:00.000Z"
}
```

**Client Response**:
```json
{
  "type": "pong",
  "timestamp": "2025-10-29T10:30:00.000Z"
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

### Version 2.0.0 (2025-10-29)

- **Breaking Changes**:
  - MongoDB-first architecture (NO in-memory caching)
  - Unified WebSocket server on port 8080
  - All endpoints require `device` or `deviceId` parameter

- **New Features**:
  - Lane Configuration API (`/api/lane-config`)
  - Lane direction tagging (incoming/outgoing)
  - Enhanced Vehicle Tracking API with real-time coordinates
  - Multi-device support across all endpoints
  - WebSocket channel-based subscriptions
  - Analytics export in multiple formats (CSV, JSON, Excel, PDF)
  - Advanced KPIs and anomaly detection
  - Traffic pattern analysis

- **Improvements**:
  - Direct MongoDB queries with aggregation pipelines
  - Real-time Redis Pub/Sub → MongoDB integration
  - Improved classification accuracy with official vehicle type mapping
  - Enhanced authentication and rate limiting
  - Better error handling and validation
  - Comprehensive API documentation update

### Version 1.0.0 (2025-10-26)

- Initial API release
- Radar data endpoints
- Vehicle classification endpoints
- Video streaming endpoints
- Camera management
- HLS streaming support
- Video recording functionality

---

## Additional Resources

- **Setup Guide**: See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for environment configuration
- **Quick Reference**: See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for common commands
- **Development Guidelines**: See [CLAUDE.md](./CLAUDE.md) for development best practices
- **Deployment Guide**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production deployment

## Support

For additional support or questions about the API:
- Check the troubleshooting section in [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
- Review [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for common issues
- Contact the development team
- Open an issue on GitHub

---

**Last Updated**: 2025-10-29
**API Version**: 2.0.0
**Documentation Version**: 2.0.0
