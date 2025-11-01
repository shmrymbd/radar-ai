## MODIFIED Requirements

### Requirement: Redis-Based Tracking Storage
The system SHALL store all vehicle tracking data in Redis instead of in-memory Maps to enable persistence, scalability, and multi-instance coordination, with validation to ensure ObjectData entries are valid before processing.

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
- **AND** performance SHALL be optimized by avoiding unnecessary curve calculations

#### Scenario: ObjectData validation for tracking
- **WHEN** ObjectData is received for vehicle tracking processing
- **THEN** `processObjectData()` SHALL validate that `objectData.entries` exists and is an array
- **AND** if `entries` is missing or invalid, `processObjectData()` SHALL return an empty TrackingUpdate without crashing
- **AND** the system SHALL log an error when ObjectData validation fails
- **AND** tracking operations SHALL continue processing other valid vehicles
- **AND** the system SHALL handle missing entries gracefully without disrupting live tracking visualization

#### Scenario: Curved road adaptation
- **WHEN** a road segment has curves (lateral variance > 0.2 meters)
- **THEN** lane separators SHALL smoothly follow the detected curve using Bezier curves
- **AND** curves SHALL be visually natural and avoid sharp kinks through Catmull-Rom spline interpolation
- **AND** the curve SHALL accurately represent actual traffic flow patterns from accumulated trail data
- **AND** curves SHALL be highly sensitive to subtle road bends (0.2m detection threshold)

