# ObjectData Analysis Report

**Date:** 2025-10-31  
**Issue:** objectdata is missing object

## Summary

Investigated the objectdata structure and usage across the codebase. Found data structure inconsistencies and potential type mismatches, but actual Redis data appears to be correctly structured with entries present.

## Current Data Structure in Redis

### Verified Redis Data
- **Location:** `P1-center/objectdata`
- **Format:** Raw `ObjectData` (not `ProcessedObjectData`)
- **Structure:**
```json
{
  "deviceId": "P1-center",
  "frameType": "0x01",
  "timestamp": "2025-10-31T18:37:45.663Z",
  "numEntries": 5,
  "entries": [
    {
      "targetId": "...",
      "laneNo": 12,
      "targetType": 6,
      "color": 10,
      "plateNumber": "",
      "xCoordM": 6,
      "yCoordM": 29.7,
      "speedKmh": 0,
      "azimuthDeg": 179.9,
      "longitude": 120.00006219999999,
      "latitude": 30.000266699999997,
      "imageX": 2148,
      "imageY": 1117,
      "vehicleLength": 5,
      "vehicleWidth": 2,
      "vehicleHeight": 2,
      "parkingStatus": true,
      "xSpeed": 0,
      "ySpeed": 0,
      "acceleration": 0
    }
  ],
  "packetSize": ...
}
```

**Status:** ✅ All 5 checked records have:
- `entries` property present
- `entries` is an array
- `numEntries` matches `entries.length`

## Code Analysis

### Storage Methods

1. **`storeRawObjectData(data: ObjectData)`** - Stores raw ObjectData
   - Used by: `unified-websocket-server.ts`, `tracking-websocket-server.ts`, `vehicle-data-generator.ts`
   - Stores: Raw `ObjectData` format (what comes from radar)

2. **`storeObjectData(data: ProcessedObjectData)`** - Stores processed data
   - Used by: Unknown (not found in codebase search)
   - Stores: `ProcessedObjectData` with additional fields (`summary`, processed entries)

### Retrieval Methods

1. **`getDeviceObjectData(deviceId, limit)`**
   - **Returns:** `ProcessedObjectData[]` (TypeScript type)
   - **Actually Returns:** Raw `ObjectData[]` from Redis (type mismatch!)
   - **Location:** `dashboard/src/lib/redis-storage.ts:384`
   - **Issue:** Type annotation says `ProcessedObjectData[]` but Redis contains `ObjectData[]`

2. **Direct Redis access in `unified-websocket-server.ts:934`**
   - Uses `client.lRange()` directly
   - Parses as JSON without type checking
   - Returns as `parsedObjectData`

### Conversion Issues

**Problem Found:** `convertToObjectData()` in `unified-websocket-server.ts:708`

```typescript
private convertToObjectData(processedData: any): any {
  return {
    deviceId: processedData.deviceId,
    frameType: '0x01' as const,
    timestamp,
    numEntries: processedData.numEntries,
    entries: processedData.entries,  // ⚠️ Directly passes entries without validation
    packetSize: processedData.packetSize
  };
}
```

**Issues:**
1. No validation that `entries` exists
2. No validation that `entries` is an array
3. No type checking (uses `any`)
4. If `processedData.entries` is undefined, it creates invalid ObjectData

### Type Mismatch Chain

1. **Redis stores:** `ObjectData` (raw format)
2. **`getDeviceObjectData()` claims to return:** `ProcessedObjectData[]`
3. **Actually returns:** `ObjectData[]` (runtime type mismatch)
4. **Code expects:** `ProcessedObjectData` with `entries: ProcessedVehicleEntry[]`
5. **Gets:** `ObjectData` with `entries: VehicleEntry[]`

## Potential Issues

### Issue 1: Missing `entries` Validation
If data is stored without `entries` or `entries` is undefined/null:
- `convertToObjectData()` will create invalid ObjectData
- `vehicle-tracker.ts:53` checks `objectData.entries.length` - would fail if entries is undefined
- `vehicle-tracker.ts:63` calls `.map()` on entries - would crash if undefined

### Issue 2: Type Mismatch
- `getDeviceObjectData()` type annotation is incorrect
- Code may expect `ProcessedObjectData.summary` but Redis data doesn't have it
- `ProcessedVehicleEntry` has extra fields (`vehicleTypeName`, `position`, `movement`, `dimensions`) that won't exist in raw data

### Issue 3: No Defensive Checks
Most code assumes `entries` always exists:
```typescript
// unified-websocket-server.ts:719
entries: processedData.entries,  // Could be undefined!

// vehicle-tracker.ts:63
const targetIds = objectData.entries.map(...);  // Would crash if undefined
```

## Recommendations

### 1. Add Validation to `convertToObjectData()`
```typescript
private convertToObjectData(processedData: any): ObjectData {
  if (!processedData || typeof processedData !== 'object') {
    throw new Error('Invalid processedData: not an object');
  }
  
  if (!Array.isArray(processedData.entries)) {
    console.warn('⚠️ ObjectData missing entries array:', processedData);
    processedData.entries = [];  // Default to empty array
  }
  
  return {
    deviceId: processedData.deviceId || 'unknown',
    frameType: '0x01' as const,
    timestamp: /* ... */,
    numEntries: processedData.numEntries || processedData.entries?.length || 0,
    entries: processedData.entries || [],
    packetSize: processedData.packetSize || 0
  };
}
```

### 2. Fix Type Annotation
Update `getDeviceObjectData()` return type:
```typescript
// Current (INCORRECT):
public async getDeviceObjectData(deviceId: string, limit: number = 1): Promise<ProcessedObjectData[]>

// Should be:
public async getDeviceObjectData(deviceId: string, limit: number = 1): Promise<ObjectData[]>
```

Or better: Return a union type or add runtime validation.

### 3. Add Defensive Checks in `vehicle-tracker.ts`
```typescript
public async processObjectData(objectData: ObjectData): Promise<TrackingUpdate> {
  if (!objectData.entries || !Array.isArray(objectData.entries)) {
    console.error('❌ ObjectData missing entries:', objectData);
    return {
      type: 'vehicle_update' as const,
      vehicles: [],
      timestamp: new Date().getTime()
    };
  }
  // ... rest of code
}
```

### 4. Add Validation When Storing
```typescript
public async storeRawObjectData(data: ObjectData): Promise<void> {
  if (!data.entries || !Array.isArray(data.entries)) {
    throw new Error('ObjectData must have entries array');
  }
  if (data.numEntries !== data.entries.length) {
    console.warn(`⚠️ numEntries (${data.numEntries}) doesn't match entries.length (${data.entries.length})`);
  }
  // ... rest of code
}
```

## Testing Verification

### Check for Missing Entries
```bash
# Check all objectdata records
redis-cli -h 192.168.6.22 -p 6379 LRANGE "P1-center/objectdata" 0 -1 | \
  python3 -c "import sys, json; \
    data = [json.loads(x) for x in sys.stdin.read().strip().split('\n') if x]; \
    missing = [i for i, d in enumerate(data) if 'entries' not in d or not isinstance(d.get('entries'), list)]; \
    print(f'Records with missing entries: {missing}' if missing else '✅ All records have entries')"
```

### Verify Type Consistency
```bash
# Check if any records have ProcessedObjectData structure (with 'summary' field)
redis-cli -h 192.168.6.22 -p 6379 LRANGE "P1-center/objectdata" 0 10 | \
  python3 -c "import sys, json; \
    data = [json.loads(x) for x in sys.stdin.read().strip().split('\n') if x]; \
    processed = [i for i, d in enumerate(data) if 'summary' in d]; \
    print(f'ProcessedObjectData records: {processed}' if processed else '✅ All records are raw ObjectData')"
```

## Conclusion

**Current Status:**
- ✅ Redis data structure appears correct (all checked records have entries)
- ⚠️ Type annotations don't match runtime data
- ⚠️ Missing defensive validation for missing `entries`
- ⚠️ Potential crashes if `entries` is undefined/null

**Most Likely Issue:**
The error "objectdata is missing object" may refer to:
1. **Type mismatch** - Code expects `ProcessedObjectData` but gets `ObjectData`
2. **Missing validation** - No checks if `entries` property exists before accessing
3. **Runtime error** - If somehow `entries` is undefined, code would crash

**Recommended Fix:**
Add validation and defensive checks as outlined above, especially in:
- `convertToObjectData()` method
- `processObjectData()` method  
- `storeRawObjectData()` method

