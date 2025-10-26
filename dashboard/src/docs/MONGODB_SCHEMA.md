# MongoDB Schema Documentation

## Database: `traffic_signal_dashboard`

This document describes the MongoDB schema used for historical vehicle classification data storage.

---

## Collection: `classification_history`

Stores aggregated vehicle classification data in 15-minute intervals for long-term analysis and reporting.

### Schema Structure

```javascript
{
  _id: ObjectId,
  deviceId: String,
  timestamp: Date,
  timeSlot: String,
  vehicleTypes: {
    car: Number,
    suv: Number,
    truck: Number,
    motorcycle: Number,
    van: Number
  },
  laneUtilization: {
    lane11: Number,
    lane12: Number,
    lane31: Number,
    lane32: Number
  },
  speedAnalysis: {
    averageSpeed: Number,
    speedViolations: Number,
    speedDistribution: [SpeedRange]
  },
  totalVehicles: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB unique identifier |
| `deviceId` | String | Yes | Radar device identifier (e.g., 'test', 'Radar04') |
| `timestamp` | Date | Yes | Aggregation timestamp (start of 15-min interval) |
| `timeSlot` | String | Yes | Human-readable time slot (format: `YYYY-MM-DD-HH-MM`) |
| `vehicleTypes` | Object | Yes | Count of each vehicle type detected |
| `vehicleTypes.car` | Number | Yes | Number of cars (default: 0) |
| `vehicleTypes.suv` | Number | Yes | Number of SUVs (default: 0) |
| `vehicleTypes.truck` | Number | Yes | Number of trucks (default: 0) |
| `vehicleTypes.motorcycle` | Number | Yes | Number of motorcycles (default: 0) |
| `vehicleTypes.van` | Number | Yes | Number of vans (default: 0) |
| `laneUtilization` | Object | Yes | Vehicle count per lane |
| `laneUtilization.lane11` | Number | Yes | Vehicles in lane 11 |
| `laneUtilization.lane12` | Number | Yes | Vehicles in lane 12 |
| `laneUtilization.lane31` | Number | Yes | Vehicles in lane 31 |
| `laneUtilization.lane32` | Number | Yes | Vehicles in lane 32 |
| `speedAnalysis` | Object | Yes | Speed-related metrics |
| `speedAnalysis.averageSpeed` | Number | Yes | Average speed in km/h |
| `speedAnalysis.speedViolations` | Number | Yes | Count of speed violations |
| `speedAnalysis.speedDistribution` | Array | Yes | Speed range distribution (see SpeedRange schema) |
| `totalVehicles` | Number | Yes | Sum of all vehicles in this interval |
| `createdAt` | Date | Yes | Document creation timestamp |
| `updatedAt` | Date | Yes | Last update timestamp |

### SpeedRange Sub-Schema

```javascript
{
  range: String,      // e.g., "0-20", "20-40", "40-60"
  count: Number,      // Number of vehicles in this speed range
  percentage: Number  // Percentage of total vehicles
}
```

### Indexes

For optimal query performance, the following indexes are created automatically:

```javascript
// Compound index for device + time queries
db.classification_history.createIndex({ deviceId: 1, timestamp: 1 })

// Time slot queries
db.classification_history.createIndex({ timeSlot: 1 })

// Device-specific queries
db.classification_history.createIndex({ deviceId: 1 })
```

**Index Usage**:
- **deviceId + timestamp**: Efficiently retrieves historical data for a specific device within a time range
- **timeSlot**: Fast lookup for specific 15-minute intervals
- **deviceId**: Quick filtering by device

---

## Data Lifecycle

### 1. Data Ingestion

**Source**: Redis PassData (packet 0x05)
**Frequency**: Continuous via Redis Poller (30-second intervals)
**Processing**: In-memory aggregation in ClassificationProcessor

### 2. Aggregation

**Frequency**: Every 15 minutes
**Process**:
1. ClassificationProcessor timer triggers aggregation
2. Current in-memory metrics are calculated
3. `ClassificationHistory` document is created
4. Document is upserted to MongoDB (prevents duplicates via deviceId + timeSlot)

### 3. Storage Optimization

#### Data Compression (30+ days old)

Old data is automatically compressed from 15-minute to hourly intervals:

```javascript
// Original (15-min intervals)
2025-01-01-10-00  // 50 vehicles
2025-01-01-10-15  // 45 vehicles
2025-01-01-10-30  // 52 vehicles
2025-01-01-10-45  // 48 vehicles

// Compressed (hourly)
2025-01-01-10-00  // 195 vehicles (sum of 4 intervals)
```

**Benefits**:
- Reduces storage by ~75%
- Maintains analytical value
- Automatically runs via `runMaintenance()`

#### Data Retention (90+ days old)

Data older than 90 days is automatically deleted:

```javascript
// Cleanup query
db.classification_history.deleteMany({
  timestamp: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
})
```

**Configurable**:
```typescript
await historyStorage.runMaintenance({
  retentionDays: 90,        // Delete data older than this
  compressAfterDays: 30     // Compress data older than this
});
```

---

## Example Documents

### Recent Data (15-minute interval)

```json
{
  "_id": ObjectId("65b3f8a1234567890abcdef0"),
  "deviceId": "Radar04",
  "timestamp": ISODate("2025-01-26T10:00:00.000Z"),
  "timeSlot": "2025-01-26-10-00",
  "vehicleTypes": {
    "car": 45,
    "suv": 12,
    "truck": 8,
    "motorcycle": 5,
    "van": 3
  },
  "laneUtilization": {
    "lane11": 28,
    "lane12": 31,
    "lane31": 10,
    "lane32": 4
  },
  "speedAnalysis": {
    "averageSpeed": 52.3,
    "speedViolations": 2,
    "speedDistribution": [
      { "range": "0-20", "count": 3, "percentage": 4.1 },
      { "range": "20-40", "count": 15, "percentage": 20.5 },
      { "range": "40-60", "count": 48, "percentage": 65.8 },
      { "range": "60-80", "count": 5, "percentage": 6.8 },
      { "range": "80+", "count": 2, "percentage": 2.7 }
    ]
  },
  "totalVehicles": 73,
  "createdAt": ISODate("2025-01-26T10:15:12.456Z"),
  "updatedAt": ISODate("2025-01-26T10:15:12.456Z")
}
```

### Compressed Data (hourly, 30+ days old)

```json
{
  "_id": ObjectId("65a1234567890abcdef12345"),
  "deviceId": "Radar04",
  "timestamp": ISODate("2024-12-20T14:00:00.000Z"),
  "timeSlot": "2024-12-20-14-00",
  "vehicleTypes": {
    "car": 182,
    "suv": 48,
    "truck": 31,
    "motorcycle": 19,
    "van": 12
  },
  "laneUtilization": {
    "lane11": 112,
    "lane12": 124,
    "lane31": 40,
    "lane32": 16
  },
  "speedAnalysis": {
    "averageSpeed": 49.8,
    "speedViolations": 7,
    "speedDistribution": [
      { "range": "0-20", "count": 12, "percentage": 4.1 },
      { "range": "20-40", "count": 58, "percentage": 19.9 },
      { "range": "40-60", "count": 195, "percentage": 66.8 },
      { "range": "60-80", "count": 22, "percentage": 7.5 },
      { "range": "80+", "count": 5, "percentage": 1.7 }
    ]
  },
  "totalVehicles": 292,
  "createdAt": ISODate("2024-12-20T15:02:34.123Z"),
  "updatedAt": ISODate("2024-12-20T15:02:34.123Z")
}
```

---

## Query Examples

### Get Last 24 Hours for a Device

```javascript
db.classification_history.find({
  deviceId: "Radar04",
  timestamp: {
    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
    $lte: new Date()
  }
}).sort({ timestamp: 1 })
```

### Get Aggregated Statistics for a Month

```javascript
db.classification_history.aggregate([
  {
    $match: {
      deviceId: "Radar04",
      timestamp: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        $lte: new Date()
      }
    }
  },
  {
    $group: {
      _id: null,
      totalVehicles: { $sum: "$totalVehicles" },
      avgSpeed: { $avg: "$speedAnalysis.averageSpeed" },
      totalViolations: { $sum: "$speedAnalysis.speedViolations" },
      carCount: { $sum: "$vehicleTypes.car" },
      suvCount: { $sum: "$vehicleTypes.suv" },
      truckCount: { $sum: "$vehicleTypes.truck" },
      motorcycleCount: { $sum: "$vehicleTypes.motorcycle" },
      vanCount: { $sum: "$vehicleTypes.van" }
    }
  }
])
```

### Find Peak Traffic Hours

```javascript
db.classification_history.aggregate([
  {
    $match: {
      deviceId: "Radar04",
      timestamp: { $gte: new Date("2025-01-26T00:00:00Z") }
    }
  },
  {
    $group: {
      _id: { $hour: "$timestamp" },
      totalVehicles: { $sum: "$totalVehicles" }
    }
  },
  {
    $sort: { totalVehicles: -1 }
  },
  {
    $limit: 5
  }
])
```

### Count Documents by Device

```javascript
db.classification_history.aggregate([
  {
    $group: {
      _id: "$deviceId",
      count: { $sum: 1 },
      totalVehicles: { $sum: "$totalVehicles" }
    }
  }
])
```

---

## Storage Estimates

### Per Document

- **15-minute interval**: ~1.5 KB per document
- **Hourly (compressed)**: ~1.5 KB per document (same size, fewer documents)

### Per Device

| Time Period | 15-min Intervals | Hourly (Compressed) | Storage |
|-------------|------------------|---------------------|---------|
| 1 day | 96 documents | 24 documents | 140 KB |
| 1 week | 672 documents | 168 documents | 1 MB |
| 1 month | 2,880 documents | 720 documents | 4.2 MB |
| 1 year (mixed) | ~35,000 docs | ~8,760 docs | ~50 MB |

**Compression Savings**:
- Data >30 days: ~75% reduction in document count
- Maintains same storage per document
- Significantly improves query performance

---

## Maintenance Operations

### Run Manual Maintenance

```typescript
import { ClassificationHistoryStorage } from '@/lib/classification-history-storage';

const storage = new ClassificationHistoryStorage();
await storage.connect();

// Run with custom settings
await storage.runMaintenance({
  retentionDays: 60,       // Delete data older than 60 days
  compressAfterDays: 14    // Compress data older than 14 days
});
```

### Get Storage Statistics

```typescript
const stats = await storage.getStorageStats();
console.log('Total Records:', stats.totalRecords);
console.log('Storage Size:', (stats.storageSize / 1024 / 1024).toFixed(2), 'MB');
console.log('Oldest Record:', stats.oldestRecord);
console.log('Newest Record:', stats.newestRecord);
console.log('Records by Device:', stats.deviceCounts);
```

### Batch Insert Historical Data

```typescript
const records: ClassificationHistory[] = [
  // ... array of historical records
];

const result = await storage.batchInsert(records, 100);
console.log('Inserted:', result.inserted);
console.log('Updated:', result.updated);
console.log('Failed:', result.failed);
```

---

## Best Practices

1. **Upsert Strategy**: Always use upsert for `deviceId` + `timeSlot` to prevent duplicates
2. **Index Usage**: Ensure queries use indexes (check with `.explain()`)
3. **Batch Operations**: Use batch operations for large data imports
4. **Compression**: Let automatic compression run (don't disable)
5. **Retention**: Set retention policy based on compliance requirements
6. **Monitoring**: Track storage size and document counts regularly
7. **Backups**: Implement regular MongoDB backups for disaster recovery

---

## Troubleshooting

### Duplicate Time Slots

If you see duplicate `timeSlot` entries for the same device:
```javascript
// Find duplicates
db.classification_history.aggregate([
  {
    $group: {
      _id: { deviceId: "$deviceId", timeSlot: "$timeSlot" },
      count: { $sum: 1 }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  }
])

// Remove duplicates (keep newest)
// Use with caution - backup first!
```

### Slow Queries

Check index usage:
```javascript
db.classification_history.find({
  deviceId: "Radar04",
  timestamp: { $gte: new Date("2025-01-01") }
}).explain("executionStats")
```

Look for `IXSCAN` (index scan) vs `COLLSCAN` (collection scan).

### High Storage Usage

Run storage stats and consider:
1. Reducing retention period
2. Enabling compression for newer data
3. Archiving old data to cold storage

```typescript
const stats = await storage.getStorageStats();
if (stats.storageSize > 1000000000) { // 1GB
  await storage.runMaintenance({
    retentionDays: 30,
    compressAfterDays: 7
  });
}
```

---

## Migration

### From Other Systems

Use the batch migration tool:

```typescript
async function migrateData() {
  const storage = new ClassificationHistoryStorage();
  await storage.connect();

  // Your data source
  async function getData(offset: number, limit: number): Promise<ClassificationHistory[]> {
    // Fetch from your legacy system
    return fetchLegacyData(offset, limit);
  }

  const result = await storage.migrateFromSource(
    getData,
    10000,  // total records
    100     // batch size
  );

  console.log('Migration complete:', result);
}
```

---

## Reference

- **TypeScript Interfaces**: `dashboard/src/types/classification-history.ts`
- **Storage Class**: `dashboard/src/lib/classification-history-storage.ts`
- **Processor**: `dashboard/src/lib/classification-processor.ts`
