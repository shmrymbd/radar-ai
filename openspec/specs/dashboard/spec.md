# dashboard Specification

## Purpose
The dashboard provides a real-time traffic monitoring and control interface for traffic engineers to manage traffic signals using radar data from ClairWav-T80 systems. The system supports multiple radar devices with dynamic device selection, real-time vehicle tracking, lane status monitoring, and comprehensive traffic analytics including vehicle classification and performance metrics.
## Requirements
### Requirement: Real-time Traffic Dashboard
The system SHALL provide a real-time dashboard for traffic engineers to monitor and control traffic signals using radar data from ClairWav-T80 systems with an optimized side-by-side layout for Live Tracking.

#### Scenario: Side-by-side layout display
- **WHEN** users access the Live Tracking tab
- **THEN** the radar data analysis card is displayed on the left side
- **AND** the tracking map canvas is displayed on the right side
- **AND** both components are visible simultaneously without scrolling

#### Scenario: Responsive layout behavior
- **WHEN** users view the Live Tracking tab on different screen sizes
- **THEN** the side-by-side layout adapts appropriately for desktop, tablet, and mobile views
- **AND** the radar analysis card maintains readability and functionality
- **AND** the tracking map maintains proper sizing and interactivity

#### Scenario: Preserved functionality in new layout
- **WHEN** users interact with the radar analysis card in its new left position
- **THEN** all existing functionality remains intact
- **AND** vehicle statistics, lane scenarios, and interactive elements work as before
- **AND** the tracking map maintains all zoom, pan, and vehicle selection capabilities

#### Scenario: ObjectData validation from Redis
- **WHEN** the radar analysis card displays vehicle data
- **THEN** it validates and displays real data from 0x01 packet ObjectData
- **AND** data is retrieved from Redis using the `deviceId/ObjectData` key pattern
- **AND** vehicle statistics reflect actual ObjectData entries from the radar system
- **AND** lane analysis is based on real vehicle positions from ObjectData packets

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
The dashboard navigation SHALL include a "Video Streaming" tab that displays the full video streaming interface with camera feeds, settings, and recordings management embedded directly in the main dashboard.

#### Scenario: Video streaming tab displays embedded interface
- **WHEN** user clicks the "Video Streaming" tab in the dashboard navigation
- **THEN** the main dashboard displays the video streaming interface inline (no separate page navigation)
- **AND** the video streaming tab is highlighted as active
- **AND** the interface includes sub-tabs for Streams, Settings, and Recordings

#### Scenario: Video streaming sub-tabs within main dashboard
- **WHEN** user is on the Video Streaming tab
- **THEN** they can switch between Streams, Settings, and Recordings sub-tabs
- **AND** sub-tab switching happens instantly without page reload
- **AND** active sub-tab is visually indicated

#### Scenario: Device context preserved across video streaming tab
- **WHEN** user switches to the Video Streaming tab
- **THEN** the selected device context is maintained
- **AND** device selector remains functional
- **AND** switching back to other tabs (Overview, Tracking, Classification) preserves state

#### Scenario: Video streaming replaces link-based navigation
- **WHEN** user views the Video Streaming tab
- **THEN** the full video streaming interface is displayed inline
- **AND** no external link or "Open Video Streaming Dashboard" button is shown
- **AND** all video streaming features are accessible without leaving the main dashboard

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
The system SHALL provide real-time updates for vehicle classification data using Redis keyspace notifications and MongoDB as the single source of truth.

#### Scenario: MongoDB-based data flow
- **WHEN** new PassData (0x05) packets are received in Redis
- **THEN** Redis keyspace notifications trigger immediate processing via PassDataSubscriber
- **AND** processed data is written directly to MongoDB for persistence
- **AND** WebSocket clients receive real-time updates from MongoDB queries
- **AND** no in-memory caching is used for classification data
- **AND** no polling mechanisms are used for data retrieval

#### Scenario: MongoDB-based classification data access
- **WHEN** frontend requests classification data
- **THEN** API routes query MongoDB directly for both real-time and historical data
- **AND** MongoDB aggregations provide summary statistics and metrics
- **AND** MongoDB provides fast access via indexed queries
- **AND** ClassificationProcessor serves as minimal shell for backward compatibility

#### Scenario: WebSocket Connection Management
- **WHEN** WebSocket connections are established for classification data
- **THEN** the system maintains stable connections with automatic reconnection
- **AND** handles connection failures gracefully
- **AND** provides connection status indicators
- **AND** broadcasts updates triggered by Redis keyspace notifications

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
The system SHALL provide historical vehicle classification charts with time-based filtering and advanced visualization capabilities using MongoDB as the data source.

#### Scenario: MongoDB-based historical data retrieval
- **WHEN** traffic engineers access historical classification data
- **THEN** the system queries MongoDB directly for historical data
- **AND** data is retrieved with optimized MongoDB queries and indexing
- **AND** charts render efficiently with large historical datasets
- **AND** MongoDB is the single source of truth for all classification data

#### Scenario: Real-time chart updates
- **WHEN** new PassData is processed via Redis keyspace notifications
- **THEN** processed data is written to MongoDB immediately by PassDataSubscriber
- **AND** WebSocket clients receive real-time chart updates from MongoDB queries
- **AND** charts update without polling or in-memory dependencies

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

### Requirement: Tab State Management
The dashboard SHALL manage tab state to ensure video resources are properly initialized and cleaned up when switching between tabs.

#### Scenario: Video stream initialization on tab activation
- **WHEN** user activates the Video Streaming tab
- **THEN** camera data is fetched from the API
- **AND** video streams are initialized for display
- **AND** connection status is monitored

#### Scenario: Video stream cleanup on tab deactivation
- **WHEN** user switches away from the Video Streaming tab
- **THEN** active video streams are paused or stopped
- **AND** video player resources are released
- **AND** sub-tab state is optionally reset to default (Streams)

#### Scenario: Lazy loading of video components
- **WHEN** dashboard loads initially
- **THEN** video streaming components are only loaded when the Video Streaming tab is first accessed
- **AND** subsequent tab switches reuse loaded components
- **AND** performance of other tabs is not impacted by video component presence

### Requirement: MongoDB-First Classification Architecture
The system SHALL use MongoDB as the primary data store for all classification data, eliminating in-memory caching and polling mechanisms.

#### Scenario: Simplified ClassificationProcessor
- **WHEN** the classification processor is initialized
- **THEN** it SHALL NOT maintain in-memory Maps for classification data
- **AND** it SHALL NOT run aggregation timers for data persistence
- **AND** it SHALL serve as a minimal shell providing backward-compatible deprecated methods
- **AND** all real classification logic SHALL be handled by MongoDB queries in API routes

#### Scenario: Direct MongoDB queries in API routes
- **WHEN** API routes need classification data
- **THEN** they query MongoDB passdata collection directly
- **AND** calculate metrics from MongoDB query results
- **AND** eliminate dependency on ClassificationProcessor's in-memory cache
- **AND** use MongoDB indexes for optimal query performance

### Requirement: PassDataSubscriber MongoDB Persistence
The system SHALL use PassDataSubscriber to handle real-time data persistence from Redis to MongoDB without intermediate in-memory caching.

#### Scenario: Redis keyspace notification to MongoDB
- **WHEN** Redis keyspace notifications are received for PassData
- **THEN** PassDataSubscriber fetches latest data from Redis
- **AND** writes processed data directly to MongoDB passdata collection
- **AND** no in-memory storage is used as intermediate cache
- **AND** MongoDB serves as the single source of truth for classification data

