# Tasks: Fix Vehicle Tracking TTL Bug

## Implementation Tasks

- [x] **Remove vehicle_ids Set TTL logic**
  - ✅ Removed `client.expire(this.getVehicleIdsKey(), 300)` from `setVehicleState()` (line 72)
  - ✅ Removed `pipeline.expire(vehicleIdsKey, 300)` from `batchSetVehicleStates()` (line 108)
  - ✅ Set now persists indefinitely, with individual IDs being removed explicitly

- [x] **Enhance deleteVehicle() to ensure ID removal**
  - ✅ Verified `sRem()` is called to remove vehicle ID from Set (line 352)
  - ✅ Added error handling with throw on failure
  - ✅ Added logging for successful vehicle deletions (line 355)

- [x] **Fix cleanupOldVehicles() to remove stale IDs**
  - ✅ Enhanced to scan for orphaned vehicles in Set that don't have state keys
  - ✅ Uses `EXISTS` command to check if vehicle state key exists (line 378)
  - ✅ Removes orphaned IDs from Set even if state key is missing (lines 380-385)
  - ✅ Added detailed logging for cleanup statistics (lines 396-399)

- [x] **Add defensive checks in getAllVehicleStates()**
  - ✅ Filters out null/empty results from pipeline execution (lines 171-173)
  - ✅ Only includes vehicles with valid state data
  - ✅ Logs orphaned IDs and removes them asynchronously (lines 192-196)
  - ✅ Added helper method `removeOrphanedIds()` (lines 208-220)

- [x] **Add defensive checks in batchGetVehicleStates()**
  - ✅ Filters out null/empty results from expired keys (lines 250-252)
  - ✅ Only returns vehicles with valid state data
  - ✅ Tracks hit/miss ratio for monitoring (lines 242-275)

- [x] **Add test coverage for TTL edge cases**
  - ✅ Created comprehensive unit tests in `src/__tests__/vehicle-tracking-ttl.test.ts`
  - ✅ Test: Vehicle state expires but ID remains in Set
  - ✅ Test: getAllVehicleStates() handles missing keys gracefully
  - ✅ Test: cleanupOldVehicles() removes orphaned IDs
  - ✅ Test: deleteVehicle() removes both state and Set membership
  - ✅ Test: Set TTL is not applied (verifies the fix)
  - ✅ Added 30+ test cases covering all edge cases

- [x] **Update live-tracking spec**
  - ✅ Updated Redis TTL requirements to clarify Set vs individual key TTLs
  - ✅ Added scenarios for orphaned ID cleanup
  - ✅ Added scenarios for Set membership accuracy

- [x] **Performance testing**
  - ✅ Integration test includes Set size stability test
  - ✅ Integration test verifies no memory leaks (100 cycles)
  - ✅ Unit tests verify hit/miss ratio tracking
  - ⚠️ Extended duration testing (50+ vehicles, 10+ minutes): Recommended for production validation
  - ⚠️ Load testing under realistic traffic conditions: Recommended before deployment
  - Note: Performance metrics can be monitored via console logs in production

- [x] **Add monitoring/logging**
  - ✅ Logs when orphaned IDs are detected and removed (lines 216, 384)
  - ✅ Logs cleanup statistics (vehicles removed, IDs cleaned) (lines 396-399)
  - ✅ Tracks hit/miss ratio in batch operations (lines 272-274)

## Validation Tasks

- [x] **Validate proposal with openspec**
  - ✅ Ran `openspec validate fix-vehicle-tracking-ttl-bug --strict`
  - ✅ Validation passed

- [x] **Code review**
  - ✅ Reviewed all changes for correctness
  - ✅ Verified no breaking changes
  - ✅ Checked error handling

- [x] **Integration testing**
  - ✅ Created integration test script `test-vehicle-tracking-ttl.js`
  - ✅ Tests with actual Redis connection
  - ✅ Verifies Set TTL is not set
  - ✅ Verifies orphaned ID detection and cleanup
  - ✅ Verifies Set size stability over time
  - ✅ Verifies no memory leaks with 100 add/remove cycles
  - ✅ Can be run manually: `node test-vehicle-tracking-ttl.js`
  - ⚠️ Live radar data testing: Requires production environment

- [x] **Documentation**
  - ✅ Updated code comments with TTL behavior (lines 71, 104, 145, 225, 365)
  - ✅ Documented cleanup logic in cleanupOldVehicles()
  - ✅ Added inline documentation for edge cases
