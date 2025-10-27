# video-streaming Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
