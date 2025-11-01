# Tasks: Fix Vehicle Tracking TTL Bug

## Implementation Tasks

- [ ] **Remove vehicle_ids Set TTL logic**
  - Remove `client.expire(this.getVehicleIdsKey(), 300)` from `setVehicleState()` (line 73)
  - Remove `pipeline.expire(vehicleIdsKey, 300)` from `batchSetVehicleStates()` (line 110)
  - The Set should persist indefinitely, with individual IDs being removed explicitly

- [ ] **Enhance deleteVehicle() to ensure ID removal**
  - Verify `sRem()` is called to remove vehicle ID from Set (line 353)
  - Add error handling for failed Set removal
  - Add logging for successful vehicle deletions

- [ ] **Fix cleanupOldVehicles() to remove stale IDs**
  - Currently checks vehicle `lastSeen` and calls `deleteVehicle()` (lines 362-377)
  - Enhance to also scan for vehicles in Set that don't have state keys
  - Use `EXISTS` command to check if vehicle state key exists
  - Remove orphaned IDs from Set even if state key is missing

- [ ] **Add defensive checks in getAllVehicleStates()**
  - Filter out null/empty results from pipeline execution (lines 168-184)
  - Only include vehicles with valid state data
  - Log warnings for vehicles in Set but missing state keys

- [ ] **Add defensive checks in batchGetVehicleStates()**
  - Filter out null/empty results from pipeline execution (lines 212-230)
  - Only return vehicles with valid state data
  - Track hit/miss ratio for monitoring

- [ ] **Add test coverage for TTL edge cases**
  - Test: Vehicle state expires but ID remains in Set
  - Test: getAllVehicleStates() handles missing keys gracefully
  - Test: cleanupOldVehicles() removes orphaned IDs
  - Test: deleteVehicle() removes both state and Set membership

- [ ] **Update live-tracking spec**
  - Update Redis TTL requirements to clarify Set vs individual key TTLs
  - Add scenario for orphaned ID cleanup
  - Add scenario for Set membership accuracy

- [ ] **Performance testing**
  - Test with 50+ vehicles over 10+ minute period
  - Verify Set size remains bounded
  - Verify no performance degradation from stale ID lookups
  - Measure cleanup effectiveness

- [ ] **Add monitoring/logging**
  - Log when orphaned IDs are detected and removed
  - Track Set size growth over time
  - Log cleanup statistics (vehicles removed, IDs cleaned)

## Validation Tasks

- [ ] **Validate proposal with openspec**
  - Run `openspec validate fix-vehicle-tracking-ttl-bug --strict`
  - Fix any validation errors

- [ ] **Code review**
  - Review all changes for correctness
  - Verify no breaking changes
  - Check error handling

- [ ] **Integration testing**
  - Test with live radar data
  - Test with simulated vehicle data
  - Verify cleanup runs correctly
  - Verify no memory leaks

- [ ] **Documentation**
  - Update code comments with TTL behavior
  - Document cleanup logic
  - Add inline documentation for edge cases
