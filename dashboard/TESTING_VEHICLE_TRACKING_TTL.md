# Vehicle Tracking TTL Bug Fix - Testing Guide

This document describes how to test the vehicle tracking TTL bug fix.

## Overview

The TTL bug fix addresses the issue where vehicle IDs accumulate in the Redis Set even after their state keys expire, causing memory leaks and wasted queries.

## Running Tests

### Unit Tests

Unit tests are located in `src/__tests__/vehicle-tracking-ttl.test.ts` and use Jest with mocked Redis.

**Run unit tests:**
```bash
npm test vehicle-tracking-ttl.test.ts
```

**What is tested:**
- Vehicle state expires but ID remains in Set (orphaned ID detection)
- getAllVehicleStates() handles missing keys gracefully
- cleanupOldVehicles() removes orphaned IDs using EXISTS command
- deleteVehicle() removes both state and Set membership atomically
- Set TTL is NOT applied (verifies the fix)
- Multiple orphaned IDs in a single cleanup run
- Parse errors are handled gracefully
- Recent vehicles are not removed during cleanup

**Test coverage:**
- 30+ test cases
- All edge cases covered
- Mock Redis client for isolated testing

### Integration Tests

Integration tests use actual Redis and are located in `test-vehicle-tracking-ttl.js`.

**Prerequisites:**
- Redis server accessible at `REDIS_HOST:REDIS_PORT` (default: 192.168.1.71:6379)
- Node.js with `redis` package installed

**Run integration tests:**
```bash
node test-vehicle-tracking-ttl.js
```

**Set custom Redis connection:**
```bash
REDIS_HOST=localhost REDIS_PORT=6379 node test-vehicle-tracking-ttl.js
```

**What is tested:**
1. **Test 1:** Verify vehicle_ids Set has no TTL
2. **Test 2:** Simulate orphaned ID scenario (state expires, ID remains)
3. **Test 3:** Verify orphaned IDs can be cleaned up
4. **Test 4:** Test Set size stability with multiple operations
5. **Test 5:** Verify no memory leaks with 100 add/remove cycles

**Expected output:**
```
=== Vehicle Tracking TTL Bug Fix - Integration Tests ===

📝 Test 1: Verify vehicle_ids Set has no TTL
✅ PASS: vehicle_ids Set has no TTL (TTL: -1)
✅ PASS: Vehicle state has correct TTL: 300s

📝 Test 2: Simulate orphaned ID (state expires, ID remains)
✅ PASS: Detected 2 orphaned IDs: orphan-1, orphan-2

📝 Test 3: Verify orphaned IDs can be cleaned up
✅ PASS: Set cleaned up correctly. Remaining: active-1

📝 Test 4: Test Set size stability with multiple operations
✅ PASS: Set size stabilized at 6 (expected 6)

📝 Test 5: Verify no memory leaks with 100 add/remove cycles
✅ PASS: No memory leak. Set size stable at 6

=== Test Summary ===
✅ Passed: 6
Total: 6
```

### Performance Testing

For production validation, monitor the following metrics:

**1. Set Size Over Time**

Check Set size periodically:
```bash
redis-cli -h 192.168.1.71 -p 6379 SCARD "P1-center/tracking/vehicle_ids"
```

Expected: 20-50 IDs in digital twin mode, 5-10 IDs in real-time mode

**2. Orphaned ID Rate**

Monitor console logs for cleanup statistics:
```
🧹 Cleanup complete: 2 expired vehicles, 3 orphaned IDs removed. 45 vehicles remaining.
```

Expected: < 5 orphaned IDs per cleanup run after stabilization

**3. Hit/Miss Ratio**

Monitor batch get statistics:
```
📊 Batch get stats: 48 hits, 2 misses (96.0% hit rate)
```

Expected: > 95% hit rate after stabilization

**4. Memory Usage**

Track Redis memory over 24 hours:
```bash
redis-cli -h 192.168.1.71 -p 6379 INFO memory | grep used_memory_human
```

Expected: Stable memory usage (no unbounded growth)

## Manual Testing Scenarios

### Scenario 1: Orphaned ID Cleanup

1. Add vehicle to Set without state key:
```bash
redis-cli -h 192.168.1.71 -p 6379 SADD "test-device/tracking/vehicle_ids" "orphan-v1"
```

2. Run cleanup (via API or wait for periodic cleanup)

3. Verify ID is removed:
```bash
redis-cli -h 192.168.1.71 -p 6379 SMEMBERS "test-device/tracking/vehicle_ids"
```

Expected: `orphan-v1` should be removed

### Scenario 2: Set TTL Not Applied

1. Add vehicle state:
```bash
redis-cli -h 192.168.1.71 -p 6379 SADD "test-device/tracking/vehicle_ids" "test-v1"
redis-cli -h 192.168.1.71 -p 6379 HSET "test-device/tracking/vehicle/test-v1" targetId "test-v1"
redis-cli -h 192.168.1.71 -p 6379 EXPIRE "test-device/tracking/vehicle/test-v1" 300
```

2. Check TTLs:
```bash
redis-cli -h 192.168.1.71 -p 6379 TTL "test-device/tracking/vehicle_ids"
redis-cli -h 192.168.1.71 -p 6379 TTL "test-device/tracking/vehicle/test-v1"
```

Expected:
- Set TTL: `-1` (no expiry)
- State TTL: `~300` (5 minutes)

### Scenario 3: Cleanup Old Vehicles

1. Create vehicle with old timestamp (6+ minutes ago)
2. Run cleanup with 5-minute threshold
3. Verify vehicle is deleted and ID removed from Set

## Troubleshooting

### Unit Tests Fail

**Issue:** Jest tests fail with module resolution errors

**Solution:**
```bash
cd dashboard
npm install --save-dev @types/jest @types/node
```

### Integration Tests Fail

**Issue:** Cannot connect to Redis

**Solution:**
- Verify Redis is running: `redis-cli -h 192.168.1.71 -p 6379 ping`
- Check firewall settings
- Update REDIS_HOST and REDIS_PORT environment variables

**Issue:** Test data not cleaned up

**Solution:**
- Manually clean up test keys:
```bash
redis-cli -h 192.168.1.71 -p 6379 --scan --pattern "test-ttl-fix/*" | xargs redis-cli -h 192.168.1.71 -p 6379 DEL
```

### Performance Issues

**Issue:** High orphaned ID rate (> 10 per cleanup)

**Possible causes:**
- Redis network issues causing failed writes
- High TTL expiration rate
- Cleanup not running frequently enough

**Solution:**
- Check Redis connection stability
- Verify cleanup runs every 1 second
- Review console logs for error patterns

## Success Criteria

✅ **Unit tests:** All tests pass
✅ **Integration tests:** All 6 tests pass
✅ **Set size:** Remains bounded (< 100 IDs)
✅ **Hit rate:** > 95% after stabilization
✅ **Orphaned IDs:** < 5 per cleanup run
✅ **Memory:** No unbounded growth over 24 hours
✅ **Performance:** No degradation compared to baseline

## Additional Resources

- **Bug fix commit:** See git log for implementation details
- **OpenSpec proposal:** `openspec/changes/fix-vehicle-tracking-ttl-bug/proposal.md`
- **Design document:** `openspec/changes/fix-vehicle-tracking-ttl-bug/design.md`
- **Task tracking:** `openspec/changes/fix-vehicle-tracking-ttl-bug/tasks.md`
