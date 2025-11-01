# Design: Fix Vehicle Tracking TTL Bug

## Problem Analysis

### Current Behavior (Buggy)

```
Time T=0s:  Vehicle A tracked
            ├─ Set key: P1-center/tracking/vehicle_ids = {A}  [TTL: 300s]
            ├─ State key: P1-center/tracking/vehicle/A = {...} [TTL: 300s]
            └─ History key: P1-center/tracking/history/A = [...] [TTL: 300s]

Time T=30s: Vehicle B tracked
            ├─ Set key: P1-center/tracking/vehicle_ids = {A, B}  [TTL: 300s] ⚡ RESET
            ├─ State key: P1-center/tracking/vehicle/B = {...} [TTL: 300s]
            └─ History key: P1-center/tracking/history/B = [...] [TTL: 300s]

Time T=305s: Vehicle A state key expires (no updates since T=0s)
             ├─ State key: P1-center/tracking/vehicle/A = EXPIRED ❌
             ├─ History key: P1-center/tracking/history/A = EXPIRED ❌
             └─ Set key: P1-center/tracking/vehicle_ids = {A, B} ❌ STILL CONTAINS A!

Time T=330s: getAllVehicleStates() called
             ├─ Reads Set: {A, B}
             ├─ Queries vehicle A state: null (expired) ⚠️ WASTED QUERY
             ├─ Queries vehicle B state: {...} ✅
             └─ Returns only B, but wasted time on A
```

**Problem**: The Set retains vehicle ID "A" even though its state key expired. This causes:
1. Wasted Redis queries for expired vehicles
2. Set grows unbounded over time
3. Performance degradation as more stale IDs accumulate

### Root Cause

**Lines 73, 110** in `vehicle-tracking-redis.ts`:
```typescript
await client.expire(this.getVehicleIdsKey(), 300);
```

Every time a vehicle is added/updated, the Set's TTL resets to 300s. This prevents the Set from expiring as long as traffic exists, but individual vehicle IDs are never removed when their state keys expire.

## Proposed Solution

### Option 1: Remove Set TTL + Explicit ID Cleanup (CHOSEN)

**Philosophy**: The Set is a lightweight index (~1KB per 100 vehicles). It's better to keep it indefinitely and explicitly remove IDs when vehicles are deleted/expired.

#### Implementation

```typescript
// 1. Remove Set TTL (lines 73, 110)
await client.sAdd(this.getVehicleIdsKey(), targetId);
// ❌ REMOVE: await client.expire(this.getVehicleIdsKey(), 300);
```

```typescript
// 2. Enhance cleanupOldVehicles() to remove stale IDs
public async cleanupOldVehicles(maxAge: number = 300000): Promise<void> {
  try {
    const client = await getRedisClient();
    const vehicleIds = await client.sMembers(this.getVehicleIdsKey());
    const cutoffTime = new Date(Date.now() - maxAge);
    let removedCount = 0;

    for (const targetId of vehicleIds) {
      // Check if state key exists
      const stateKey = this.getVehicleStateKey(targetId);
      const exists = await client.exists(stateKey);

      if (!exists) {
        // Orphaned ID - remove from Set
        await client.sRem(this.getVehicleIdsKey(), targetId);
        removedCount++;
        console.log(`🧹 Removed orphaned vehicle ID: ${targetId}`);
        continue;
      }

      // Check if vehicle is too old
      const vehicle = await this.getVehicleState(targetId);
      if (vehicle && vehicle.lastSeen < cutoffTime) {
        await this.deleteVehicle(targetId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} stale vehicles`);
    }
  } catch (error) {
    console.error('Error cleaning up old vehicles:', error);
  }
}
```

```typescript
// 3. Add defensive filtering in getAllVehicleStates()
public async getAllVehicleStates(): Promise<VehicleState[]> {
  try {
    const client = await getRedisClient();
    const vehicleIds = await client.sMembers(this.getVehicleIdsKey());

    if (vehicleIds.length === 0) {
      return [];
    }

    // Batch fetch all states
    const pipeline = client.multi();
    for (const targetId of vehicleIds) {
      pipeline.hGetAll(this.getVehicleStateKey(targetId));
    }

    const results = await pipeline.exec();
    const vehicles: VehicleState[] = [];
    const orphanedIds: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const data = results[i] as Record<string, string> | null;
      const targetId = vehicleIds[i];

      // Filter out null/empty results (expired keys)
      if (!data || Object.keys(data).length === 0) {
        orphanedIds.push(targetId);
        continue;
      }

      try {
        vehicles.push({
          targetId: data.targetId,
          position: JSON.parse(data.position),
          trajectory: JSON.parse(data.trajectory || '[]'),
          isVisible: data.isVisible === '1',
          lastSeen: new Date(data.lastSeen),
          enterTime: new Date(data.enterTime)
        });
      } catch (parseError) {
        console.error(`Error parsing vehicle state for ${targetId}:`, parseError);
        orphanedIds.push(targetId);
      }
    }

    // Cleanup orphaned IDs asynchronously (don't block response)
    if (orphanedIds.length > 0) {
      this.removeOrphanedIds(orphanedIds).catch(err =>
        console.error('Error removing orphaned IDs:', err)
      );
    }

    return vehicles;
  } catch (error) {
    console.error('Error getting all vehicle states:', error);
    return [];
  }
}

// Helper method for async cleanup
private async removeOrphanedIds(targetIds: string[]): Promise<void> {
  const client = await getRedisClient();
  const pipeline = client.multi();
  for (const targetId of targetIds) {
    pipeline.sRem(this.getVehicleIdsKey(), targetId);
  }
  await pipeline.exec();
  console.log(`🧹 Removed ${targetIds.length} orphaned vehicle IDs from Set`);
}
```

### Option 2: Keyspace Notifications (Future Enhancement)

This option uses Redis keyspace notifications to automatically remove IDs when keys expire. **Not chosen** because:
- Requires additional Redis configuration (`notify-keyspace-events Ex`)
- Adds complexity with pub/sub subscriptions
- Manual cleanup is sufficient and more reliable

Could be added later as an optimization, but not required for the fix.

## Trade-offs

### Chosen Solution (Remove Set TTL + Cleanup)

**Pros:**
- ✅ Simple implementation
- ✅ No additional Redis configuration needed
- ✅ Reliable and deterministic
- ✅ Set size remains bounded through explicit cleanup
- ✅ Defensive filtering prevents errors from stale IDs

**Cons:**
- ⚠️ Small window where stale IDs may exist (between cleanup runs)
- ⚠️ Requires periodic cleanup calls (already in place)
- ⚠️ Adds overhead to getAllVehicleStates() for orphan detection

### Alternative (Keyspace Notifications)

**Pros:**
- ✅ Real-time ID removal when keys expire
- ✅ Zero stale IDs (instant cleanup)

**Cons:**
- ❌ Requires Redis config changes
- ❌ Pub/sub subscription overhead
- ❌ More complex implementation
- ❌ Potential for missed notifications

## Performance Impact

### Before Fix
- Set size: Unbounded growth (~100 IDs per hour → 2,400 IDs per day)
- Wasted queries: ~50-70% of getAllVehicleStates() queries hit expired keys
- Memory: ~2.4KB per day for stale IDs (small but unbounded)

### After Fix
- Set size: Bounded to active vehicles (~20-50 IDs in digital twin mode)
- Wasted queries: <1% (only between cleanup runs)
- Memory: Stable at ~0.5-1KB for Set
- Cleanup overhead: ~10-50ms per cleanup run (runs every 1s)

### Cleanup Frequency

Current cleanup runs every 1 second (from VehicleTracker):
```typescript
public async cleanupOldVehicles(maxAge: number = 300000): Promise<void>
```

This is sufficient to keep stale IDs minimal (< 1-5 stale IDs at any time).

## Migration Path

**No migration needed** - this is a bug fix that improves internal state management without changing external behavior.

Steps:
1. Deploy updated code
2. Existing Sets will continue to work
3. Cleanup will start removing orphaned IDs
4. Over time (< 5 minutes), all stale IDs will be cleaned up
5. Set will stabilize at correct size

## Testing Strategy

### Unit Tests
1. Test `cleanupOldVehicles()` removes orphaned IDs
2. Test `getAllVehicleStates()` filters out expired vehicles
3. Test `deleteVehicle()` removes ID from Set
4. Test `removeOrphanedIds()` helper method

### Integration Tests
1. Track 10 vehicles, wait for 5 minutes (TTL expiry)
2. Verify Set size shrinks to match active vehicles
3. Verify getAllVehicleStates() returns only active vehicles
4. Verify no performance degradation

### Load Tests
1. Track 100 vehicles over 30 minutes
2. Verify Set size remains bounded
3. Verify cleanup runs efficiently
4. Measure query performance (should be constant)

## Monitoring

Add logging to track:
- Number of orphaned IDs detected per cleanup run
- Set size over time
- Hit/miss ratio for vehicle state queries
- Cleanup duration

```typescript
console.log(`🧹 Cleanup: ${removedCount} vehicles removed, Set size: ${vehicleIds.length - removedCount}`);
```
