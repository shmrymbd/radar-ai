# live-tracking Specification Delta

## MODIFIED Requirements

### Requirement: Redis-Based Tracking Storage
The system SHALL store all vehicle tracking data in Redis instead of in-memory Maps to enable persistence, scalability, and multi-instance coordination, with proper TTL management to prevent stale data accumulation.

#### Scenario: Vehicle state storage in Redis
- **WHEN** a vehicle is tracked via ObjectData processing
- **THEN** the vehicle state SHALL be stored in Redis Hash at key `{deviceId}/tracking/vehicle/{targetId}`
- **AND** the vehicle trajectory SHALL be stored in Redis List at key `{deviceId}/tracking/history/{targetId}`
- **AND** the vehicle ID SHALL be added to Redis Set at key `{deviceId}/tracking/vehicle_ids`
- **AND** vehicle state and history keys SHALL have TTL of 5 minutes (300 seconds)
- **AND** the vehicle IDs Set SHALL persist indefinitely without TTL ⚡ CHANGED

#### Scenario: Automatic cleanup of stale vehicles
- **WHEN** vehicles have not been updated for 5 minutes
- **THEN** Redis TTL SHALL automatically expire the vehicle state keys
- **AND** the cleanup process SHALL remove expired vehicle IDs from the vehicle IDs Set ⚡ CHANGED
- **AND** the cleanup SHALL detect orphaned IDs (in Set but no state key) ⚡ ADDED
- **AND** memory usage SHALL remain bounded

#### Scenario: Vehicle state retrieval with orphan filtering ⚡ ADDED
- **WHEN** the system requests all vehicle tracking data
- **THEN** it SHALL read vehicle states from Redis Hash structures
- **AND** it SHALL filter out null/empty results from expired keys
- **AND** it SHALL detect orphaned vehicle IDs in the Set
- **AND** it SHALL asynchronously remove orphaned IDs from the Set
- **AND** it SHALL return only vehicles with valid state data

## ADDED Requirements

### Requirement: Vehicle ID Set Management ⚡ NEW
The system SHALL maintain accurate vehicle ID Set membership by explicitly removing IDs when vehicles expire or are deleted.

#### Scenario: Orphaned ID detection
- **WHEN** `getAllVehicleStates()` is called
- **THEN** the system SHALL fetch all vehicle IDs from the Set
- **AND** it SHALL query state keys for each ID
- **AND** it SHALL detect IDs with missing/expired state keys
- **AND** it SHALL collect orphaned IDs for cleanup

#### Scenario: Orphaned ID cleanup
- **WHEN** orphaned vehicle IDs are detected
- **THEN** they SHALL be removed from the vehicle IDs Set asynchronously
- **AND** the removal SHALL use Redis pipeline for batch operations
- **AND** the cleanup SHALL not block the response to the caller
- **AND** successful cleanup SHALL be logged with count of removed IDs

#### Scenario: Enhanced periodic cleanup
- **WHEN** `cleanupOldVehicles()` runs periodically
- **THEN** it SHALL check if each vehicle state key exists using Redis EXISTS
- **AND** it SHALL remove orphaned IDs from the Set before checking vehicle age
- **AND** it SHALL remove vehicles older than the configured max age
- **AND** it SHALL log the number of vehicles and orphaned IDs removed
- **AND** the cleanup SHALL run every 1 second for timely removal

#### Scenario: Vehicle deletion atomicity
- **WHEN** a vehicle is explicitly deleted via `deleteVehicle()`
- **THEN** it SHALL remove the vehicle state key
- **AND** it SHALL remove the vehicle history key
- **AND** it SHALL remove the vehicle ID from the Set
- **AND** all three operations SHALL complete successfully or log errors

#### Scenario: Set size stability
- **WHEN** vehicles are tracked over extended periods (hours)
- **THEN** the vehicle IDs Set size SHALL remain bounded to active vehicles
- **AND** the Set SHALL not grow unbounded with stale IDs
- **AND** Set size SHALL be ~20-50 IDs in digital twin mode
- **AND** Set size SHALL be ~5-10 IDs in real-time mode

#### Scenario: Query performance optimization
- **WHEN** `getAllVehicleStates()` is called repeatedly
- **THEN** wasted queries for expired vehicles SHALL be < 1%
- **AND** query performance SHALL remain constant over time
- **AND** the system SHALL not degrade as more vehicles are tracked
- **AND** defensive filtering SHALL prevent errors from stale IDs
