# Backend MongoDB Usage Audit

This document lists all backend/server-side code that uses MongoDB.

## MongoDB Connection

**Core Module:** `dashboard/src/lib/mongodb.ts`
- Provides `connectToDatabase()` function
- Connection pooling (min: 2, max: 10)
- Retry logic with exponential backoff (3 attempts)
- Connection string: `mongodb://USER:PASS@HOST:PORT/DB?authSource=AUTH_DB`

---

## MongoDB Collections Used

### 1. `passdata` - Primary Vehicle Pass Data
**Primary collection for all vehicle detection events**

**Used by:**
- `PassDataMongoDBService` - Main service for PassData queries
- `PassDataSubscriber` - Writes PassData from Redis to MongoDB
- `RedisPubSubService` - Writes PassData to MongoDB on Pub/Sub events
- `PassDataStreamProcessor` - Batch writes PassData events

**API Routes:**
- `/api/analytics/route.ts` - Query PassData for analytics
- `/api/classification/route.ts` - Query PassData for classification
- `/api/classification/vehicles/route.ts` - Get vehicle list from PassData
- `/api/classification/historical/route.ts` - Aggregate PassData for historical charts
- `/api/classification-mongodb/route.ts` - Direct MongoDB queries

**Operations:**
- `insertMany()` - Bulk insert PassData entries
- `find()` - Query by deviceId, timestamp ranges
- `aggregate()` - Complex aggregations for metrics

---

### 2. `classification_history` - Historical Classification Data
**Aggregated classification data over time**

**Used by:**
- `ClassificationHistoryStorage` - Main storage class
- `/api/classification/historical/route.ts` - Query historical data

**Operations:**
- `insertOne()` - Store classification record
- `updateOne()` - Update existing classification
- `find()` - Query by deviceId, timeSlot
- `aggregate()` - Time-based aggregations
- `deleteMany()` - Cleanup old records

**Indexes:**
- `deviceId_1_timestamp_-1`
- `deviceId_1_timeSlot_1`
- `timestamp_-1`

---

### 3. `camera_configs` - Camera Configuration
**Camera stream settings and RTSP URLs**

**Used by:**
- `CameraStorage` - Main storage class
- `/api/video/cameras/route.ts` - CRUD operations for cameras

**Operations:**
- `find()` - Get all cameras
- `insertOne()` - Add new camera
- `updateOne()` - Update camera settings
- `deleteOne()` - Remove camera

---

### 4. `lane_config` - Lane Configuration
**Lane thresholds and settings per device**

**Used by:**
- `LaneConfigService` - Main service class
- `/api/lane-config/route.ts` - Manage lane configurations

**Operations:**
- `findOne()` - Get lane config for device
- `updateOne()` - Update lane config
- `insertOne()` - Create new lane config
- `deleteOne()` - Remove lane config

---

### 5. `signal_timing_logs` - Signal Timing Logs
**Traffic signal timing decisions and logs**

**Used by:**
- `/api/signal-timing/route.ts` - Log signal timing events

**Operations:**
- `insertOne()` - Log timing decision
- `find()` - Query timing logs

---

### 6. `vehicle_tracking` - Vehicle Tracking Data
**Real-time vehicle position tracking**

**Used by:**
- MongoDB indexes setup
- (May be used by future tracking features)

---

### 7. `passdata_events` - PassData Event Stream
**Processed PassData events for stream processing**

**Used by:**
- `PassDataStreamProcessor` - Batch writes events

**Operations:**
- `insertMany()` - Bulk insert processed events

---

## Services Using MongoDB

### 1. PassDataMongoDBService
**Location:** `dashboard/src/lib/passdata-mongodb-service.ts`

**Purpose:** Query PassData collection for classification metrics and summaries

**Methods:**
- `getClassificationMetrics(deviceId)` - Get metrics using aggregation pipelines
- `getClassificationSummary(deviceId)` - Get summary statistics
- `getVehicleTypeCounts(deviceId, timeRange)` - Count vehicles by type
- `getLaneUtilization(deviceId, timeRange)` - Calculate lane usage
- `getAverageSpeeds(deviceId, timeRange)` - Calculate speed statistics
- `getPeakHours(deviceId, timeRange)` - Find peak traffic hours
- `getTrafficComposition(deviceId, timeRange)` - Vehicle type distribution

**Collections:** `passdata`

---

### 2. PassDataSubscriber
**Location:** `dashboard/src/lib/passdata-subscriber.ts`

**Purpose:** Subscribe to Redis PassData and write to MongoDB

**Methods:**
- `startSubscribing()` - Subscribe to Redis and write to MongoDB
- Writes directly to `passdata` collection

**Collections:** `passdata`

---

### 3. RedisPubSubService
**Location:** `dashboard/src/lib/redis-pubsub-service.ts`

**Purpose:** Handle Redis Pub/Sub and write PassData to MongoDB

**Methods:**
- `writePassDataToMongoDB(deviceId, data)` - Write PassData entries
- Bulk inserts to `passdata` collection with duplicate handling

**Collections:** `passdata`

---

### 4. ClassificationHistoryStorage
**Location:** `dashboard/src/lib/classification-history-storage.ts`

**Purpose:** Store and query historical classification data

**Methods:**
- `storeClassificationData(data)` - Store classification record
- `getHistoricalData(deviceId, startTime, endTime)` - Query historical data
- `getAggregatedData(deviceId, period)` - Get aggregated data
- `cleanupOldData(deviceId, daysToKeep)` - Remove old records

**Collections:** `classification_history`

---

### 5. CameraStorage
**Location:** `dashboard/src/lib/camera-storage.ts`

**Purpose:** Manage camera configurations

**Methods:**
- `getAllCameras()` - Get all cameras
- `addCamera(camera)` - Add new camera
- `removeCamera(id)` - Delete camera
- `updateCamera(id, updates)` - Update camera settings

**Collections:** `camera_configs`

---

### 6. LaneConfigService
**Location:** `dashboard/src/lib/lane-config-service.ts`

**Purpose:** Manage lane configurations per device

**Methods:**
- `getLaneConfig(deviceId)` - Get lane config
- `updateLaneConfig(deviceId, config)` - Update config
- `deleteLaneConfig(deviceId)` - Remove config

**Collections:** `lane_config`

---

### 7. PassDataStreamProcessor
**Location:** `dashboard/src/lib/passdata-stream-processor.ts`

**Purpose:** Process PassData stream and batch write to MongoDB

**Methods:**
- `writeToMongoDB(data)` - Batch write processed events
- Circuit breaker for MongoDB failures

**Collections:** `passdata_events`

---

## API Routes Using MongoDB

### Analytics Routes
- `/api/analytics/route.ts` - Query `passdata` for analytics visualization

### Classification Routes
- `/api/classification/route.ts` - Query `passdata` for classification data
- `/api/classification/summary/route.ts` - Use `PassDataMongoDBService`
- `/api/classification/metrics/route.ts` - Use `PassDataMongoDBService`
- `/api/classification/vehicles/route.ts` - Query `passdata` for vehicle list
- `/api/classification/historical/route.ts` - Aggregate `passdata` for historical charts
- `/api/classification-mongodb/route.ts` - Direct MongoDB queries to `passdata`

### Video Routes
- `/api/video/cameras/route.ts` - CRUD operations on `camera_configs`

### Configuration Routes
- `/api/lane-config/route.ts` - Manage `lane_config` collection
- `/api/signal-timing/route.ts` - Log to `signal_timing_logs`

---

## MongoDB Indexes

**Location:** `dashboard/src/lib/mongodb-indexes.ts`

**Collections with indexes:**
1. `classification_history`
   - `{ deviceId: 1, timestamp: -1 }`
   - `{ deviceId: 1, timeSlot: 1 }`
   - `{ timestamp: -1 }`

2. `passdata`
   - `{ deviceId: 1, timestamp: -1 }`
   - `{ deviceId: 1, laneNumber: 1, timestamp: -1 }`
   - `{ deviceId: 1, vehicleType: 1, timestamp: -1 }`
   - `{ timestamp: -1 }`

3. `camera_configs`
   - `{ id: 1 }` (unique)
   - `{ isActive: 1 }`

4. `lane_config`
   - `{ deviceId: 1 }` (unique)

5. `vehicle_tracking`
   - `{ deviceId: 1, targetId: 1, timestamp: -1 }`

---

## Architecture: MongoDB-First

**Key Pattern:** MongoDB is the single source of truth

1. **Data Flow:**
   ```
   Redis → PassDataSubscriber/RedisPubSubService → MongoDB → API Routes → Frontend
   ```

2. **No In-Memory Cache:**
   - `ClassificationProcessor` methods are deprecated
   - All queries go directly to MongoDB via API routes
   - No Redis polling for classification data

3. **Real-Time Updates:**
   - Redis Pub/Sub triggers immediate MongoDB writes
   - WebSocket broadcasts updates to frontend
   - API routes query MongoDB directly

---

## Environment Variables Required

```bash
MONGODB_HOST=192.168.6.22
MONGODB_PORT=27017
MONGODB_USERNAME=admin
MONGODB_PASSWORD=admin123
MONGODB_AUTH_DATABASE=admin
MONGODB_DASHBOARD_DATABASE=traffic_signal_dashboard
```

---

## Summary Statistics

**Total Collections:** 7
- `passdata` (primary)
- `classification_history`
- `camera_configs`
- `lane_config`
- `signal_timing_logs`
- `vehicle_tracking`
- `passdata_events`

**Total Services:** 7
- PassDataMongoDBService
- PassDataSubscriber
- RedisPubSubService
- ClassificationHistoryStorage
- CameraStorage
- LaneConfigService
- PassDataStreamProcessor

**Total API Routes:** 10+
- All classification routes
- Analytics routes
- Video routes
- Configuration routes

**MongoDB Operations Used:**
- `find()`
- `insertOne()` / `insertMany()`
- `updateOne()` / `updateMany()`
- `deleteOne()` / `deleteMany()`
- `aggregate()` - Complex pipelines for metrics
- `collection.createIndex()` - Index management

---

**Last Updated:** 2025-01-31
**Audited By:** AI Assistant
**Status:** ✅ MongoDB is extensively used in backend (expected and correct)

