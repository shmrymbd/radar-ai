# Migrate Object Tracking Cache to Redis

**Change ID**: `migrate-tracking-cache-to-redis`
**Date**: January 31, 2025
**Status**: Complete
**Priority**: High

## Why

The object tracking system currently uses in-memory Maps to cache vehicle states and trajectories, which causes several issues:

1. **Memory Limitations**: In-memory cache grows unbounded and can consume excessive server memory
2. **No Persistence**: Data is lost on server restart, causing gaps in tracking
3. **Single Instance**: Cannot share tracking state across multiple server instances
4. **Scalability Issues**: Multiple server instances cannot coordinate tracking state
5. **Data Loss Risk**: Server crashes result in complete loss of tracking history

Moving all tracking cache to Redis provides persistence, scalability, and better resource management.

## What Changes

**Migrated all object tracking cache from in-memory to Redis-based storage.**

### Key Changes

1. **New Redis Storage Service**
   - Created `VehicleTrackingRedis` class for Redis-based vehicle state storage
   - Uses Redis Hashes for vehicle states: `{deviceId}/tracking/vehicle/{targetId}`
   - Uses Redis Lists for trajectory history: `{deviceId}/tracking/history/{targetId}`
   - Uses Redis Sets for vehicle ID tracking: `{deviceId}/tracking/vehicle_ids`
   - TTL: 5 minutes (300 seconds) for automatic cleanup

2. **VehicleTracker Refactoring**
   - Removed in-memory `Map<string, VehicleState>` and `Map<string, VehiclePosition[]>`
   - All methods now async and use Redis storage
   - `processObjectData()` - Stores vehicle states in Redis
   - `getTrackingData()` - Reads from Redis
   - `getVehicle()` - Fetches from Redis Hash
   - `getVisibleVehicles()` - Queries Redis for visible vehicles
   - `cleanupOldVehicles()` - Removes expired keys from Redis

3. **Updated Callers**
   - `UnifiedWebSocketServer` - Uses async VehicleTracker methods
   - API routes (`/api/tracking/*`) - Updated to await async methods
   - All tracking operations now device-aware via Redis keys

4. **Redis Key Structure**
   ```
   {deviceId}/tracking/vehicle/{targetId}     # Hash: VehicleState
   {deviceId}/tracking/history/{targetId}    # List: VehiclePosition[] (trajectory)
   {deviceId}/tracking/vehicle_ids           # Set: All vehicle IDs
   ```

**Modified Files:**
- `dashboard/src/lib/vehicle-tracking-redis.ts` - New Redis storage service
- `dashboard/src/lib/vehicle-tracker.ts` - Migrated to Redis
- `dashboard/src/lib/unified-websocket-server.ts` - Updated async calls
- `dashboard/src/app/api/tracking/route.ts` - Updated async calls
- `dashboard/src/app/api/tracking/vehicles/route.ts` - Updated async calls
- `dashboard/src/app/api/tracking/vehicles/[targetId]/route.ts` - Updated async calls
- `openspec/specs/live-tracking/spec.md` - Added Redis cache requirements

## Impact

- **Affected Specs**: `live-tracking`
- **Affected Code**: 
  - `VehicleTracker` class (complete refactoring)
  - All VehicleTracker callers (async updates)
  - WebSocket tracking updates
  - API tracking endpoints
- **User Impact**: No breaking changes, better scalability and persistence
- **Performance**: Slight latency increase for Redis operations, but enables horizontal scaling

## Benefits

1. **Persistence**: Tracking data survives server restarts (5-minute TTL)
2. **Scalability**: Multiple server instances can share tracking state
3. **Memory Efficiency**: No unbounded in-memory growth
4. **Device Isolation**: Multi-device support with scoped Redis keys
5. **Automatic Cleanup**: TTL-based expiration removes stale data
6. **Distributed Architecture**: Enables load balancing and high availability

## Technical Details

### Architecture Change
- **Before**: In-memory Maps (vehicles Map, vehicleHistory Map)
- **After**: Redis Hashes, Lists, and Sets with 5-minute TTL

### Redis Operations
- **HSET/HGET**: Vehicle state storage (hash fields)
- **LPUSH/LRANGE/LTRIM**: Trajectory history (lists)
- **SADD/SMEMBERS**: Vehicle ID tracking (sets)
- **TTL**: Automatic expiration after 5 minutes

### Performance Considerations
- Async operations required (all VehicleTracker methods are now async)
- Redis latency: ~1-2ms per operation (acceptable for tracking updates)
- Batch operations for multiple vehicles (future optimization opportunity)

