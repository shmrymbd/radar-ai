# Historical Classification API Documentation

This document describes the API endpoints for historical vehicle classification data retrieval, export, and management.

## Base URL

```
http://localhost:3000/api/classification
```

---

## Endpoints

### 1. Get Historical Classification Data

Retrieve paginated historical classification data with time-based filtering.

**Endpoint**: `GET /api/classification/historical`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `deviceId` | string | `'test'` | Device identifier ('test', 'Radar04', etc.) |
| `timePeriod` | string | `'24hrs'` | Time period filter: '24hrs', 'yesterday', 'month' |
| `page` | number | `1` | Page number (must be >= 1) |
| `limit` | number | `100` | Records per page (1-1000) |
| `sortBy` | string | `'timestamp'` | Sort field: 'timestamp' or 'totalVehicles' |
| `sortOrder` | string | `'asc'` | Sort direction: 'asc' or 'desc' |

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "timeSlot": "2025-01-26-10-00",
      "vehicleTypes": {
        "car": 45,
        "suv": 12,
        "truck": 8,
        "motorcycle": 5,
        "van": 3
      },
      "totalVehicles": 73,
      "averageSpeed": 52.3,
      "speedViolations": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 250,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "deviceId": "test",
  "timePeriod": "24hrs",
  "cached": false,
  "timestamp": "2025-01-26T10:15:00.000Z"
}
```

**Response Headers**:
- `X-Cache`: `HIT` or `MISS` - Cache status
- `X-RateLimit-Limit`: `100` - Rate limit
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Time until rate limit resets (ms)
- `X-Response-Time`: Response time in milliseconds

**Rate Limiting**: 100 requests per minute per client

**Examples**:

```bash
# Get last 24 hours for Radar04
curl 'http://localhost:3000/api/classification/historical?deviceId=Radar04&timePeriod=24hrs'

# Get yesterday's data, sorted by vehicle count (descending)
curl 'http://localhost:3000/api/classification/historical?timePeriod=yesterday&sortBy=totalVehicles&sortOrder=desc'

# Get month data with pagination (page 2, 50 records per page)
curl 'http://localhost:3000/api/classification/historical?timePeriod=month&page=2&limit=50'
```

---

### 2. Get Aggregated Historical Data

Retrieve aggregated summary statistics for a time period.

**Endpoint**: `GET /api/classification/historical/aggregated`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `deviceId` | string | `'test'` | Device identifier |
| `timePeriod` | string | `'24hrs'` | Time period: '24hrs', 'yesterday', 'month' |

**Response**:

```json
{
  "success": true,
  "data": {
    "totalVehicles": 1523,
    "vehicleTypeDistribution": {
      "car": 65.2,
      "suv": 18.5,
      "truck": 9.3,
      "motorcycle": 4.8,
      "van": 2.2
    },
    "averageSpeed": 51.7,
    "speedViolations": 42,
    "peakHour": 17
  },
  "deviceId": "Radar04",
  "timePeriod": "24hrs",
  "timestamp": "2025-01-26T10:15:00.000Z"
}
```

**Examples**:

```bash
# Get 24-hour summary
curl 'http://localhost:3000/api/classification/historical/aggregated?deviceId=Radar04&timePeriod=24hrs'

# Get monthly summary
curl 'http://localhost:3000/api/classification/historical/aggregated?deviceId=test&timePeriod=month'
```

---

### 3. Export Historical Data

Export historical classification data in CSV or JSON format.

**Endpoint**: `GET /api/classification/export`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `deviceId` | string | `'test'` | Device identifier |
| `timePeriod` | string | `'24hrs'` | Time period: '24hrs', 'yesterday', 'month' |
| `format` | string | `'json'` | Export format: 'csv' or 'json' |

**Response**: File download with appropriate content type

**CSV Format**:
```csv
Time Slot,Total Vehicles,Cars,SUVs,Trucks,Motorcycles,Vans,Average Speed (km/h),Speed Violations
2025-01-26-10-00,73,45,12,8,5,3,52.30,2
2025-01-26-10-15,68,42,14,7,3,2,48.50,1
```

**JSON Format**:
```json
{
  "deviceId": "Radar04",
  "timePeriod": "24hrs",
  "exportDate": "2025-01-26T10:15:00.000Z",
  "totalRecords": 96,
  "data": [...]
}
```

**Response Headers**:
- `Content-Type`: `text/csv` or `application/json`
- `Content-Disposition`: `attachment; filename="classification-Radar04-24hrs-2025-01-26.csv"`
- `X-Response-Time`: Response time in milliseconds
- `X-Records-Exported`: Number of records exported

**Rate Limiting**: 10 exports per minute per client

**Examples**:

```bash
# Export as CSV
curl 'http://localhost:3000/api/classification/export?deviceId=Radar04&timePeriod=24hrs&format=csv' -o export.csv

# Export as JSON
curl 'http://localhost:3000/api/classification/export?deviceId=test&timePeriod=month&format=json' -o export.json
```

---

### 4. Export Aggregated Summary

Export aggregated summary statistics in CSV or JSON format.

**Endpoint**: `GET /api/classification/export/aggregated`

**Query Parameters**: Same as `/api/classification/export`

**CSV Format**:
```csv
Classification Summary Report
Device ID,Radar04
Time Period,24hrs
Export Date,2025-01-26T10:15:00.000Z

Overall Statistics
Metric,Value
Total Vehicles,1523
Average Speed (km/h),51.70
Speed Violations,42
Peak Hour,17

Vehicle Type Distribution
Vehicle Type,Percentage
car,65.20%
suv,18.50%
truck,9.30%
motorcycle,4.80%
van,2.20%
```

**Examples**:

```bash
# Export summary as CSV
curl 'http://localhost:3000/api/classification/export/aggregated?deviceId=Radar04&timePeriod=24hrs&format=csv' -o summary.csv
```

---

### 5. Cache Management

Get cache statistics or invalidate cache entries.

**Endpoint**: `GET /api/classification/cache`

**Response**:

```json
{
  "success": true,
  "stats": {
    "size": 15,
    "maxSize": 100,
    "hitRate": 4.2,
    "entries": [
      {
        "key": "Radar04:24hrs:{...}",
        "age": 125000,
        "accessCount": 8,
        "expiresIn": 175000
      }
    ]
  },
  "timestamp": "2025-01-26T10:15:00.000Z"
}
```

**Endpoint**: `DELETE /api/classification/cache`

**Query Parameters**:
- `deviceId` (optional): Invalidate only this device's cache

**Response**:

```json
{
  "success": true,
  "message": "Cache invalidated for device: Radar04",
  "timestamp": "2025-01-26T10:15:00.000Z"
}
```

**Examples**:

```bash
# Get cache stats
curl http://localhost:3000/api/classification/cache

# Invalidate cache for specific device
curl -X DELETE 'http://localhost:3000/api/classification/cache?deviceId=Radar04'

# Invalidate all cache
curl -X DELETE http://localhost:3000/api/classification/cache
```

---

### 6. Performance Monitoring

Get API performance metrics and statistics.

**Endpoint**: `GET /api/classification/monitoring`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `'all'` | Metric type: 'performance', 'rate-limit', 'all' |
| `timeWindow` | number | `60` | Time window in minutes |
| `endpoint` | string | - | Filter by specific endpoint |

**Response**:

```json
{
  "success": true,
  "performance": {
    "endpoints": [
      {
        "endpoint": "/api/classification/historical",
        "totalRequests": 1250,
        "successfulRequests": 1242,
        "failedRequests": 8,
        "cachedRequests": 856,
        "averageDuration": 45.2,
        "minDuration": 8.1,
        "maxDuration": 523.4,
        "p50Duration": 35.0,
        "p95Duration": 120.5,
        "p99Duration": 285.3,
        "requestsPerMinute": 20.8
      }
    ],
    "overall": {
      "totalMetrics": 1250,
      "uniqueEndpoints": 5,
      "averageResponseTime": 52.3,
      "successRate": 99.36,
      "cacheHitRate": 68.48,
      "errorRate": 0.64
    },
    "slowRequests": [...],
    "errors": [...]
  },
  "rateLimiting": {
    "api": {
      "totalIdentifiers": 12,
      "blockedIdentifiers": 0,
      "activeRequests": 158,
      "averageRequestsPerIdentifier": 13.2
    },
    "export": {
      "totalIdentifiers": 3,
      "blockedIdentifiers": 0,
      "activeRequests": 5,
      "averageRequestsPerIdentifier": 1.7
    }
  },
  "timestamp": "2025-01-26T10:15:00.000Z"
}
```

**Examples**:

```bash
# Get all metrics for last hour
curl http://localhost:3000/api/classification/monitoring

# Get only performance metrics for last 24 hours
curl 'http://localhost:3000/api/classification/monitoring?type=performance&timeWindow=1440'

# Get metrics for specific endpoint
curl 'http://localhost:3000/api/classification/monitoring?endpoint=/api/classification/historical'
```

---

### 7. Redis Poller Control

Control the Redis PassData poller background service.

**Endpoint**: `GET /api/classification/poller` - Get poller status

**Response**:

```json
{
  "success": true,
  "stats": {
    "isRunning": true,
    "pollIntervalMs": 30000,
    "deviceIds": ["test", "Radar04"],
    "lastProcessedTimestamp": "2025-01-26T10:14:30.000Z",
    "uptime": 3600000
  },
  "timestamp": "2025-01-26T10:15:00.000Z"
}
```

**Endpoint**: `POST /api/classification/poller` - Start poller

**Query Parameters**:
- `resetTimestamp` (optional): Reset last processed timestamp

**Endpoint**: `DELETE /api/classification/poller` - Stop poller

**Endpoint**: `PATCH /api/classification/poller` - Update configuration

**Request Body**:
```json
{
  "pollIntervalMs": 60000,
  "deviceIds": ["Radar04", "test", "Radar05"]
}
```

**Examples**:

```bash
# Check poller status
curl http://localhost:3000/api/classification/poller

# Start poller (reset timestamp)
curl -X POST 'http://localhost:3000/api/classification/poller?resetTimestamp=true'

# Stop poller
curl -X DELETE http://localhost:3000/api/classification/poller

# Update poller configuration
curl -X PATCH http://localhost:3000/api/classification/poller \
  -H 'Content-Type: application/json' \
  -d '{"pollIntervalMs": 60000, "deviceIds": ["Radar04"]}'
```

---

## Error Responses

All endpoints return consistent error formats:

```json
{
  "success": false,
  "error": "Error type",
  "details": "Detailed error message"
}
```

**Common HTTP Status Codes**:
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `404 Not Found` - No data available
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Rate Limiting

Rate limits are applied per client IP address:

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Historical API | 100 requests | 1 minute |
| Export API | 10 requests | 1 minute |

When rate limited, responses include:
- HTTP Status: `429 Too Many Requests`
- `Retry-After` header with seconds to wait
- `X-RateLimit-Reset` header with milliseconds

---

## Caching

The Historical API implements a 5-minute LRU cache:

- Cache key includes: `deviceId`, `timePeriod`, and pagination parameters
- TTL: 5 minutes
- Max cache size: 100 entries
- Cache status indicated by `X-Cache` header (`HIT` or `MISS`)

---

## Time Periods

Three predefined time periods are supported:

| Period | Description | Range |
|--------|-------------|-------|
| `24hrs` | Last 24 hours | Now - 24 hours to now |
| `yesterday` | Full previous day | 00:00:00 to 23:59:59 yesterday |
| `month` | Last 30 days | Now - 30 days to now |

---

## Data Aggregation

Historical data is aggregated at 15-minute intervals:

- **Time Slot Format**: `YYYY-MM-DD-HH-MM`
- **Example**: `2025-01-26-10-15` (10:15 AM on Jan 26, 2025)
- **Aggregation Frequency**: Every 15 minutes
- **Storage**: MongoDB `classification_history` collection

---

## Best Practices

1. **Use Pagination**: Always paginate large datasets (limit ≤ 1000)
2. **Respect Rate Limits**: Implement exponential backoff for 429 responses
3. **Cache Awareness**: Check `X-Cache` header to monitor cache performance
4. **Time Periods**: Use appropriate time periods to minimize data transfer
5. **Export Wisely**: Use export endpoints sparingly (10/minute limit)
6. **Monitor Performance**: Regularly check `/monitoring` endpoint
7. **Device Scoping**: Always specify `deviceId` for multi-device deployments

---

## Support

For issues or questions:
- Check logs: Application logs show detailed request/response information
- Monitor endpoint: Use `/monitoring` to identify performance issues
- Cache stats: Use `/cache` to diagnose caching problems
- Poller status: Use `/poller` to verify Redis data ingestion
