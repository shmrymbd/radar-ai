# Dashboard Spec Delta

## ADDED Requirements

### Requirement: Control Center Tab
The system SHALL provide a unified Control Center tab that combines live video streaming, vehicle tracking map, and lane status metrics in a side-by-side layout for comprehensive intersection monitoring.

#### Scenario: Control Center tab in navigation
- **WHEN** user views the main dashboard
- **THEN** the navigation includes a "Control Center" tab with operations icon
- **AND** the tab is positioned between "Analytics" and "Classification" tabs

#### Scenario: Three-panel layout display
- **WHEN** user clicks the Control Center tab
- **THEN** the interface displays three panels side-by-side
- **AND** the left panel shows video player with camera selection
- **AND** the center panel shows vehicle tracking map
- **AND** the right panel shows lane status metrics

#### Scenario: Side-by-side panel arrangement
- **WHEN** user views Control Center on desktop (≥1280px width)
- **THEN** all three panels are visible simultaneously without scrolling
- **AND** the video panel occupies 25% of viewport width
- **AND** the tracking map occupies 50% of viewport width
- **AND** the lane status panel occupies 25% of viewport width

#### Scenario: Device context preservation
- **WHEN** user switches to Control Center tab
- **THEN** the selected device context is maintained across all panels
- **AND** video cameras are filtered by device
- **AND** tracking map shows vehicles for selected device
- **AND** lane status displays lanes for selected device

### Requirement: Video Panel with Camera Selection
The system SHALL provide a video panel in the Control Center that displays a single camera feed with camera selection and vehicle position overlay capabilities.

#### Scenario: Camera selection dropdown
- **WHEN** user accesses the video panel
- **THEN** a camera selection dropdown is displayed above the video player
- **AND** the dropdown shows all available cameras for the selected device
- **AND** selecting a camera loads and displays that camera's live stream

#### Scenario: Single camera video display
- **WHEN** a camera is selected
- **THEN** the video player displays the live HLS stream for that camera
- **AND** the video fills the available panel width while maintaining aspect ratio
- **AND** video playback controls (play/pause) are available

#### Scenario: Overlay toggle control
- **WHEN** video is playing and tracking data is available
- **THEN** an "Overlay" toggle button is displayed below the video
- **AND** the toggle allows enabling/disabling vehicle position overlays on video
- **AND** the toggle state is persisted per user session

### Requirement: Video Overlay with Vehicle Positions
The system SHALL overlay vehicle positions from radar tracking data onto the video feed to provide visual correlation between camera view and radar detections.

#### Scenario: Vehicle position overlay rendering
- **WHEN** video overlay is enabled and tracking data is available
- **THEN** vehicle positions are rendered as colored rectangles on the video
- **AND** each rectangle is positioned using radar coordinates transformed to video pixel coordinates
- **AND** rectangle colors match vehicle type colors (blue=car, red=truck, green=motorcycle)

#### Scenario: Vehicle ID labels
- **WHEN** vehicle positions are overlaid on video
- **THEN** each vehicle displays its target ID as a label above the rectangle
- **AND** labels remain visible and readable against video background
- **AND** labels update in real-time as vehicles move

#### Scenario: Overlay coordinate transformation
- **WHEN** radar vehicle positions are converted to video coordinates
- **THEN** the system applies basic 1:1 scale transformation as initial implementation
- **AND** coordinates are adjusted for video player dimensions
- **AND** overlay remains synchronized with video frames at 30fps minimum

#### Scenario: Stale data indication
- **WHEN** tracking data is older than 2 seconds
- **THEN** overlay rectangles are rendered with reduced opacity (40%)
- **AND** a "Data Stale" indicator is displayed in the video panel
- **AND** overlay updates resume normal opacity when fresh data arrives

### Requirement: Embedded Tracking Panel
The system SHALL embed the existing LiveTracking component in the Control Center to provide full-featured vehicle tracking with trails, heat maps, and zoom controls.

#### Scenario: LiveTracking component integration
- **WHEN** Control Center tab is displayed
- **THEN** the existing LiveTracking component is rendered in the center panel
- **AND** all tracking features remain functional (trails, heat maps, zoom, pan)
- **AND** tracking data updates in real-time via WebSocket

#### Scenario: Tracking map sizing
- **WHEN** LiveTracking is displayed in Control Center
- **THEN** the map canvas fills the available center panel width and height
- **AND** map maintains aspect ratio and proper scaling
- **AND** zoom and pan controls remain accessible

#### Scenario: Vehicle selection from tracking map
- **WHEN** user clicks a vehicle on the tracking map
- **THEN** the vehicle is highlighted on the map
- **AND** the same vehicle's overlay rectangle is highlighted on video (if visible)
- **AND** vehicle details are displayed in the tracking panel info section

### Requirement: Lane Status Panel
The system SHALL provide a lane status panel displaying real-time metrics for all lanes including queue length, occupancy, speed, and flow rates.

#### Scenario: Lane status cards display
- **WHEN** Control Center tab is displayed
- **THEN** the lane status panel shows individual cards for each lane (11, 12, 13, 485)
- **AND** each card displays lane number and status indicator
- **AND** cards are stacked vertically with consistent spacing

#### Scenario: Lane metrics display
- **WHEN** lane status data is available
- **THEN** each lane card displays the following metrics:
  - Queue length in meters
  - Number of vehicles in queue
  - Space occupancy percentage
  - Time occupancy percentage
  - Average speed in km/h
  - 85th percentile speed in km/h
  - Flow rate in vehicles/hour
- **AND** all metrics are formatted with appropriate units and precision

#### Scenario: Occupancy progress bars
- **WHEN** lane status card is rendered
- **THEN** space occupancy is displayed as a progress bar (0-100%)
- **AND** time occupancy is displayed as a separate progress bar (0-100%)
- **AND** progress bars are color-coded based on occupancy level:
  - Green (<30%): Light traffic
  - Amber (30-60%): Moderate traffic
  - Red (60-85%): Heavy traffic
  - Dark red (>85%): Congestion

#### Scenario: Lane status indicators
- **WHEN** lane status flags are received from 0x04 packets
- **THEN** status indicator displays:
  - Red "Fault" when bit 0x01 is set
  - Amber "Warning" when bit 0x02 is set
  - Green "Normal" when no error bits are set
- **AND** status indicator is prominently displayed in lane card header

#### Scenario: Lane status auto-refresh
- **WHEN** Control Center tab is active
- **THEN** lane status data is fetched from `/api/lanes` endpoint every 3 seconds
- **AND** lane cards update automatically with new data
- **AND** last update timestamp is displayed at bottom of panel

#### Scenario: Missing lane data handling
- **WHEN** lane status data is unavailable for a configured lane
- **THEN** the lane card displays "No Data" state
- **AND** all metric values show "--" placeholders
- **AND** status indicator shows gray "Unknown" state

### Requirement: Responsive Mobile Layout
The system SHALL provide a tab/accordion pattern on mobile devices to display one panel at a time while maintaining quick switching between video, tracking, and lane status views.

#### Scenario: Mobile tab navigation display
- **WHEN** user views Control Center on mobile (<768px width)
- **THEN** a tab bar is displayed at the top with three tabs: Video, Tracking, Lanes
- **AND** tabs are horizontally aligned with equal width
- **AND** active tab is visually highlighted

#### Scenario: Mobile panel switching
- **WHEN** user taps a mobile tab button
- **THEN** the corresponding panel is displayed full-width
- **AND** other panels are hidden to conserve resources
- **AND** transition between panels is smooth (300ms fade)

#### Scenario: Default mobile view
- **WHEN** user opens Control Center on mobile for the first time
- **THEN** the Tracking panel is displayed by default
- **AND** Video and Lanes tabs are available but not rendered until selected

#### Scenario: Mobile swipe gestures
- **WHEN** user swipes left/right on mobile panel content
- **THEN** the interface switches to the next/previous panel
- **AND** swipe gesture provides visual feedback during drag
- **AND** swipe threshold is 50px to trigger panel switch

### Requirement: Shared State Management
The system SHALL manage shared state across all three panels using React Context to enable data correlation and synchronized updates.

#### Scenario: Control Center context provider
- **WHEN** Control Center tab is rendered
- **THEN** a ControlCenterContext wraps all three panels
- **AND** context provides shared vehicle tracking data via ref
- **AND** context provides lane status data via state
- **AND** context provides selected camera ID and overlay toggle state

#### Scenario: Vehicle data sharing
- **WHEN** WebSocket receives vehicle tracking updates
- **THEN** data is stored in shared vehiclesRef to avoid re-renders
- **AND** both tracking panel and video overlay access the same vehicle data
- **AND** vehicle data updates do not trigger unnecessary panel re-renders

#### Scenario: Cross-panel correlation
- **WHEN** user selects a vehicle in the tracking panel
- **THEN** the same vehicle is highlighted in the video overlay (if visible)
- **AND** vehicle details are accessible from shared context
- **AND** selection state is synchronized across panels

### Requirement: Performance Optimization
The system SHALL optimize rendering performance to maintain smooth operation with three simultaneous real-time panels.

#### Scenario: Panel memoization
- **WHEN** Control Center components are rendered
- **THEN** VideoPanel, TrackingPanel, and LaneStatusPanel are wrapped in React.memo
- **AND** components only re-render when their specific props change
- **AND** shared context changes do not trigger unnecessary re-renders

#### Scenario: Throttled WebSocket updates
- **WHEN** high-frequency vehicle tracking data arrives via WebSocket
- **THEN** updates are throttled to maximum 2 updates per second (500ms interval)
- **AND** throttling reduces CPU usage without impacting perceived real-time performance
- **AND** throttle interval is configurable via environment variable

#### Scenario: Lazy mobile panel rendering
- **WHEN** user switches between mobile tabs
- **THEN** only the active panel component is rendered in the DOM
- **AND** inactive panels are unmounted to free resources
- **AND** WebSocket subscriptions are paused for inactive panels

#### Scenario: Video overlay frame rate limiting
- **WHEN** vehicle overlay is rendering on video
- **THEN** overlay canvas updates at 30fps maximum via requestAnimationFrame
- **AND** overlay rendering skips frames if tracking data hasn't changed
- **AND** overlay CPU usage remains below 10% on average

### Requirement: Error Handling and Resilience
The system SHALL handle errors in individual panels independently without affecting other panels or overall dashboard functionality.

#### Scenario: Video panel error isolation
- **WHEN** video stream fails to load or encounters error
- **THEN** an error state is displayed in the video panel only
- **AND** tracking and lane status panels continue functioning normally
- **AND** user can retry video connection without refreshing entire page

#### Scenario: Tracking WebSocket disconnection
- **WHEN** WebSocket connection for tracking data is lost
- **THEN** tracking panel displays "Disconnected" indicator
- **AND** video and lane status panels continue operating
- **AND** WebSocket automatically attempts reconnection every 5 seconds

#### Scenario: Lane status API failure
- **WHEN** `/api/lanes` endpoint returns error or times out
- **THEN** lane status panel displays error message with retry button
- **AND** video and tracking panels remain unaffected
- **AND** automatic retry occurs after 10 seconds

#### Scenario: Graceful degradation
- **WHEN** Control Center encounters partial data availability
- **THEN** available panels display their data normally
- **AND** unavailable panels show appropriate loading or error states
- **AND** user can interact with functioning panels without disruption

### Requirement: Accessibility Compliance
The system SHALL ensure Control Center tab is accessible to users with disabilities following WCAG 2.1 Level AA standards.

#### Scenario: Keyboard navigation between panels
- **WHEN** user navigates Control Center with keyboard only
- **THEN** Tab key moves focus between video controls, tracking controls, and lane cards
- **AND** focus indicators are clearly visible on all interactive elements
- **AND** focus order follows logical left-to-right, top-to-bottom sequence

#### Scenario: Screen reader support
- **WHEN** screen reader user navigates Control Center
- **THEN** panel titles are announced with proper ARIA labels
- **AND** lane status metrics are announced with label + value (e.g., "Queue length: 12 meters")
- **AND** video overlay toggle state is announced (e.g., "Overlay enabled")

#### Scenario: High contrast mode
- **WHEN** user enables high contrast mode
- **THEN** all text maintains 4.5:1 contrast ratio against backgrounds
- **AND** status indicators remain distinguishable without color alone
- **AND** focus outlines are visible with sufficient contrast

#### Scenario: Status change announcements
- **WHEN** lane status changes from normal to warning/fault
- **THEN** screen reader announces the status change
- **AND** announcement includes lane number and new status
- **AND** announcement is polite (non-interruptive) priority
