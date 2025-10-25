# radar-processing Specification

## Purpose
TBD - created by archiving change add-traffic-signal-dashboard. Update Purpose after archive.
## Requirements
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

#### Scenario: PassData Processing
- **WHEN** PassData packets (0x05) are received
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

### Requirement: PassData Processing
The existing PassData processing SHALL be enhanced to include comprehensive vehicle classification analysis and real-time counting capabilities.

#### Scenario: Enhanced PassData Processing
- **WHEN** PassData (0x05) packets are processed
- **THEN** the system extracts vehicle classification information
- **AND** calculates classification-specific metrics and statistics
- **AND** maintains real-time classification counters
- **AND** provides enhanced analytics for traffic engineering analysis

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

### Requirement: PassData Classification Processing
The system SHALL process PassData (0x05) packets to extract vehicle classification information and generate real-time classification analytics for traffic engineers.

#### Scenario: Vehicle Classification Extraction
- **WHEN** PassData (0x05) packets are received from radar systems
- **THEN** the system extracts vehicle type information from the vehicleType field
- **AND** processes cross-section speed and position data for classification analysis
- **AND** calculates vehicle size and behavior metrics for classification
- **AND** stores classification data in Redis with appropriate TTL

#### Scenario: Real-time Classification Analytics
- **WHEN** PassData packets are processed for classification
- **THEN** the system calculates real-time vehicle type distributions
- **AND** computes speed analysis by vehicle classification
- **AND** generates lane-specific classification metrics
- **AND** updates classification counters and statistics

#### Scenario: Historical Classification Storage
- **WHEN** PassData classification data is processed
- **THEN** the system stores historical classification metrics in Redis
- **AND** maintains time-based aggregation for different analysis periods
- **AND** implements data archival and cleanup strategies
- **AND** provides efficient retrieval for historical analysis

### Requirement: Vehicle Counting and Metrics
The system SHALL provide comprehensive vehicle counting capabilities with time-based aggregation and performance metrics for traffic analysis.

#### Scenario: Real-time Vehicle Counting
- **WHEN** PassData packets are processed for vehicle counting
- **THEN** the system maintains accurate vehicle counts by type and lane
- **AND** calculates headway times and occupancy durations by vehicle type
- **AND** tracks vehicle speed distributions and violations
- **AND** provides sub-second updates for real-time counting

#### Scenario: Time-based Aggregation
- **WHEN** vehicle counting data is aggregated over time
- **THEN** the system provides 1-minute, 15-minute, hourly, and daily aggregations
- **AND** calculates peak hour analysis by vehicle type
- **AND** generates traffic composition reports
- **AND** maintains efficient storage and retrieval for historical data

#### Scenario: Performance Metrics Calculation
- **WHEN** vehicle classification data is analyzed
- **THEN** the system calculates traffic flow rates by vehicle type
- **AND** computes lane utilization and efficiency metrics
- **AND** generates speed violation analysis by classification
- **AND** provides intersection performance indicators

### Requirement: Classification Data API
The system SHALL provide RESTful API endpoints for retrieving vehicle classification data with filtering, aggregation, and real-time capabilities.

#### Scenario: Classification Data Retrieval
- **WHEN** API requests are made for classification data
- **THEN** the system returns vehicle type distributions and counts
- **AND** provides speed analysis and lane utilization data
- **AND** supports time-based filtering and aggregation
- **AND** maintains sub-second response times for real-time data

#### Scenario: Real-time Classification Streaming
- **WHEN** WebSocket connections are established for classification data
- **THEN** the system streams real-time classification updates
- **AND** provides live vehicle counting and distribution data
- **AND** maintains stable connections with automatic reconnection
- **AND** handles multiple concurrent connections efficiently

#### Scenario: Historical Data Access
- **WHEN** historical classification data is requested
- **THEN** the system retrieves aggregated data from Redis storage
- **AND** provides efficient querying for different time periods
- **AND** supports data export and reporting capabilities
- **AND** maintains data integrity and consistency

