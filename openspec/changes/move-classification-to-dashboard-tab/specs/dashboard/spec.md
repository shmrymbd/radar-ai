## MODIFIED Requirements

### Requirement: Vehicle Classification Navigation
The system SHALL integrate the Vehicle Classification functionality directly into the main dashboard's Classification tab, providing seamless access to classification analytics without external navigation.

#### Scenario: Inline Classification Display
- **WHEN** users click the "Classification" tab in the main dashboard navigation
- **THEN** the ClassificationDashboard component is displayed inline within the main dashboard
- **AND** no external link or separate page navigation is required
- **AND** all classification features are accessible directly within the tab
- **AND** internal tab navigation (Real-time/Historical/Vehicles/Analytics) works within the embedded component

#### Scenario: Embedded Classification Features
- **WHEN** users access the Classification tab
- **THEN** they see real-time vehicle classification analytics inline using MongoDB-backed data
- **AND** historical charts and time-based filtering are available within the tab
- **AND** device context from DeviceContext is consumed via useDevice() hook
- **AND** WebSocket connections for real-time updates work in embedded context
- **AND** tab switching preserves classification state and preferences

#### Scenario: MongoDB-First Architecture Preservation
- **WHEN** the Classification tab fetches data
- **THEN** all data comes from /api/classification endpoints (MongoDB-backed)
- **AND** no in-memory ClassificationProcessor cache is used
- **AND** real-time updates flow via Redis keyspace notifications → PassDataSubscriber → MongoDB → API → WebSocket
- **AND** ClassificationProcessor is NOT instantiated in the frontend

### Requirement: Analytics Tab Integration
The system SHALL embed the TrafficAnalytics component directly into the Analytics tab, replacing the placeholder with full analytics functionality.

#### Scenario: Inline Analytics Display
- **WHEN** users click the "Analytics" tab in the main dashboard navigation
- **THEN** the TrafficAnalytics component is displayed inline within the main dashboard
- **AND** no "coming soon" placeholder is shown
- **AND** all 6 interactive charts are accessible directly within the tab

#### Scenario: Analytics Charts and Export
- **WHEN** users access the Analytics tab
- **THEN** they see 6 interactive charts (Vehicle Classification, Traffic Count, Speed Percentage, Speed Count, Level of Service, Vehicle Count by Type)
- **AND** Excel export functionality is available
- **AND** device context is passed to TrafficAnalytics component via deviceId prop
- **AND** time-range filtering works for all charts

#### Scenario: Device-Aware Analytics
- **WHEN** users switch devices using DeviceSelector
- **THEN** the Analytics tab updates to show data for the selected device
- **AND** all charts re-fetch data with the new deviceId
- **AND** device selection is maintained across tab switches

### Requirement: Video Streaming Tab Restoration
The system SHALL restore the previously-implemented inline video streaming functionality with sub-tab navigation for Streams, Settings, and Recordings.

#### Scenario: Video Streaming Sub-Tab Navigation
- **WHEN** users click the "Video Streaming" tab in the main dashboard navigation
- **THEN** the video streaming interface is displayed inline with sub-tab navigation
- **AND** sub-tabs for Streams, Settings, and Recordings are visible
- **AND** no external link or "coming soon" placeholder is shown
- **AND** active sub-tab is visually indicated

#### Scenario: Streams Sub-Tab Display
- **WHEN** users select the "Streams" sub-tab
- **THEN** the VideoStreamingGrid component displays multiple camera feeds
- **AND** cameras are arranged in grid layout
- **AND** video playback controls are available for each stream
- **AND** video streams initialize when tab becomes active

#### Scenario: Settings Sub-Tab Display
- **WHEN** users select the "Settings" sub-tab
- **THEN** the CameraSettings component displays camera configuration options
- **AND** users can update RTSP URLs and camera settings
- **AND** changes are persisted to the API
- **AND** settings sync with VideoStreamingGrid component

#### Scenario: Recordings Sub-Tab Display
- **WHEN** users select the "Recordings" sub-tab
- **THEN** the VideoRecordings component displays available recordings
- **AND** users can playback and download recordings
- **AND** recording management functions are available

#### Scenario: Video Resource Management
- **WHEN** users switch away from the Video Streaming tab
- **THEN** active video streams are paused or stopped to free resources
- **AND** HLS connections are properly cleaned up
- **AND** memory is released to prevent resource leaks

#### Scenario: Video Stream Restoration
- **WHEN** users return to the Video Streaming tab
- **THEN** video streams are reinitialized
- **AND** last selected sub-tab is remembered (or defaults to Streams)
- **AND** camera feeds resume playback
- **AND** connection status is displayed during initialization

### Requirement: Unified Dashboard Tab Navigation
The system SHALL provide consistent tab navigation across all embedded tabs without external page redirects.

#### Scenario: No External Links
- **WHEN** users navigate to any dashboard tab
- **THEN** no Link components from 'next/link' are used for tab content
- **AND** no placeholders with "Open X Dashboard" buttons are shown
- **AND** all functionality is embedded inline within the main dashboard

#### Scenario: Tab State Preservation
- **WHEN** users switch between dashboard tabs
- **THEN** each tab preserves its internal state (filters, sub-tabs, scroll position)
- **AND** device selection is maintained across all tabs
- **AND** WebSocket connections remain stable
- **AND** tab transitions are smooth without page reloads

## REMOVED Requirements

### Requirement: Separate Classification Page
**Reason**: Classification functionality has been moved inline to the main dashboard for better user experience and unified navigation.

**Migration**: The separate `/classification` route and page have been removed, with all functionality integrated into the main dashboard's Classification tab using the ClassificationDashboard component.

### Requirement: Analytics Placeholder
**Reason**: Analytics functionality is now fully implemented and embedded.

**Migration**: The "coming soon" placeholder for the Analytics tab has been replaced with the TrafficAnalytics component providing full analytics dashboard capabilities.

### Requirement: Video Streaming External Link
**Reason**: Video streaming functionality is restored to inline embedding with sub-tab navigation.

**Migration**: The placeholder with external link to `/video-streaming` has been replaced with inline VideoStreamingGrid, CameraSettings, and VideoRecordings components with sub-tab navigation, restoring the previously-implemented functionality.
