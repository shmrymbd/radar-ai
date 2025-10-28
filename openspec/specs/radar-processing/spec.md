# radar-processing Specification

## Purpose
TBD - created by archiving change add-traffic-signal-dashboard. Update Purpose after archive.
## Requirements
### Requirement: Radar Data Processing
The system SHALL process real-time radar data from ClairWav-T80 systems using **Communication Protocol V2.1 with correct vehicle type mapping per Section 2.2.2**.

#### Scenario: Object Data processing
- **WHEN** Object Data packets (0x01) are received
- **THEN** the system processes 65 bytes per vehicle
- **AND** extracts vehicle position, speed, type, and lane assignment
- **AND** **maps vehicle type codes using the official protocol mapping (code 6 = "car", not "motorcycle")**
- **AND** validates all parameters against defined ranges
- **AND** stores data in Redis with Radar04/* key pattern

#### Scenario: Vehicle Type Code Mapping
- **WHEN** vehicle type codes are extracted from radar packets
- **THEN** the system uses the official ClairWav Communication Protocol V2.1 mapping
- **AND** code 0x00 (0) maps to "other"
- **AND** code 0x01 (1) maps to "bicycle"
- **AND** code 0x02 (2) maps to "motorcycle"
- **AND** code 0x03 (3) maps to "tricycle"
- **AND** code 0x04 (4) maps to "bus"
- **AND** code 0x05 (5) maps to "van"
- **AND** **code 0x06 (6) maps to "car"** (PRIMARY VEHICLE TYPE)
- **AND** code 0x07 (7) maps to "suv"
- **AND** code 0x08 (8) maps to "large_truck"
- **AND** code 0x09 (9) maps to "medium_truck"
- **AND** code 0x0A (10) maps to "light_truck"
- **AND** code 0x0B (11) maps to "dangerous_goods"
- **AND** code 0x0C (12) maps to "engineering_vehicle"
- **AND** code 0x0D (13) maps to "pedestrian"
- **AND** code 0x0E (14) maps to "medium_bus"

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
The system SHALL store radar data in Redis with appropriate data structures and TTL values using consistent key patterns.

#### Scenario: Redis data storage
- **WHEN** radar data is processed
- **THEN** data is stored in Redis at 192.168.1.71:6379
- **AND** uses consistent key patterns: `deviceId/passdata` (lowercase, slash separator)
- **AND** pub/sub channels use pattern: `deviceId/passdata:new`
- **AND** keyspace notifications use pattern: `__keyspace@0__:deviceId/passdata`
- **AND** stream keys use pattern: `deviceId/passdata:stream`

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
The system SHALL process PassData (0x05) packets to extract vehicle classification information **using the official protocol vehicle type mapping** and generate real-time classification analytics for traffic engineers.

#### Scenario: Vehicle Classification Extraction
- **WHEN** PassData (0x05) packets are received from radar systems
- **THEN** the system extracts vehicle type information from the vehicleType field
- **AND** **uses the same vehicle type mapping as ObjectData for consistency**
- **AND** processes cross-section speed and position data for classification analysis
- **AND** calculates vehicle size and behavior metrics for classification
- **AND** stores classification data in Redis with appropriate TTL

#### Scenario: Classification Data Consistency
- **WHEN** vehicle classification data is processed from any packet type
- **THEN** the system uses a single source of truth for vehicle type mapping
- **AND** ObjectData (0x01) and PassData (0x05) show consistent vehicle types
- **AND** classification metrics align with real-time tracking data
- **AND** all 15 vehicle types (0-14) are supported across all systems

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

### Requirement: Historical Data Aggregation
The system SHALL aggregate PassData classification information into 15-minute intervals and store historical data in MongoDB for long-term analysis and charting capabilities.

#### Scenario: 15-minute Data Aggregation
- **WHEN** PassData (0x05) packets are processed for classification
- **THEN** the system aggregates vehicle classification data into 15-minute time slots
- **AND** aggregated data includes vehicle type counts, lane utilization, and speed analysis
- **AND** aggregation process maintains data accuracy and consistency
- **AND** aggregated data is stored in MongoDB with proper indexing for efficient retrieval

#### Scenario: Historical Data Storage
- **WHEN** 15-minute aggregated classification data is ready
- **THEN** the system stores data in MongoDB with structured schema
- **AND** data includes timestamp, device ID, vehicle type distribution, and performance metrics
- **AND** storage process handles data validation and error recovery
- **AND** MongoDB collections are optimized for historical data queries

#### Scenario: Data Archival Process
- **WHEN** real-time classification data accumulates in Redis
- **THEN** the system periodically archives data to MongoDB for historical storage
- **AND** archival process maintains data integrity and consistency
- **AND** archived data is properly indexed for efficient historical queries
- **AND** process handles large data volumes without impacting real-time performance

### Requirement: Historical Data API
The system SHALL provide API endpoints for retrieving historical classification data with time-based filtering and efficient querying capabilities.

#### Scenario: Historical Data Retrieval API
- **WHEN** API requests are made for historical classification data
- **THEN** the system returns aggregated data from MongoDB
- **AND** API supports time-based filtering (24hrs, yesterday, month)
- **AND** data retrieval is optimized for large historical datasets
- **AND** API maintains sub-second response times for common queries

#### Scenario: Time-based Data Filtering
- **WHEN** historical data requests include time period filters
- **THEN** the system efficiently queries MongoDB for the specified time range
- **AND** filtering supports multiple time period formats and ranges
- **AND** query results are properly formatted for chart visualization
- **AND** filtering process maintains data accuracy and completeness

#### Scenario: Data Export API
- **WHEN** historical data export is requested
- **THEN** the system provides data in multiple formats (CSV, JSON, PDF)
- **AND** exported data includes aggregated metrics for the specified time period
- **AND** export process handles large datasets efficiently
- **AND** exported data maintains proper formatting and data integrity

### Requirement: Vehicle Type Protocol Compliance
The system SHALL maintain strict compliance with ClairWav Communication Protocol V2.1 (Section 2.2.2) for all vehicle type classification and processing.

#### Scenario: Protocol Version Verification
- **WHEN** radar data is received from ClairWav-T80LC systems
- **THEN** the system verifies it uses Communication Protocol V2.1
- **AND** applies the Video Integrated Radar Models vehicle type mapping
- **AND** rejects or flags data using incorrect protocol versions

#### Scenario: Single Source of Truth
- **WHEN** vehicle type mappings are needed in code
- **THEN** all components reference the official VEHICLE_TYPE_MAP in src/types/classification.ts
- **AND** no custom or conflicting mappings exist in the codebase
- **AND** protocol reference comments cite Section 2.2.2

#### Scenario: Protocol Documentation
- **WHEN** developers work with vehicle type data
- **THEN** comprehensive protocol documentation is available in dashboard/VEHICLE_TYPE_PROTOCOL.md
- **AND** documentation includes complete 15-type mapping table
- **AND** usage examples for code→name and name→code conversion are provided
- **AND** historical incorrect mappings are documented for reference

### Requirement: Vehicle Type Code Validation
The system SHALL validate vehicle type codes against the official protocol specification and handle invalid codes gracefully.

#### Scenario: Valid Vehicle Type Processing
- **WHEN** vehicle type codes 0-14 are received
- **THEN** the system correctly maps them to vehicle type names
- **AND** processes the data normally
- **AND** includes the vehicle in classification metrics

#### Scenario: Invalid Vehicle Type Handling
- **WHEN** vehicle type codes outside 0-14 range are received
- **THEN** the system maps them to "other" (code 0) as default
- **AND** logs a warning about invalid vehicle type code
- **AND** continues processing without disruption
- **AND** tracks invalid code occurrences for debugging

#### Scenario: Missing Vehicle Type Data
- **WHEN** vehicle type data is missing or corrupted
- **THEN** the system defaults to "other" classification
- **AND** flags the data quality issue
- **AND** maintains system stability

---

