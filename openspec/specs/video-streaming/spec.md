# video-streaming Specification

## Purpose
The video streaming capability provides real-time video feeds from intersection cameras with RTSP support, HLS streaming, camera management, and video recording functionality for traffic monitoring and incident analysis. The system supports low-latency streaming with 1-second latency target for real-time traffic control decisions.
## Requirements
### Requirement: RTSP Camera Integration
The system SHALL support connecting to and streaming from RTSP cameras using HLS technology for real-time video display in web browsers with 1-second latency target.

#### Scenario: Connect to RTSP camera
- **WHEN** user provides valid RTSP URL and credentials for a camera
- **THEN** the system establishes connection and begins streaming video

#### Scenario: Handle RTSP authentication
- **WHEN** camera requires authentication
- **THEN** the system securely stores and uses credentials for connection

#### Scenario: Convert RTSP to HLS
- **WHEN** RTSP stream is available
- **THEN** the system converts the stream to HLS format for browser compatibility
- **AND** maintains latency under 1 second for real-time traffic control

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

### Requirement: Radar Data Overlay
The system SHALL overlay radar detection data on video feeds to provide visual correlation between radar measurements and actual vehicle movements.

#### Scenario: Display radar objects on video
- **WHEN** radar data is available and video is streaming
- **THEN** the system overlays detected vehicle positions and trajectories on the video feed

#### Scenario: Show lane status on video
- **WHEN** lane status data is available
- **THEN** the system displays lane occupancy and queue information on the video

#### Scenario: Highlight traffic events
- **WHEN** significant traffic events are detected by radar
- **THEN** the system highlights the relevant area on the video feed

### Requirement: Multi-Camera Management
The system SHALL support multiple cameras with individual configuration, status monitoring, and coordinated display options.

#### Scenario: Display camera status
- **WHEN** multiple cameras are configured
- **THEN** the system shows connection status, resolution, and quality for each camera

#### Scenario: Switch between camera views
- **WHEN** user wants to focus on specific intersection area
- **THEN** the system allows switching between different camera feeds

#### Scenario: Synchronized multi-camera view
- **WHEN** user selects multi-camera display mode
- **THEN** the system shows all camera feeds simultaneously with synchronized timestamps

### Requirement: Video Streaming Performance
The system SHALL maintain low-latency video streaming with adaptive quality and stable buffering to ensure real-time performance for traffic control decisions without playback interruptions.

#### Scenario: Low-latency streaming with stable buffering
- **WHEN** video is streaming from cameras
- **THEN** the system maintains latency under 1-2 seconds for real-time decision making
- **AND** provides minimum 3-second buffer to prevent playback stalls
- **AND** balances latency requirements with buffering stability

#### Scenario: Buffer stall prevention
- **WHEN** network conditions vary during streaming
- **THEN** the system maintains sufficient buffer to prevent playback stalls
- **AND** automatically recovers from brief network interruptions
- **AND** prevents buffer stall errors that disrupt user experience

#### Scenario: Adaptive quality adjustment
- **WHEN** network conditions change
- **THEN** the system automatically adjusts video quality to maintain smooth streaming

#### Scenario: Bandwidth management
- **WHEN** multiple video streams are active
- **THEN** the system manages bandwidth allocation to prevent performance degradation

### Requirement: HLS Streaming Infrastructure
The system SHALL provide HLS streaming infrastructure with FFmpeg processing, Next.js API serving, and real-time synchronization for low-latency video delivery with stable buffering.

#### Scenario: FFmpeg RTSP to HLS conversion with stable buffering
- **WHEN** RTSP camera stream is available
- **THEN** FFmpeg converts stream to HLS with 1-second segments
- **AND** maintains 5 segments in playlist for 5-second buffer minimum
- **AND** removes conflicting probe and analysis parameters to ensure proper stream analysis

#### Scenario: Buffer health maintenance
- **WHEN** HLS segments are being generated and consumed
- **THEN** the system maintains buffer length between 1-10 seconds
- **AND** prevents buffer stalls by ensuring sufficient segment availability
- **AND** monitors buffer health and warns when critically low (below 1 second)

#### Scenario: Next.js API serving
- **WHEN** HLS segments are generated
- **THEN** Next.js API serves segments with proper CORS headers
- **AND** provides correct MIME types for HLS content

#### Scenario: Real-time synchronization
- **WHEN** FFmpeg generates new segments
- **THEN** the system synchronizes segments to API directory
- **AND** maintains continuous video streaming without interruption

### Requirement: Browser Video Player
The system SHALL provide a web-based video player using hls.js for HLS playback with error handling, connection status monitoring, and automatic recovery from transient failures.

#### Scenario: HLS video playback with optimized buffering
- **WHEN** HLS stream is available
- **THEN** the browser video player loads and plays the stream using hls.js
- **AND** configures buffer limits appropriate for low-latency live streaming
- **AND** maintains 10-second target buffer with 15-second maximum

#### Scenario: Automatic error recovery
- **WHEN** network errors occur during playback
- **THEN** the system automatically attempts to resume loading segments
- **AND** recovers without requiring user intervention for transient network issues

#### Scenario: Media error recovery
- **WHEN** media decoding errors occur
- **THEN** the system attempts automatic media error recovery
- **AND** only shows error UI if recovery fails after retry attempts

#### Scenario: Buffer health monitoring
- **WHEN** video is actively streaming
- **THEN** the system monitors buffer levels in real-time
- **AND** logs buffer health metrics to console for debugging
- **AND** warns when buffer falls below 1-second threshold

#### Scenario: Connection status display
- **WHEN** video player connects to stream
- **THEN** the system displays connection status (connecting, connected, disconnected)

#### Scenario: Error handling
- **WHEN** video stream fails to load or encounters unrecoverable errors
- **THEN** the system displays appropriate error messages and retry options

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

### Requirement: HLS Memory Management
The system SHALL properly manage HLS.js resources to prevent memory leaks and ensure stable long-term operation.

#### Scenario: HLS instance cleanup on component unmount
- **WHEN** video player component unmounts (user switches cameras or navigates away)
- **THEN** the system destroys the HLS.js instance and releases resources
- **AND** cleans up event listeners and web workers
- **AND** prevents memory leaks from accumulating

#### Scenario: Resource cleanup on error
- **WHEN** unrecoverable fatal errors occur
- **THEN** the system destroys the HLS.js instance before showing error UI
- **AND** releases all associated resources

#### Scenario: Memory stability during camera switching
- **WHEN** user switches between multiple cameras repeatedly
- **THEN** memory usage remains stable without indefinite growth
- **AND** old HLS instances are properly garbage collected

### Requirement: FFmpeg Stream Stability
The system SHALL configure FFmpeg with non-conflicting parameters and stability features to ensure reliable RTSP to HLS conversion.

#### Scenario: Non-conflicting parameter configuration
- **WHEN** FFmpeg process starts for RTSP to HLS conversion
- **THEN** the system uses consistent probe size and analysis duration settings
- **AND** avoids parameter conflicts that prevent proper stream analysis
- **AND** allows FFmpeg adequate time to analyze RTSP stream characteristics

#### Scenario: RTSP connection resilience
- **WHEN** RTSP connection experiences brief interruptions
- **THEN** FFmpeg automatically attempts to reconnect
- **AND** resumes streaming without manual intervention
- **AND** tolerates network jitter without process termination

#### Scenario: Reliable segment generation
- **WHEN** FFmpeg is converting RTSP to HLS segments
- **THEN** segments are generated at regular 1-second intervals
- **AND** segment timing is consistent for smooth playback
- **AND** segment size is appropriate for configured bitrate

### Requirement: Stream Startup Reliability
The system SHALL ensure reliable stream initialization with adequate timeout and verification of stream readiness.

#### Scenario: Extended startup timeout
- **WHEN** new stream is being initialized
- **THEN** the system waits up to 30 seconds for stream startup
- **AND** accommodates slower RTSP connections and FFmpeg initialization

#### Scenario: Playlist and segment verification
- **WHEN** waiting for stream to become ready
- **THEN** the system verifies both playlist file existence and content
- **AND** confirms at least one segment file is generated
- **AND** only marks stream as ready when playback can actually start

#### Scenario: Startup health reporting
- **WHEN** stream initialization completes
- **THEN** the system logs segment count and playlist status
- **AND** provides diagnostic information for troubleshooting

## MODIFIED Requirements

### Requirement: Dashboard Navigation
The dashboard navigation SHALL include a "Video Streaming" tab that provides access to camera feeds and video management functionality.

#### Scenario: Video streaming tab in navigation
- **WHEN** user views the main dashboard
- **THEN** the navigation includes a "Video Streaming" tab with camera icon

#### Scenario: Active video streaming tab
- **WHEN** user is on the video streaming page
- **THEN** the video streaming tab is highlighted as active in the navigation

### Requirement: Device Context Management
The device context SHALL be extended to support camera devices alongside radar devices, providing unified device management across the dashboard.

#### Scenario: Camera device selection
- **WHEN** multiple cameras are available
- **THEN** the device selector includes camera options for selection

#### Scenario: Device status monitoring
- **WHEN** cameras are configured
- **THEN** the device context monitors camera connection status and health

#### Scenario: Unified device management
- **WHEN** user manages devices
- **THEN** the system provides consistent interface for both radar and camera devices
