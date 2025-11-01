## MODIFIED Requirements

### Requirement: Redis-Based Tracking Storage
The system SHALL store all vehicle tracking data in Redis instead of in-memory Maps to enable persistence, scalability, and multi-instance coordination. The system SHALL optimize Redis operations using batch operations and pipelines to minimize network round-trips and maximize performance.

#### Scenario: Vehicle state storage in Redis
- **WHEN** a vehicle is tracked via ObjectData processing
- **THEN** the vehicle state SHALL be stored in Redis Hash at key `{deviceId}/tracking/vehicle/{targetId}`
- **AND** the vehicle trajectory SHALL be stored in Redis List at key `{deviceId}/tracking/history/{targetId}`
- **AND** the vehicle ID SHALL be added to Redis Set at key `{deviceId}/tracking/vehicle_ids`
- **AND** all keys SHALL have TTL of 5 minutes (300 seconds)
- **AND** vehicle state storage SHALL use single `hSet()` call with object parameter (not multiple sequential calls)

#### Scenario: Vehicle state retrieval from Redis
- **WHEN** the system requests vehicle tracking data
- **THEN** it SHALL read vehicle states from Redis Hash structures
- **AND** it SHALL read vehicle trajectories from Redis Lists
- **AND** it SHALL query the vehicle IDs Set to enumerate all vehicles
- **AND** all operations SHALL be asynchronous
- **AND** bulk operations SHALL use Redis pipelines to minimize round-trips

#### Scenario: Batch vehicle processing optimization
- **WHEN** multiple vehicles are processed in a single ObjectData frame
- **THEN** the system SHALL batch fetch all vehicle states in a single pipeline operation
- **AND** the system SHALL batch fetch all vehicle histories in a single pipeline operation
- **AND** the system SHALL batch write all vehicle state updates in a single pipeline operation
- **AND** the system SHALL batch write all vehicle history updates in a single pipeline operation
- **AND** read and write operations SHALL execute in parallel using `Promise.all()`
- **AND** Redis operations SHALL be reduced from ~96-128 calls per frame to ~4-6 batch operations

#### Scenario: Performance optimization for getAllVehicleStates
- **WHEN** the system retrieves all vehicle states
- **THEN** it SHALL use Redis pipeline to fetch all vehicle hashes in parallel
- **AND** it SHALL NOT make sequential calls for each vehicle
- **AND** the operation SHALL complete in a single Redis round-trip

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
- **AND** batch operations SHALL maintain consistency across instances

#### Scenario: VehicleTracker async operations
- **WHEN** VehicleTracker methods are called
- **THEN** `processObjectData()` SHALL be async and return Promise<TrackingUpdate>
- **AND** `processObjectData()` SHALL use batch operations to minimize Redis calls
- **AND** `getTrackingData()` SHALL be async and return Promise<VehicleTrackingData>
- **AND** `getVehicle()` SHALL be async and return Promise<VehicleState | undefined>
- **AND** `getVisibleVehicles()` SHALL be async and return Promise<VehicleState[]>
- **AND** all callers SHALL await these async operations
- **AND** performance SHALL be optimized by avoiding unnecessary curve calculations
- **AND** batch operations SHALL reduce Redis calls by 96-98% compared to sequential processing

