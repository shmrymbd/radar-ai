# video-streaming Spec Delta

## MODIFIED Requirements

### Requirement: Video Streaming Performance
The system SHALL maintain low-latency video streaming with **adaptive quality**, stable buffering, **consistent segment generation**, and **automated health monitoring** to ensure reliable real-time performance for traffic control decisions without playback interruptions.

#### Scenario: Consistent segment generation with CBR encoding
- **WHEN** FFmpeg converts RTSP to HLS segments
- **THEN** the system generates segments with exactly 1.0 second duration (±10ms tolerance)
- **AND** uses Constant Bitrate (CBR) mode for predictable segment sizes
- **AND** inserts keyframes at exact 1-second intervals for clean segment boundaries
- **AND** validates each segment before serving to clients

#### Scenario: Adaptive bitrate streaming for network resilience
- **WHEN** network conditions vary during streaming
- **THEN** the system provides multiple quality levels (1080p, 720p, 480p)
- **AND** HLS.js automatically selects optimal quality based on available bandwidth
- **AND** quality switches occur within 3 segments without playback interruption
- **AND** displays current quality level to user

#### Scenario: Low-latency streaming with stable buffering
- **WHEN** video is streaming from cameras
- **THEN** the system maintains latency under 2-3 seconds for real-time decision making
- **AND** provides minimum 5-second buffer (5 segments) to prevent playback stalls
- **AND** balances latency requirements with buffering stability
- **AND** buffer remains between 3-10 seconds during normal playback

#### Scenario: Buffer stall prevention
- **WHEN** network conditions vary during streaming
- **THEN** the system maintains sufficient buffer to prevent playback stalls
- **AND** automatically recovers from brief network interruptions
- **AND** prevents buffer stall errors that disrupt user experience
- **AND** logs buffer health metrics for monitoring

#### Scenario: Adaptive quality adjustment
- **WHEN** network bandwidth changes
- **THEN** the system automatically adjusts video quality to maintain smooth streaming
- **AND** switches between 1080p/720p/480p variants based on measured bandwidth
- **AND** prioritizes smooth playback over maximum quality
- **AND** avoids rapid quality oscillation (minimum 10s between switches)

#### Scenario: Bandwidth management
- **WHEN** multiple video streams are active
- **THEN** the system manages bandwidth allocation to prevent performance degradation
- **AND** each stream operates independently with adaptive quality
- **AND** total bandwidth stays within system limits
- **AND** lower priority streams reduce quality if bandwidth constrained

---

### Requirement: HLS Streaming Infrastructure
The system SHALL provide HLS streaming infrastructure with FFmpeg processing, Next.js API serving, real-time synchronization, **multi-bitrate generation**, **stream deduplication**, and **health monitoring** for reliable low-latency video delivery.

#### Scenario: Multi-bitrate HLS generation with CBR
- **WHEN** RTSP camera stream is available
- **THEN** FFmpeg converts stream to HLS with 3 quality variants (1080p@2Mbps, 720p@1Mbps, 480p@500kbps)
- **AND** uses Constant Bitrate (CBR) mode for each variant
- **AND** generates 1-second segments with forced keyframes at boundaries
- **AND** creates master playlist referencing all variants
- **AND** maintains 10 segments per variant (10-second buffer minimum)

#### Scenario: Stream deduplication for resource efficiency
- **WHEN** multiple clients request the same camera stream
- **THEN** the system reuses existing FFmpeg process instead of spawning duplicates
- **AND** tracks usage count (number of connected viewers)
- **AND** keeps stream alive while usage count > 0
- **AND** gracefully terminates stream after last viewer disconnects

#### Scenario: Automated health monitoring
- **WHEN** streams are actively encoding
- **THEN** the system monitors segment generation rate (should be ~1/second)
- **AND** checks FFmpeg process health every 30 seconds
- **AND** validates playlist freshness (updated within last 10s)
- **AND** monitors CPU usage (<80% threshold) and memory stability
- **AND** stores health metrics for API access

#### Scenario: Automatic stream recovery
- **WHEN** health checks fail for 3 consecutive intervals (90 seconds total)
- **THEN** the system automatically restarts the failed stream
- **AND** gracefully terminates the unhealthy FFmpeg process
- **AND** spawns new FFmpeg with same configuration
- **AND** notifies connected clients via WebSocket
- **AND** logs recovery event with diagnostic information

#### Scenario: Buffer health maintenance
- **WHEN** HLS segments are being generated and consumed
- **THEN** the system maintains buffer length between 3-10 seconds
- **AND** prevents buffer stalls by ensuring sufficient segment availability
- **AND** monitors buffer health and warns when critically low (below 2 seconds)

#### Scenario: Next.js API serving
- **WHEN** HLS segments and playlists are generated
- **THEN** Next.js API serves master playlist, variant playlists, and segments
- **AND** provides proper CORS headers for cross-origin requests
- **AND** sets correct MIME types for HLS content (application/vnd.apple.mpegurl, video/mp2t)

#### Scenario: Real-time synchronization
- **WHEN** FFmpeg generates new segments
- **THEN** segments are immediately available via API
- **AND** maintains continuous video streaming without interruption
- **AND** segment availability synchronized with playlist updates

---

## ADDED Requirements

### Requirement: Stream Health Monitoring
The system SHALL provide comprehensive stream health monitoring with real-time metrics collection, automated failure detection, and proactive recovery mechanisms to ensure 99%+ uptime.

#### Scenario: Real-time health metrics collection
- **WHEN** streams are actively encoding
- **THEN** the system collects metrics every 30 seconds (segment rate, CPU usage, playlist freshness, disk space)
- **AND** stores metrics in memory with 24-hour retention
- **AND** provides metrics via `/api/video/health` endpoint
- **AND** includes per-stream and aggregate metrics

#### Scenario: Health status API endpoint
- **WHEN** client requests stream health status via `/api/video/health`
- **THEN** the system returns JSON with all active streams' health metrics
- **AND** includes: streamId, cameraId, status, uptime, segment count, CPU usage, error count
- **AND** provides aggregate metrics: total streams, total bandwidth, system health score
- **AND** responds within 100ms for quick health checks

#### Scenario: WebSocket health notifications
- **WHEN** stream health status changes (healthy → unhealthy or recovery)
- **THEN** the system broadcasts notification to all connected clients via WebSocket
- **AND** includes streamId, cameraId, new status, and reason for change
- **AND** clients update UI indicators within 1 second
- **AND** notification payload includes timestamp and recovery action taken

#### Scenario: Failure detection and alerting
- **WHEN** health check detects stream issue (FFmpeg crash, segment generation stopped, high CPU)
- **THEN** the system increments failure counter for that stream
- **AND** logs detailed diagnostic information
- **AND** triggers auto-recovery after 3 consecutive failures (90s)
- **AND** sends alert notification if recovery fails after 3 attempts

---

### Requirement: Adaptive Bitrate Streaming (ABR)
The system SHALL provide adaptive bitrate streaming with multiple quality levels, intelligent bandwidth detection, and seamless quality switching to optimize playback under varying network conditions.

#### Scenario: Multi-quality level generation
- **WHEN** FFmpeg starts encoding a camera stream
- **THEN** the system generates 3 concurrent quality variants:
  - **High**: 1920x1080 @ 2Mbps (broadband, local network)
  - **Medium**: 1280x720 @ 1Mbps (WiFi, mobile 4G)
  - **Low**: 854x480 @ 500kbps (mobile 3G, poor network)
- **AND** each variant has consistent 1-second segments with aligned keyframes

#### Scenario: Master playlist with variant information
- **WHEN** client requests HLS stream for a camera
- **THEN** the system serves master playlist (master.m3u8) referencing all variants
- **AND** includes BANDWIDTH, RESOLUTION, and CODECS attributes for each variant
- **AND** enables HLS.js automatic quality selection

#### Scenario: Automatic quality selection based on bandwidth
- **WHEN** HLS.js player starts streaming
- **THEN** the system measures available bandwidth over first 10 seconds
- **AND** selects optimal quality variant for current network conditions
- **AND** starts playback without waiting for all variants
- **AND** displays current quality to user (e.g., "1080p", "720p")

#### Scenario: Seamless quality switching during playback
- **WHEN** measured bandwidth changes during streaming
- **THEN** HLS.js switches to appropriate quality variant within 3 segments
- **AND** switches occur at keyframe boundaries (no frame corruption)
- **AND** playback continues smoothly without buffering pause
- **AND** logs quality switch event with reason (bandwidth change, buffer level)

#### Scenario: Quality indicator UI
- **WHEN** user is watching video stream
- **THEN** the player displays current quality level ("1080p", "720p", "480p")
- **AND** shows quality changes with smooth transitions (fade effect)
- **AND** optionally allows manual quality override (user preference)
- **AND** displays network quality indicator (Excellent/Good/Poor)

---

### Requirement: Stream Resource Management
The system SHALL implement comprehensive resource management including stream deduplication, automated cleanup, graceful shutdown, and disk space monitoring to prevent resource exhaustion and ensure system stability.

#### Scenario: Stream deduplication for concurrent viewers
- **WHEN** multiple clients request stream for same camera
- **THEN** the system checks for existing active stream before spawning FFmpeg
- **AND** reuses existing stream if healthy (status: active, segments generating)
- **AND** increments usage counter for shared stream
- **AND** logs reuse event (no new FFmpeg process created)

#### Scenario: Usage-based stream lifecycle
- **WHEN** client connects to existing shared stream
- **THEN** usage counter increments by 1
- **WHEN** client disconnects from stream
- **THEN** usage counter decrements by 1
- **AND** stream remains active while usage counter > 0
- **AND** stream terminates gracefully after last viewer disconnects (with 2-minute grace period)

#### Scenario: Automated cleanup of inactive streams
- **WHEN** hourly cleanup job executes
- **THEN** the system scans all stream directories in `hls-output/`
- **AND** reads metadata.json from each directory (contains lastAccessTime)
- **AND** removes directories with lastAccessTime > 2 hours ago
- **AND** skips directories for currently active streams
- **AND** logs cleanup operations (streamId, disk space freed)

#### Scenario: Last-access tracking
- **WHEN** client accesses stream playlist or segments
- **THEN** the system updates lastAccessTime in metadata.json
- **AND** prevents premature cleanup of actively viewed streams
- **AND** tracks access patterns for analytics

#### Scenario: Graceful shutdown on server restart
- **WHEN** server receives SIGTERM signal (restart/shutdown)
- **THEN** the system gracefully terminates all active FFmpeg processes
- **AND** waits up to 5 seconds for clean shutdown (allows segment completion)
- **AND** saves stream metadata for potential resume
- **AND** cleans up temporary files
- **AND** force-kills processes if not terminated after 5 seconds (SIGKILL)

#### Scenario: Disk space monitoring
- **WHEN** stream health checks execute
- **THEN** the system monitors available disk space for HLS output directory
- **AND** warns if available space < 1GB
- **AND** pauses new stream creation if space < 500MB
- **AND** triggers emergency cleanup if space < 100MB

---

### Requirement: Stream Analytics and Visibility
The system SHALL provide comprehensive stream analytics with real-time metrics visualization, historical data tracking, and diagnostic tools to enable proactive monitoring and troubleshooting.

#### Scenario: Real-time analytics dashboard
- **WHEN** user opens stream analytics view
- **THEN** the system displays real-time graphs for all active streams:
  - **Bitrate over time** (last 5 minutes, line chart)
  - **Segment generation timeline** (last 30 segments, bar chart)
  - **Buffer health visualization** (current buffer level, gauge)
  - **Quality switching history** (last hour, timeline)
- **AND** updates graphs every 10 seconds automatically

#### Scenario: System-wide metrics panel
- **WHEN** analytics dashboard loads
- **THEN** the system displays aggregate metrics:
  - Active streams count (with status indicators: green/yellow/red)
  - Total bandwidth usage (sum across all streams, Mbps)
  - CPU/Memory per stream (table format)
  - Error rate (errors per hour, last 24 hours)
  - Recovery count (automatic restarts, last 24 hours)
- **AND** highlights anomalies (high CPU, frequent errors)

#### Scenario: Per-stream analytics endpoint
- **WHEN** client requests analytics via `/api/video/analytics?streamId=X&timeRange=1h`
- **THEN** the system returns JSON with time-series metrics:
  - Bitrate history (samples every 10s)
  - Segment generation timestamps (all segments in range)
  - Quality switch events (timestamp, from quality, to quality, reason)
  - Error events (timestamp, type, message, resolution)
- **AND** responds within 200ms for 1-hour time range

#### Scenario: Historical data retention
- **WHEN** system collects stream metrics
- **THEN** metrics are stored with 24-hour retention period
- **AND** older data automatically expires to prevent storage growth
- **AND** aggregate hourly summaries retained for 7 days
- **AND** critical events (failures, recoveries) retained indefinitely

#### Scenario: Diagnostic information export
- **WHEN** user needs to troubleshoot stream issues
- **THEN** the system provides export functionality for:
  - FFmpeg logs (last 1000 lines per stream)
  - Health check history (last 24 hours)
  - Segment validation results (failed validations only)
  - Error stack traces (detailed error information)
- **AND** exports as downloadable JSON file
- **AND** includes system information (FFmpeg version, OS, disk space)

---

### Requirement: Segment Validation and Quality Assurance
The system SHALL validate generated HLS segments for correctness, consistency, and quality before serving to clients, preventing playback issues from malformed or incomplete segments.

#### Scenario: Segment duration validation
- **WHEN** FFmpeg generates new HLS segment
- **THEN** the system validates segment duration using ffprobe
- **AND** confirms duration is 1.0s ± 10ms
- **AND** logs warning if duration out of tolerance
- **AND** retries segment generation if validation fails

#### Scenario: Keyframe presence validation
- **WHEN** segment validation executes
- **THEN** the system checks for keyframe at segment start using ffprobe
- **AND** confirms keyframe present for clean quality switching
- **AND** logs error if keyframe missing
- **AND** adjusts FFmpeg configuration if multiple segments fail validation

#### Scenario: Segment size consistency
- **WHEN** validating segments
- **THEN** the system checks segment file size against expected range for bitrate
- **AND** expected size = (bitrate × 1 second) ± 20%
- **AND** warns if size significantly different (indicates encoding issues)
- **AND** tracks size variance over time for quality trends

#### Scenario: Validation result logging
- **WHEN** segment validation completes
- **THEN** the system logs validation result (pass/fail, duration, size, keyframe)
- **AND** stores failed validation events in metrics store
- **AND** includes diagnostic information (FFmpeg stderr, segment metadata)
- **AND** makes validation history available via analytics API

#### Scenario: Automatic remediation
- **WHEN** segment validation consistently fails (>10% failure rate over 5 minutes)
- **THEN** the system attempts automatic remediation:
  - Restart FFmpeg with same configuration (try 1)
  - Adjust FFmpeg parameters if restart fails (try 2)
  - Reduce quality/bitrate if adjustment fails (try 3)
  - Alert operator if all remediation attempts fail
- **AND** logs all remediation attempts and results
