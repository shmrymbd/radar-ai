# Implementation Tasks

## 1. Create Redis Storage Service
- [x] 1.1 Create `VehicleTrackingRedis` class
- [x] 1.2 Implement `setVehicleState()` using Redis Hash
- [x] 1.3 Implement `getVehicleState()` using Redis Hash
- [x] 1.4 Implement `getAllVehicleStates()` using Redis Set for vehicle IDs
- [x] 1.5 Implement `addToVehicleHistory()` using Redis List
- [x] 1.6 Implement `getVehicleHistory()` using Redis List
- [x] 1.7 Implement `deleteVehicle()` to remove state and history
- [x] 1.8 Implement `cleanupOldVehicles()` for TTL-based cleanup
- [x] 1.9 Implement `getVisibleVehicles()` filter
- [x] 1.10 Add device ID support for multi-device keys

## 2. Refactor VehicleTracker
- [x] 2.1 Remove in-memory Maps (vehicles, vehicleHistory)
- [x] 2.2 Add VehicleTrackingRedis dependency
- [x] 2.3 Make `processObjectData()` async and use Redis
- [x] 2.4 Make `getTrackingData()` async and use Redis
- [x] 2.5 Make `getVehicle()` async and use Redis
- [x] 2.6 Make `getVisibleVehicles()` async and use Redis
- [x] 2.7 Make `cleanupOldVehicles()` async and use Redis
- [x] 2.8 Add `setDeviceId()` method for device awareness
- [x] 2.9 Update constructor to accept deviceId

## 3. Update UnifiedWebSocketServer
- [x] 3.1 Update ObjectData callback to await `processObjectData()`
- [x] 3.2 Update tracking summary to await `getTrackingData()`
- [x] 3.3 Update `sendTrackingData()` to be async
- [x] 3.4 Update `get_vehicle_details` handler to await `getVehicle()`
- [x] 3.5 Update `get_visible_vehicles` handler to await `getVisibleVehicles()`
- [x] 3.6 Update fallback polling to await async methods
- [x] 3.7 Add device ID setting before processing

## 4. Update API Routes
- [x] 4.1 Update `/api/tracking` to await async methods
- [x] 4.2 Update `/api/tracking/vehicles` to await async methods
- [x] 4.3 Update `/api/tracking/vehicles/[targetId]` to await async methods
- [x] 4.4 Add device ID setting in all routes
- [x] 4.5 Update error handling for async operations

## 5. Documentation
- [x] 5.1 Create OpenSpec change proposal
- [x] 5.2 Update live-tracking specification
- [x] 5.3 Document Redis key structure
- [x] 5.4 Document TTL and cleanup behavior

## 6. Testing & Validation
- [x] 6.1 Verify no linter errors
- [x] 6.2 Verify Redis operations work correctly
- [x] 6.3 Verify device isolation (multi-device keys)
- [x] 6.4 Verify TTL expiration works
- [x] 6.5 Test async method calls throughout system
- [ ] 6.6 Integration testing with real Redis server
- [ ] 6.7 Performance testing (Redis latency impact)

