# Historical Charts Heatmap - Technical Explanation

## Overview

The Historical Charts Heatmap is a data visualization tool that displays traffic patterns aggregated from ClairWav-T80 radar detections. This document explains the fundamental architecture and data flow.

---

## System Architecture

### 1. Data Source: ClairWav-T80 Radar System

- **Hardware**: ClairWav-T80 radar sensors deployed at traffic intersections
- **Detection**: Real-time vehicle detection with classification capabilities
- **Output**: Raw vehicle data pushed to Redis via LPUSH/RPUSH operations

### 2. Data Storage Pipeline

```
ClairWav-T80 Radar
      ↓
   Redis List (passdata)
      ↓
PassData Subscriber (Keyspace Notifications)
      ↓
   MongoDB (PassData Collection)
```

**Key Components:**

- **Redis**: Temporary buffer for real-time data (`{deviceId}/passdata` keys)
- **Keyspace Notifications**: Redis publishes events on LPUSH/RPUSH operations
- **PassData Subscriber**: Listens to keyspace notifications and inserts data into MongoDB
- **MongoDB**: Permanent storage with indexed queries for historical analysis

### 3. Data Aggregation Process

#### MongoDB Aggregation Pipeline

The `/api/classification/historical` endpoint aggregates PassData into 15-minute time slots:

```javascript
1. MATCH: Filter by deviceId and time range (24hrs/yesterday/month)
2. PROJECT: Extract timestamp, vehicleType, speed, laneNumber
3. TIMEZONE CONVERSION: Convert UTC → UTC+8 (Asia/Kuala_Lumpur)
4. TIME SLOT ROUNDING: Round to nearest 15-minute interval (00, 15, 30, 45)
5. FORMAT: Create timeSlot string "YYYY-MM-DD-HH-MM"
6. GROUP: Aggregate by timeSlot
   - Count vehicles by type (car, suv, truck, motorcycle, van, bus, bicycle, pedestrian, other)
   - Calculate average speed
   - Count speed violations (>60 km/h)
7. SORT: Order by timeSlot (desc for newest first)
8. PAGINATE: Apply page and limit for performance
```

#### Vehicle Type Mapping

MongoDB recognizes multiple vehicle type codes:

| Display Name | Radar Codes |
|-------------|-------------|
| Car | 'car', '6' |
| SUV | 'suv', '7' |
| Truck | 'truck', 'large_truck', 'medium_truck', 'light_truck', '8', '9', '10' |
| Motorcycle | 'motorcycle', '2' |
| Van | 'van', '5' |
| Bus | 'bus', 'medium_bus', '4', '14' |
| Bicycle | 'bicycle', '1' |
| Pedestrian | 'pedestrian', '13' |
| Other | 'other', 'tricycle', '0', '3' |

---

## Frontend Visualization (HistoricalCharts.tsx)

### 1. Data Fetching

```typescript
// Fetch historical data from API
const response = await fetch(
  `/api/classification/historical?deviceId=${deviceId}&timePeriod=${timePeriod}&sortOrder=desc`
);
const result = await response.json();
// result.data contains aggregated time slots
```

### 2. Heatmap Rendering Logic

**Time Display:**
- TimeSlot format: `"2025-10-28-23-30"` → Display: `"23:30 (UTC+8)"`
- **NO timezone conversion** needed (already in UTC+8 from aggregation)

**Color Intensity Calculation:**

```typescript
const maxCount = Math.max(...historicalData.map(d => d.totalVehicles));
const intensity = (vehicleCount / maxCount) * 100;

// Color mapping:
// >80%: Red (bg-red-500) - High traffic
// 60-80%: Orange (bg-orange-500) - Moderate-high traffic
// 40-60%: Yellow (bg-yellow-500) - Medium traffic
// 20-40%: Green (bg-green-500) - Low-medium traffic
// <20%: Gray (bg-gray-200) - Very low traffic
```

### 3. What the Heatmap Shows

**Visual Elements:**

- **Rows**: Time intervals (15-minute slots) in UTC+8 timezone
- **Columns**: Vehicle type categories
- **Cell Numbers**: Actual vehicle count during that period
- **Cell Colors**: Relative traffic density compared to peak period

**Example Interpretation:**

| Time | Car | SUV | Truck | Motorcycle | Van |
|------|-----|-----|-------|------------|-----|
| 23:45 (UTC+8) | 193 | 27 | 24 | 76 | 5 |
| 23:30 (UTC+8) | **258** | 91 | 24 | 76 | 5 |

- **258 cars at 23:30**: Golden/orange color = high traffic (>60% of peak)
- **24 trucks at 23:30**: Lighter color = low traffic (<20% of peak)
- **Time 23:30 (UTC+8)**: Represents vehicles detected between 11:30 PM - 11:45 PM

---

## Key Technical Details

### 1. Timezone Handling (CRITICAL)

- **Radar Data**: Raw timestamps are in system time (assumed UTC or UTC+8)
- **MongoDB Storage**: Stores original timestamps
- **Aggregation Pipeline**: Converts to UTC+8 by adding 28800000ms (8 hours)
- **Frontend Display**: Shows pre-converted UTC+8 times (no conversion needed)

### 2. Performance Optimizations

- **Caching**: 5-minute TTL cache for API responses
- **Rate Limiting**: 100 requests/minute per client
- **Pagination**: Default 100 records/page, max 1000
- **Virtualization**: Frontend uses virtualized rendering for >500 data points
- **Indexes**: MongoDB indexes on `deviceId` + `timestamp` for fast queries

### 3. Data Freshness

- **Real-time**: Redis Pub/Sub pushes data to MongoDB within seconds
- **Historical**: MongoDB aggregation runs on-demand (cached for 5 minutes)
- **Update Frequency**: Dashboard refreshes every 2 seconds (debounced)

---

## Component Hierarchy

```
HistoricalCharts.tsx
├── State Management
│   ├── timePeriod: '24hrs' | 'yesterday' | 'month'
│   ├── chartType: 'heatmap' | 'histogram' | 'trend' | etc.
│   └── historicalData: HistoricalChartData[]
│
├── Data Fetching (fetchHistoricalData)
│   ├── API Call: /api/classification/historical
│   ├── Parameters: deviceId, timePeriod, sortOrder=desc
│   └── Result: Aggregated time slot data
│
└── Rendering (renderHeatmapChart)
    ├── Explanation Panel (blue info box)
    ├── Heatmap Table
    │   ├── Header: Time + Vehicle Types
    │   ├── Body: Time slots × Vehicle counts
    │   └── Colors: Intensity-based background
    ├── Summary Statistics
    └── Data Source Info
```

---

## API Endpoint Details

### GET `/api/classification/historical`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `deviceId` | string | 'P1-center' | Radar device identifier |
| `timePeriod` | string | '24hrs' | Time range: '24hrs', 'yesterday', 'month' |
| `page` | number | 1 | Pagination page number |
| `limit` | number | 100 | Results per page (max 1000) |
| `sortBy` | string | 'timestamp' | Sort field: 'timestamp' or 'totalVehicles' |
| `sortOrder` | string | 'asc' | Sort direction: 'asc' or 'desc' |

**Response Format:**

```json
{
  "success": true,
  "data": [
    {
      "timeSlot": "2025-10-28-23-30",
      "vehicleTypes": {
        "car": 258,
        "suv": 91,
        "truck": 24,
        "motorcycle": 76,
        "van": 5,
        "bus": 0,
        "bicycle": 0,
        "pedestrian": 0,
        "other": 0
      },
      "totalVehicles": 454,
      "averageSpeed": 45.2,
      "speedViolations": 12
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1523,
    "totalPages": 16,
    "hasNext": true,
    "hasPrev": false
  },
  "deviceId": "P1-center",
  "timePeriod": "24hrs",
  "cached": false,
  "timestamp": "2025-10-28T15:45:00.000Z"
}
```

---

## Troubleshooting

### Common Issues

1. **No data displayed**
   - Check MongoDB connection (192.168.6.22:27017)
   - Verify device ID matches Redis key (`{deviceId}/passdata`)
   - Ensure PassData subscriber is running

2. **Incorrect timestamps**
   - Verify timezone conversion in aggregation pipeline
   - Check `localTimestamp` calculation (must add 28800000ms)
   - Ensure frontend uses pre-converted UTC+8 times

3. **Performance issues**
   - Enable virtualization for large datasets (>500 records)
   - Reduce time period or increase pagination limit
   - Check MongoDB indexes: `db.passdata.getIndexes()`

---

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live heatmap updates
2. **Advanced Filters**: Lane-specific, speed-range, and direction filters
3. **Export Functionality**: Full-featured PNG/SVG/PDF export with proper rendering
4. **Drill-down**: Click on cells to see detailed vehicle records
5. **Comparison Mode**: Side-by-side heatmaps for different time periods
6. **Predictive Analytics**: ML-based traffic prediction overlay

---

## References

- **Component**: `dashboard/src/components/HistoricalCharts.tsx` (lines 357-480)
- **API Route**: `dashboard/src/app/api/classification/historical/route.ts` (lines 196-411)
- **MongoDB Schema**: `dashboard/src/docs/MONGODB_SCHEMA.md`
- **Architecture**: `dashboard/src/docs/CLASSIFICATION_ARCHITECTURE.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-10-28
**Author**: Claude Code Analysis
