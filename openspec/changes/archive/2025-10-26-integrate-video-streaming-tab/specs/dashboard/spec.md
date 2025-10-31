# dashboard Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
