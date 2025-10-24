# dashboard Specification

## Purpose
TBD - created by archiving change add-traffic-signal-dashboard. Update Purpose after archive.
## Requirements
### Requirement: Real-time Traffic Dashboard
The system SHALL provide a real-time dashboard for traffic engineers to monitor and control traffic signals using radar data from ClairWav-T80 systems.

#### Scenario: Queue monitoring display
- **WHEN** a traffic engineer opens the dashboard
- **THEN** they see real-time queue lengths for all lanes (11, 12, 13, 485)
- **AND** queue lengths are displayed with 0.1m resolution
- **AND** data updates in real-time without page refresh

#### Scenario: Speed monitoring display
- **WHEN** vehicles are detected by the radar
- **THEN** their speeds are displayed in km/h with 0.1 km/h resolution
- **AND** average speeds are calculated and displayed per lane
- **AND** speed violations are highlighted when exceeding limits

#### Scenario: Vehicle classification display
- **WHEN** vehicles are detected
- **THEN** they are classified as car, van, SUV, or truck
- **AND** vehicle type counts are displayed per lane
- **AND** classification accuracy is maintained in real-time

### Requirement: Multi-lane Analysis
The system SHALL provide comprehensive analysis across multiple lanes for traffic optimization.

#### Scenario: Lane-specific metrics
- **WHEN** radar data is received for lanes 11, 12, 13, and 485
- **THEN** each lane displays separate metrics for queue length, speed, and occupancy
- **AND** lane-specific performance indicators are calculated
- **AND** comparative analysis between lanes is available

#### Scenario: Cross-lane correlation
- **WHEN** traffic conditions change in one lane
- **THEN** the system analyzes impact on adjacent lanes
- **AND** correlation patterns are displayed to traffic engineers
- **AND** recommendations for coordinated signal timing are provided

### Requirement: Performance Metrics Dashboard
The system SHALL display comprehensive performance metrics for traffic analysis.

#### Scenario: Occupancy rate monitoring
- **WHEN** vehicles occupy lanes
- **THEN** space occupancy rates are calculated and displayed
- **AND** time occupancy rates are calculated and displayed
- **AND** occupancy thresholds trigger alerts when exceeded

#### Scenario: Traffic flow analysis
- **WHEN** vehicles pass through detection zones
- **THEN** flow rates are calculated in vehicles per hour
- **AND** traffic density is calculated in vehicles per kilometer
- **AND** headway times between vehicles are measured and displayed

### Requirement: Signal Control Interface
The system SHALL provide interface for traffic engineers to adjust signal timing based on real-time data.

#### Scenario: Signal timing recommendations
- **WHEN** queue lengths exceed thresholds
- **THEN** the system recommends signal timing adjustments
- **AND** recommendations are based on turn movement percentages
- **AND** recommendations consider current traffic flow patterns

#### Scenario: Manual signal control
- **WHEN** a traffic engineer needs to override automatic recommendations
- **THEN** they can manually adjust signal phases
- **AND** all manual changes are logged with timestamps
- **AND** changes are validated against safety parameters

