# Vehicle Classification API Documentation

## Overview

The Vehicle Classification API provides comprehensive analytics for vehicle classification, counting, and traffic pattern analysis. It processes PassData (0x05) packets to generate real-time and historical insights for traffic engineers.

## Base URL

```
http://localhost:3000/api/classification
```

## Endpoints

### GET /api/classification

Retrieves vehicle classification data with optional filtering and aggregation.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `deviceId` | string | Device identifier for data filtering | `test` |
| `startTime` | string | Start time for historical data (ISO 8601) | - |
| `endTime` | string | End time for historical data (ISO 8601) | - |
| `vehicleTypes` | string | Comma-separated vehicle types to filter | - |
| `lanes` | string | Comma-separated lane numbers to filter | - |
| `aggregationPeriod` | string | Time aggregation period (`1min`, `15min`, `1hour`, `daily`) | `1hour` |

#### Example Request

```bash
curl "http://localhost:3000/api/classification?deviceId=test&vehicleTypes=car,truck&lanes=11,12&startTime=2025-01-01T00:00:00Z&endTime=2025-01-01T23:59:59Z"
```

#### Response

```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalVehicles": 1247,
      "vehicleTypes": [
        {
          "vehicleType": "car",
          "count": 812,
          "percentage": 65.2,
          "averageSpeed": 45.2,
          "speedRange": {
            "min": 20.0,
            "max": 70.0,
            "median": 44.5
          }
        },
        {
          "vehicleType": "truck",
          "count": 435,
          "percentage": 34.8,
          "averageSpeed": 35.8,
          "speedRange": {
            "min": 15.0,
            "max": 55.0,
            "median": 36.2
          }
        }
      ],
      "laneUtilization": [
        {
          "laneNumber": 11,
          "totalVehicles": 312,
          "utilizationRate": 0.785,
          "averageSpeed": 42.1,
          "occupancyRate": 0.65
        },
        {
          "laneNumber": 12,
          "totalVehicles": 298,
          "utilizationRate": 0.721,
          "averageSpeed": 38.9,
          "occupancyRate": 0.58
        }
      ],
      "peakHours": [
        {
          "hour": 17,
          "totalVehicles": 125,
          "averageSpeed": 40.5,
          "trafficDensity": 0.8
        }
      ]
    },
    "summary": {
      "totalVehicles": 1247,
      "uniqueVehicleTypes": 2,
      "averageSpeed": 40.5,
      "speedViolations": 23,
      "laneUtilization": 0.753,
      "peakHour": 17,
      "trafficComposition": [
        {
          "vehicleType": "car",
          "count": 812,
          "percentage": 65.2,
          "averageSpeed": 45.2
        }
      ]
    },
    "filters": {
      "vehicleTypes": ["car", "truck"],
      "lanes": [11, 12],
      "startTime": "2025-01-01T00:00:00Z",
      "endTime": "2025-01-01T23:59:59Z",
      "aggregationPeriod": "1hour"
    },
    "timestamp": "2025-01-01T14:32:00Z"
  }
}
```

### POST /api/classification

Processes real-time vehicle classification data updates.

#### Request Body

```json
{
  "type": "real_time_update",
  "data": {
    "vehicleType": "car",
    "timestamp": "2025-01-01T14:32:00Z",
    "laneNumber": 11,
    "crossSectionPosition": 25.5,
    "crossSectionSpeed": 45.2,
    "headwayTime": 2.1,
    "occupancyDuration": 1.8,
    "occupancyStatus": "entering"
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Real-time data processed successfully",
  "timestamp": "2025-01-01T14:32:00Z"
}
```

## Data Types

### VehicleClassification

```typescript
interface VehicleClassification {
  vehicleType: string;
  count: number;
  averageSpeed: number;
  speedDistribution: SpeedRange[];
  laneDistribution: LaneCount[];
  timeDistribution: TimeSlot[];
}
```

### ClassificationMetrics

```typescript
interface ClassificationMetrics {
  totalVehicles: number;
  vehicleTypes: VehicleTypeCount[];
  averageSpeeds: SpeedByType[];
  laneUtilization: LaneUtilization[];
  peakHours: PeakHourAnalysis[];
}
```

### VehicleTypeCount

```typescript
interface VehicleTypeCount {
  vehicleType: string;
  count: number;
  percentage: number;
  averageSpeed: number;
  speedRange: {
    min: number;
    max: number;
    median: number;
  };
}
```

### LaneUtilization

```typescript
interface LaneUtilization {
  laneNumber: number;
  totalVehicles: number;
  utilizationRate: number;
  averageSpeed: number;
  occupancyRate: number;
}
```

## Error Handling

### 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid request parameters",
  "timestamp": "2025-01-01T14:32:00Z"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to fetch classification data",
  "timestamp": "2025-01-01T14:32:00Z"
}
```

## Rate Limiting

- **GET requests**: 100 requests per minute per IP
- **POST requests**: 50 requests per minute per IP

## Authentication

Currently, no authentication is required. In production, implement appropriate authentication mechanisms.

## WebSocket Updates

Real-time updates are available via WebSocket connection:

```javascript
const ws = new WebSocket('ws://localhost:8081');
ws.send(JSON.stringify({
  type: 'subscribe',
  deviceId: 'test'
}));
```

## Examples

### JavaScript/TypeScript

```typescript
// Fetch classification data
const response = await fetch('/api/classification?deviceId=test');
const data = await response.json();

// Process real-time update
await fetch('/api/classification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'real_time_update',
    data: {
      vehicleType: 'car',
      timestamp: new Date().toISOString(),
      laneNumber: 11,
      crossSectionPosition: 25.5,
      crossSectionSpeed: 45.2,
      headwayTime: 2.1,
      occupancyDuration: 1.8,
      occupancyStatus: 'entering'
    }
  })
});
```

### Python

```python
import requests
import json

# Fetch classification data
response = requests.get('http://localhost:3000/api/classification', 
                       params={'deviceId': 'test'})
data = response.json()

# Process real-time update
update_data = {
    'type': 'real_time_update',
    'data': {
        'vehicleType': 'car',
        'timestamp': '2025-01-01T14:32:00Z',
        'laneNumber': 11,
        'crossSectionPosition': 25.5,
        'crossSectionSpeed': 45.2,
        'headwayTime': 2.1,
        'occupancyDuration': 1.8,
        'occupancyStatus': 'entering'
    }
}

response = requests.post('http://localhost:3000/api/classification',
                        json=update_data)
```
