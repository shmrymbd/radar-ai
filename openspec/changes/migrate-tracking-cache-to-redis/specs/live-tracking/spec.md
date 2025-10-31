# live-tracking Specification

## MODIFIED Requirements

### Requirement: Redis-Based Tracking Cache
The system SHALL store all vehicle tracking data in Redis instead of in-memory Maps to enable persistence, scalability, and multi-instance coordination.

#### Scenario: Vehicle state storage in Redis
- **WHEN** a vehicle is tracked via ObjectData processing
- **THEN** the vehicle state SHALL be stored in Redis Hash at key `{deviceId}/tracking/vehicle/{targetId}`
- **AND** the vehicle trajectory SHALL be stored in Redis List at key `{deviceId}/tracking/history/{targetId}`
- **AND** the vehicle ID SHALL be added to Redis Set at key `{deviceId}/tracking/vehicle_ids`
- **AND** all keys SHALL have TTL of 5 minutes (300 seconds)

#### Scenario: Vehicle state retrieval from Redis
- **WHEN** the system requests vehicle tracking data
- **THEN** it SHALL read vehicle states from Redis Hash structures
- **AND** it SHALL read vehicle trajectories from Redis Lists
- **AND** it SHALL query the vehicle IDs Set to enumerate all vehicles
- **AND** all operations SHALL be asynchronous

#### Scenario: Automatic cleanup of stale vehicles
- **WHEN** vehicles have not been updated for 5 minutes
- **THEN** Redis TTL SHALL automatically expire the vehicle state keys
- **AND** the cleanup process SHALL remove expired vehicles from the vehicle IDs Set
- **AND** memory usage SHALL remain bounded

#### Scenario: Multi-device tracking isolation
- **WHEN** tracking data is stored for different devices
- **THEN** Redis keys SHALL be prefixed with device ID: `{deviceId}/tracking/...`
- **AND** vehicle states for different devices SHALL be isolated
- **AND** queries SHALL filter by device ID via key prefix

#### Scenario: Persistent tracking across restarts
- **WHEN** the server restarts
- **THEN** tracking data in Redis SHALL remain available (until TTL expiration)
- **AND** tracking operations SHALL resume from Redis state
- **AND** no tracking data SHALL be lost (within 5-minute TTL window)

#### Scenario: Scalability across multiple instances
- **WHEN** multiple server instances process tracking data
- **THEN** all instances SHALL read from and write to the same Redis keys
- **AND** tracking state SHALL be consistent across instances
- **AND** instances SHALL not create duplicate vehicle states

#### Scenario: VehicleTracker async operations
- **WHEN** VehicleTracker methods are called
- **THEN** `processObjectData()` SHALL be async and return Promise<TrackingUpdate>
- **AND** `getTrackingData()` SHALL be async and return Promise<VehicleTrackingData>
- **AND** `getVehicle()` SHALL be async and return Promise<VehicleState | undefined>
- **AND** `getVisibleVehicles()` SHALL be async and return Promise<VehicleState[]>
- **AND** all callers SHALL await these async operations

## ADDED Requirements

### Requirement: VehicleTrackingRedis Service
The system SHALL provide a Redis-based storage service for vehicle tracking data.

#### Scenario: VehicleTrackingRedis initialization
- **WHEN** VehicleTrackingRedis is instantiated
- **THEN** it SHALL be a singleton instance
- **AND** it SHALL connect to Redis using `getRedisClient()`
- **AND** it SHALL support device ID configuration via `setDeviceId()`

#### Scenario: Redis key structure
- **WHEN** vehicle tracking data is stored
- **THEN** vehicle states SHALL use key pattern: `{deviceId}/tracking/vehicle/{targetId}`
- **AND** vehicle histories SHALL use key pattern: `{deviceId}/tracking/history/{targetId}`
- **AND** vehicle ID sets SHALL use key pattern: `{deviceId}/tracking/vehicle_ids`
- **AND** all keys SHALL follow device-scoped naming convention

