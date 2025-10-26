# dashboard Specification

## Purpose
The dashboard provides a real-time traffic monitoring and control interface for traffic engineers to manage traffic signals using radar data from ClairWav-T80 systems. The system supports multiple radar devices with dynamic device selection, real-time vehicle tracking, lane status monitoring, and comprehensive traffic analytics including vehicle classification and performance metrics.
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

### Requirement: Dashboard Navigation
The dashboard navigation SHALL include the Vehicle Classification tab and Video Streaming tab as primary navigation options alongside existing dashboard, lanes, and signal timing tabs.

#### Scenario: Enhanced Navigation Menu
- **WHEN** users access the main dashboard interface
- **THEN** the navigation menu includes the Vehicle Classification tab and Video Streaming tab
- **AND** provides clear visual indicators for active tab
- **AND** maintains responsive design for mobile and desktop views

### Requirement: Vehicle Classification Dashboard
The existing Vehicle Classification Dashboard SHALL be enhanced to include historical charting capabilities with time-based filtering and advanced visualization options.

#### Scenario: Enhanced Classification Dashboard
- **WHEN** traffic engineers access the Vehicle Classification tab
- **THEN** the dashboard includes both real-time and historical chart options
- **AND** users can switch between real-time and historical views
- **AND** historical charts display data from MongoDB with 15-minute aggregation
- **AND** charts support multiple visualization types including histograms and heatmaps

#### Scenario: Time Period Selection Interface
- **WHEN** traffic engineers want to analyze historical data
- **THEN** the interface provides easy selection of time periods (24hrs, yesterday, month)
- **AND** time period selection updates all charts and metrics
- **AND** interface maintains user preferences for default time periods
- **AND** selection process provides visual feedback and loading states

### Requirement: Vehicle Classification Navigation
The system SHALL integrate the Vehicle Classification tab into the main dashboard navigation with seamless access to classification analytics.

#### Scenario: Navigation Integration
- **WHEN** users access the main dashboard
- **THEN** the Vehicle Classification tab is visible in the navigation menu
- **AND** provides quick access to classification analytics
- **AND** maintains consistent navigation patterns with existing tabs

#### Scenario: Tab State Management
- **WHEN** users switch between dashboard tabs
- **THEN** the Vehicle Classification tab maintains its state and data
- **AND** preserves user preferences and filter settings
- **AND** provides smooth transitions between different views

### Requirement: Real-time Classification Updates
The system SHALL provide real-time updates for vehicle classification data using WebSocket connections with sub-second latency.

#### Scenario: Live Classification Updates
- **WHEN** new PassData (0x05) packets are received
- **THEN** the classification dashboard updates in real-time
- **AND** vehicle counts and distributions update immediately
- **AND** speed and lane utilization metrics refresh automatically

#### Scenario: WebSocket Connection Management
- **WHEN** WebSocket connections are established for classification data
- **THEN** the system maintains stable connections with automatic reconnection
- **AND** handles connection failures gracefully
- **AND** provides connection status indicators

### Requirement: Multi-Device Support
The system SHALL support multiple radar devices with dynamic device selection and seamless switching between different radar installations.

#### Scenario: Device Selection Interface
- **WHEN** users access the dashboard
- **THEN** they can select from available radar devices (test, Radar04, etc.)
- **AND** device selection updates all data sources and WebSocket connections
- **AND** the interface maintains backward compatibility with existing deployments

#### Scenario: Dynamic Data Switching
- **WHEN** users switch between radar devices
- **THEN** all dashboard data updates to reflect the selected device
- **AND** WebSocket connections switch to the selected device data
- **AND** system maintains performance with multiple device support
- **AND** device-specific data is properly isolated and managed

### Requirement: Historical Classification Charts
The system SHALL provide historical vehicle classification charts with time-based filtering and advanced visualization capabilities for traffic engineers to analyze long-term traffic patterns and intersection performance.

#### Scenario: Time-based Chart Selection
- **WHEN** traffic engineers access the Vehicle Classification tab
- **THEN** they can select from predefined time periods (24hrs, yesterday, month)
- **AND** charts update to display historical data for the selected period
- **AND** data is retrieved from MongoDB with 15-minute aggregation intervals
- **AND** charts render efficiently with large historical datasets

#### Scenario: Histogram Chart Visualization
- **WHEN** traffic engineers view historical classification data
- **THEN** the system displays histogram charts showing vehicle type distribution over time
- **AND** histograms show traffic patterns and peak periods clearly
- **AND** charts support interactive features like zoom and pan
- **AND** data points represent 15-minute aggregated classification metrics

#### Scenario: Advanced Infographic Display
- **WHEN** traffic engineers analyze historical traffic data
- **THEN** the system provides multiple chart types including heatmaps, trend lines, and comparative charts
- **AND** heatmaps show traffic density patterns across time and lanes
- **AND** trend lines display traffic volume changes over extended periods
- **AND** comparative charts allow side-by-side analysis of different time periods

#### Scenario: Historical Data Export
- **WHEN** traffic engineers need to export historical classification data
- **THEN** the system provides export options in multiple formats (CSV, JSON, PDF)
- **AND** exported data includes aggregated metrics for the selected time period
- **AND** charts can be exported as images (PNG, SVG) for reports
- **AND** export functionality maintains data integrity and formatting

### Requirement: Historical Data Management
The system SHALL manage historical classification data storage and retrieval with efficient MongoDB integration and 15-minute aggregation intervals.

#### Scenario: Data Aggregation and Storage
- **WHEN** PassData classification events are processed
- **THEN** the system aggregates data into 15-minute intervals
- **AND** aggregated data is stored in MongoDB with proper indexing
- **AND** data includes vehicle type counts, lane utilization, and speed analysis
- **AND** storage process maintains data consistency and integrity

#### Scenario: Historical Data Retrieval
- **WHEN** historical classification data is requested
- **THEN** the system retrieves data from MongoDB with optimized queries
- **AND** data retrieval supports time-based filtering and pagination
- **AND** query performance is optimized for large historical datasets
- **AND** retrieved data is properly formatted for chart visualization

#### Scenario: Data Archival and Cleanup
- **WHEN** historical data accumulates over time
- **THEN** the system implements data archival strategies for long-term storage
- **AND** old data is compressed or archived based on retention policies
- **AND** cleanup processes maintain database performance
- **AND** data integrity is preserved during archival operations

