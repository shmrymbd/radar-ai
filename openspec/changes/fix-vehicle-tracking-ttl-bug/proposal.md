# Fix Vehicle Tracking TTL Bug

**Change ID**: `fix-vehicle-tracking-ttl-bug`
**Date**: November 1, 2025
**Status**: Proposed
**Priority**: High

## Why

The vehicle tracking system has a critical TTL (Time-To-Live) bug in Redis that causes:

1. **Stale Vehicle IDs in Set**: The `vehicle_ids` Set maintains references to vehicles long after individual vehicle keys have expired
2. **Memory Leaks**: Old vehicle IDs accumulate in the Set, never being cleaned up properly
3. **Performance Degradation**: Queries iterate over stale vehicle IDs, causing unnecessary Redis lookups for non-existent keys
4. **Inconsistent State**: The Set TTL resets constantly as new vehicles are added, but doesn't remove IDs for expired vehicles

### Root Cause

In `dashboard/src/lib/vehicle-tracking-redis.ts`:

**Line 73** (and 110, 110):
```typescript
await client.sAdd(this.getVehicleIdsKey(), targetId);
await client.expire(this.getVehicleIdsKey(), 300);  // ❌ RESETS TTL EVERY UPDATE
```

**Problem**: Every vehicle update resets the entire Set's TTL to 300 seconds. This means:
- The Set never expires as long as ANY vehicle is being tracked
- When individual vehicle state keys expire (after 300s of no updates), their IDs remain in the Set
- Queries like `getAllVehicleStates()` fetch the entire Set and attempt to read expired vehicle keys
- The `cleanupOldVehicles()` function has to manually iterate all stale IDs

### Impact

1. **Memory Growth**: Vehicle ID Set grows unbounded as vehicles are tracked over time
2. **Wasted Queries**: System queries Redis for vehicles that no longer exist (expired keys)
3. **Slower Performance**: `getAllVehicleStates()` wastes time on stale IDs
4. **State Inconsistency**: Frontend receives empty data for vehicles still in the Set but with expired state keys

## What Changes

**Implement automatic cleanup of vehicle IDs from the Set when their state keys expire, using Redis key expiration events.**

### Key Changes

1. **Remove Set-Level TTL**: Stop setting expiry on `vehicle_ids` Set - let it persist
2. **Per-Vehicle Cleanup**: Remove vehicle ID from Set when state key expires
3. **Keyspace Notifications**: Use Redis keyspace notifications to detect expired vehicle state keys
4. **Fallback Cleanup**: Enhance `cleanupOldVehicles()` to also remove stale IDs from Set
5. **Atomic Operations**: Use Redis transactions to ensure ID is removed when vehicle is deleted

### Implementation Approach

**Option 1: Keyspace Notifications (Preferred)**
- Subscribe to `__keyevent@0__:expired` notifications for vehicle state keys
- When a vehicle state key expires, automatically remove its ID from the Set
- Requires `notify-keyspace-events` config with `Ex` events enabled

**Option 2: Enhanced Manual Cleanup (Fallback)**
- Keep periodic `cleanupOldVehicles()` but improve it to remove IDs from Set
- Check if vehicle state key exists before including in results
- Add `sRem()` call when keys are found to be expired

**Chosen Approach: Hybrid**
- Implement **Option 2** (enhanced manual cleanup) for reliability
- Remove Set TTL entirely to prevent ID retention issues
- Add explicit `sRem()` when vehicles are cleaned up or deleted

## Modified Files

- `dashboard/src/lib/vehicle-tracking-redis.ts` - Fix TTL logic, enhance cleanup
- `openspec/specs/live-tracking/spec.md` - Update Redis TTL requirements

## Impact

- **Affected Specs**: `live-tracking`
- **Affected Code**: `VehicleTrackingRedis` class methods
- **User Impact**: Better performance, no visible behavior change
- **Breaking Changes**: None (internal implementation fix)

## Benefits

1. **Accurate State**: Vehicle ID Set matches actual tracked vehicles
2. **Better Performance**: No wasted queries for expired vehicles
3. **Memory Efficiency**: Automatic cleanup prevents unbounded growth
4. **Consistency**: Set membership reflects actual Redis state
5. **Reliability**: Cleanup works without external notification dependencies
