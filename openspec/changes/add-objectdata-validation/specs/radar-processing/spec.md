## MODIFIED Requirements

### Requirement: Data Validation
The system SHALL validate all radar data against parameter ranges and quality standards, including structural validation of ObjectData entries arrays to prevent runtime errors.

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

#### Scenario: ObjectData structure validation
- **WHEN** ObjectData (0x01) packets are received or retrieved from storage
- **THEN** the system SHALL validate that the `entries` property exists and is an array
- **AND** if `entries` is missing or invalid, the system SHALL default to an empty array
- **AND** the system SHALL log a warning for invalid ObjectData structure
- **AND** the system SHALL continue processing without crashing
- **AND** when storing ObjectData, the system SHALL validate `numEntries` matches `entries.length` and log a warning if mismatched

#### Scenario: ObjectData entries validation
- **WHEN** ObjectData is converted or processed
- **THEN** the system SHALL ensure `entries` is an array before accessing array methods
- **AND** if `entries` is null, undefined, or not an array, the system SHALL treat it as an empty array
- **AND** the system SHALL log validation errors for debugging
- **AND** processing SHALL continue gracefully with empty entries array

## ADDED Requirements

### Requirement: ObjectData Type Consistency
The system SHALL maintain consistency between declared TypeScript types and actual runtime data formats for ObjectData.

#### Scenario: Type annotation accuracy
- **WHEN** ObjectData is retrieved from Redis
- **THEN** type annotations SHALL match the actual data format stored in Redis
- **AND** methods returning ObjectData SHALL use `ObjectData[]` type, not `ProcessedObjectData[]`
- **AND** type mismatches SHALL be identified and corrected during development

#### Scenario: Runtime type compatibility
- **WHEN** code expects ObjectData structure
- **THEN** runtime data SHALL match the expected ObjectData interface
- **AND** conversion between ObjectData and ProcessedObjectData SHALL be explicit and validated
- **AND** type errors SHALL not occur at runtime due to structural mismatches

