## ADDED Requirements

### Requirement: Radar Data Processing
The system SHALL process real-time radar data from ClairWav-T80 systems using Communication Protocol V2.1.

#### Scenario: Object Data processing
- **WHEN** Object Data packets (0x01) are received
- **THEN** the system processes 65 bytes per vehicle
- **AND** extracts vehicle position, speed, type, and lane assignment
- **AND** validates all parameters against defined ranges
- **AND** stores data in Redis with Radar04/* key pattern

#### Scenario: Lane Status processing
- **WHEN** Lane Status packets (0x04) are received
- **THEN** the system processes 32 bytes per lane
- **AND** extracts queue length, vehicle counts, and occupancy rates
- **AND** calculates average speeds and space occupancy
- **AND** stores lane-specific metrics in Redis

#### Scenario: Pass Data processing
- **WHEN** Pass Data packets (0x05) are received
- **THEN** the system processes 23 bytes per passing event
- **AND** extracts crossing speeds, headway times, and occupancy duration
- **AND** tracks vehicle movement through detection zones
- **AND** stores event data with timestamps

#### Scenario: Traffic Data processing
- **WHEN** Traffic Data packets (0x03) are received
- **THEN** the system processes 50 bytes per statistical entry
- **AND** extracts vehicle type flow counts and aggregate metrics
- **AND** calculates traffic density and virtual loop occupancy
- **AND** stores statistical data for 1-minute intervals

#### Scenario: Region Data processing
- **WHEN** Region Data packets (0x02) are received
- **THEN** the system processes 12 bytes per region
- **AND** extracts turn movement percentages (left, straight, right)
- **AND** calculates directional traffic patterns
- **AND** stores turn statistics for signal optimization

### Requirement: Data Validation
The system SHALL validate all radar data against parameter ranges and quality standards.

#### Scenario: Speed validation
- **WHEN** vehicle speeds are received from radar
- **THEN** speeds are validated to be within 0-200 km/h range
- **AND** unreasonable speeds are filtered out
- **AND** speed conversion from m/s to km/h is accurate to 0.1 km/h

#### Scenario: Position validation
- **WHEN** vehicle positions are received
- **THEN** X and Y coordinates are validated within radar detection range
- **AND** positions are stored with 0.1m resolution
- **AND** invalid positions are flagged for review

#### Scenario: Lane assignment validation
- **WHEN** lane assignments are received
- **THEN** lanes are validated against known configurations (11, 12, 13, 485)
- **AND** unknown lane configurations are flagged
- **AND** lane-specific data is properly categorized

### Requirement: Real-time Data Storage
The system SHALL store radar data in Redis with appropriate data structures and TTL values.

#### Scenario: Redis data storage
- **WHEN** radar data is processed
- **THEN** data is stored in Redis at 192.168.6.22:6379
- **AND** keys follow Radar04/* pattern for organization
- **AND** appropriate TTL values are set for data retention
- **AND** data structures are optimized for real-time queries

#### Scenario: Data retrieval performance
- **WHEN** dashboard requests current traffic data
- **THEN** data is retrieved from Redis in sub-second latency
- **AND** real-time updates are available via WebSocket
- **AND** historical data is accessible for trend analysis

### Requirement: Error Handling
The system SHALL handle radar data errors and connection issues gracefully.

#### Scenario: Data corruption handling
- **WHEN** corrupted radar packets are received
- **THEN** the system logs the error and discards invalid data
- **AND** continues processing valid packets
- **AND** alerts are generated for persistent data quality issues

#### Scenario: Connection loss handling
- **WHEN** radar connection is lost
- **THEN** the system maintains last known good data
- **AND** alerts traffic engineers to connection issues
- **AND** automatic reconnection is attempted
