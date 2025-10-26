# radar-processing Specification Delta

## MODIFIED Requirements

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

## ADDED Requirements

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

## Change Summary
- **Modified 2 existing requirements** to include correct vehicle type mapping
- **Added 3 new requirements** for protocol compliance and validation
- **Added 8 new scenarios** covering protocol adherence, validation, and documentation
- **Key Change**: Code 0x06 (6) now correctly maps to "car" per official protocol
