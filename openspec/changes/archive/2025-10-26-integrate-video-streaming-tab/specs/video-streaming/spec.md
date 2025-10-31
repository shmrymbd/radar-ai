# video-streaming Spec Delta

## REMOVED Requirements

### Requirement: Video Streaming Page
~~The system SHALL provide a dedicated video streaming page accessible from the main dashboard navigation that displays real-time video feeds from intersection cameras.~~

**Reason for removal**: Video streaming functionality is now integrated directly into the main dashboard as a tab, eliminating the need for a separate page route.

#### ~~Scenario: Access video streaming page~~
- ~~**WHEN** user clicks the "Video Streaming" tab in the dashboard navigation~~
- ~~**THEN** the video streaming page loads with available camera feeds~~

**Replacement**: Now handled by dashboard tab switching without page navigation.

#### ~~Scenario: Display multiple camera feeds~~
- ~~**WHEN** multiple cameras are configured and available~~
- ~~**THEN** the page displays all active camera feeds in a grid layout~~

**Replacement**: Camera feeds now display inline within the Video Streaming tab of the main dashboard.

#### ~~Scenario: Handle camera connection failures~~
- ~~**WHEN** a camera feed fails to connect or becomes unavailable~~
- ~~**THEN** the system displays an error message and retry option for that specific camera~~

**Note**: This error handling functionality is preserved; only the routing mechanism has changed.

---

## ADDED Requirements

### Requirement: Dashboard Integration
The video streaming interface SHALL be embedded within the main dashboard as a tab, providing seamless access to all video streaming features without separate page navigation.

#### Scenario: Video streaming as dashboard tab
- **WHEN** user accesses the main dashboard
- **THEN** the Video Streaming tab is available in the navigation
- **AND** clicking the tab displays the full video streaming interface inline
- **AND** no page navigation occurs when accessing video features

#### Scenario: Sub-tab navigation within video streaming tab
- **WHEN** user is on the Video Streaming tab
- **THEN** they see sub-tabs for Streams, Settings, and Recordings
- **AND** can switch between sub-tabs without affecting other dashboard state
- **AND** active sub-tab is visually indicated

#### Scenario: Unified user experience
- **WHEN** user switches between dashboard tabs (Overview, Tracking, Classification, Video Streaming)
- **THEN** all transitions happen instantly without page reloads
- **AND** device context is preserved across all tabs
- **AND** video streaming features are accessible with same interaction patterns as other dashboard features

## MODIFIED Requirements

### Requirement: Camera Settings and Configuration
The system SHALL provide camera configuration interface as a sub-tab within the Video Streaming tab, allowing users to add, edit, and manage camera connections with settings for video quality, resolution, and streaming parameters.

#### Scenario: Access camera settings within dashboard
- **WHEN** user clicks the Settings sub-tab within Video Streaming
- **THEN** the camera configuration interface displays inline in the dashboard
- **AND** users can add, edit, or delete cameras without leaving the main dashboard
- **AND** changes are saved and reflected immediately

#### Scenario: Add new camera from dashboard tab
- **WHEN** user accesses camera settings sub-tab
- **THEN** the system provides form to enter camera details (name, RTSP URL, credentials)
- **AND** new camera configuration is saved and becomes available for streaming
- **AND** user can return to Streams sub-tab to view the newly added camera

#### Scenario: Test camera connection inline
- **WHEN** user configures a new camera in the Settings sub-tab
- **THEN** the system provides a test connection feature to verify settings
- **AND** test results are displayed within the dashboard interface
- **AND** user can make corrections without navigation

### Requirement: Video Recording and Playback
The system SHALL provide video recording capabilities accessible through the Recordings sub-tab within the Video Streaming tab, enabling incident analysis and system validation without leaving the main dashboard.

#### Scenario: Access recordings from dashboard
- **WHEN** user clicks the Recordings sub-tab within Video Streaming
- **THEN** the system displays list of available recordings inline in the dashboard
- **AND** users can play, download, or delete recordings
- **AND** playback happens within the dashboard interface

#### Scenario: Initiate recording from streams view
- **WHEN** user is viewing live camera streams in the Streams sub-tab
- **THEN** they can initiate recording for any active camera
- **AND** recording status is displayed in the streams view
- **AND** completed recordings appear in the Recordings sub-tab

#### Scenario: Playback recorded video in dashboard
- **WHEN** user selects a recorded video from the Recordings sub-tab
- **THEN** the system plays the video inline with standard playback controls
- **AND** user can switch to other sub-tabs or dashboard tabs without stopping playback (if desired)
- **AND** closing or navigating away stops playback and releases resources
