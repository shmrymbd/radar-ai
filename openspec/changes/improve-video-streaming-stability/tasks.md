# Tasks: Improve Video Streaming Stability

## Phase 1: FFmpeg Segment Stabilization (Critical) 🔴

### 1.1 Implement Constant Bitrate Mode
- [x] Add CBR configuration to video-stream-manager.ts
- [x] Set `-b:v`, `-maxrate`, and `-bufsize` for each quality level
- [ ] Test segment size consistency (should be ±10% variation)
- [ ] Verify no buffer overflow warnings in FFmpeg logs

### 1.2 Add Forced Keyframes
- [x] Implement `-force_key_frames "expr:gte(t,n_forced*1)"` parameter
- [x] Configure GOP size: `-g 30 -keyint_min 30` (30fps assumption)
- [ ] Validate keyframes occur at exactly 1s intervals using ffprobe
- [ ] Test quality switching at keyframe boundaries

### 1.3 Create Segment Validator
- [x] Create `src/lib/segment-validator.ts` module
- [x] Implement `validateSegment()` function (checks duration, keyframes, size)
- [x] Add ffprobe integration for segment analysis
- [ ] Write unit tests for validator
- [ ] Integrate validator into stream startup process

### 1.4 Test Segment Consistency
- [ ] Run 30-minute stream test for each quality level
- [ ] Verify all segments are 1.0s ± 10ms duration
- [ ] Check playlist entries show `#EXTINF:1.000000`
- [ ] Confirm no segment duration drift over time

**Acceptance Criteria**: All HLS segments across all quality levels are exactly 1.0s ± 10ms duration

---

## Phase 2: Stream Deduplication (High Priority) 🟠

### 2.1 Implement Stream Existence Check
- [x] Add `findExistingStream(cameraId)` method to VideoStreamManager
- [x] Check for active FFmpeg process before spawning new one
- [x] Verify stream health before reusing existing stream
- [x] Log when reusing vs creating new stream

### 2.2 Add Stream Reuse Logic
- [x] Modify `startStream()` to return existing stream if healthy
- [x] Track stream usage count (number of viewers)
- [x] Increment/decrement usage count on connect/disconnect
- [x] Keep stream alive while usage count > 0

### 2.3 Update Stream Lifecycle Management
- [x] Add `getStreamByCamera(cameraId)` method
- [x] Modify `stopStream()` to check usage count before terminating
- [x] Implement graceful degradation if stream unhealthy
- [x] Add comprehensive logging for lifecycle events

### 2.4 Test Deduplication
- [ ] Open 3 browser tabs to same camera
- [ ] Verify only 1 FFmpeg process spawned
- [ ] Close 2 tabs, verify stream stays alive
- [ ] Close last tab, verify stream terminates after timeout
- [ ] Check no orphaned FFmpeg processes remain

**Acceptance Criteria**: Maximum 1 FFmpeg process per active camera regardless of viewer count

---

## Phase 3: Health Monitoring & Auto-Recovery (High Priority) 🟠

### 3.1 Create StreamHealthMonitor Service
- [ ] Create `src/lib/stream-health-monitor.ts` module
- [ ] Implement singleton pattern for monitor instance
- [ ] Add `startMonitoring()` and `stopMonitoring()` methods
- [ ] Set up 30-second interval for health checks

### 3.2 Implement Health Check Metrics
- [ ] Check segment generation rate (should be ~1/second)
- [ ] Verify FFmpeg process is alive and responsive
- [ ] Monitor FFmpeg CPU usage (should be <80%)
- [ ] Check playlist updated within last 10 seconds
- [ ] Validate disk space > 1GB free
- [ ] Store health status in memory (or Redis)

### 3.3 Add Auto-Recovery Logic
- [ ] Track consecutive failed health checks (threshold: 3)
- [ ] Implement `restartStream(streamId)` method
- [ ] Gracefully terminate failed FFmpeg process
- [ ] Spawn new FFmpeg with same configuration
- [ ] Verify new stream starts successfully
- [ ] Log recovery attempts and results

### 3.4 Create Health API Endpoint
- [ ] Create `src/app/api/video/health/route.ts`
- [ ] Implement GET handler returning all stream health metrics
- [ ] Include: status, uptime, segment count, CPU usage, errors
- [ ] Format response as JSON with proper types
- [ ] Add error handling for unavailable metrics

### 3.5 Add WebSocket Health Notifications
- [ ] Integrate with unified-websocket-server.ts
- [ ] Broadcast health status changes to connected clients
- [ ] Send recovery notifications when streams restart
- [ ] Include stream ID, camera ID, and status in messages

### 3.6 Test Health Monitoring
- [ ] Start 4 camera streams
- [ ] Kill FFmpeg process manually
- [ ] Verify auto-recovery within 90 seconds (3 × 30s checks)
- [ ] Check WebSocket notification sent to clients
- [ ] Confirm VideoPlayer updates status indicator
- [ ] Validate no data loss during recovery

**Acceptance Criteria**: Streams auto-recover within 90 seconds of failure with <1% data loss

---

## Phase 4: Resource Cleanup (Medium Priority) 🟡

### 4.1 Create Cleanup Service
- [ ] Create `src/lib/stream-cleanup-service.ts` module
- [ ] Implement singleton pattern for cleanup service
- [ ] Add `startPeriodicCleanup()` method (hourly interval)
- [ ] Add `cleanupOldStreams(maxAgeHours)` method

### 4.2 Implement Last-Access Tracking
- [ ] Create `metadata.json` file in each stream directory
- [ ] Store: streamId, cameraId, startTime, lastAccessTime
- [ ] Update lastAccessTime when playlist/segments accessed
- [ ] Read metadata during cleanup to determine age

### 4.3 Add Cleanup Logic
- [ ] Scan `hls-output/` directory for stream folders
- [ ] Read metadata.json from each folder
- [ ] Check if lastAccessTime > 2 hours ago
- [ ] Verify stream is not in activeStreams list
- [ ] Remove directory recursively if inactive
- [ ] Log cleanup operations (stream ID, reason, disk space freed)

### 4.4 Implement Shutdown Hook
- [ ] Add `shutdown()` method to VideoStreamManager
- [ ] Gracefully terminate all FFmpeg processes (SIGTERM, then SIGKILL)
- [ ] Save stream metadata for potential resume
- [ ] Clean up temporary files
- [ ] Register shutdown hook with process.on('SIGTERM', ...)

### 4.5 Test Cleanup
- [ ] Start 4 camera streams
- [ ] Stop streams and wait 2+ hours (or mock time)
- [ ] Verify cleanup job removes old directories
- [ ] Check no active streams removed
- [ ] Restart server and verify graceful shutdown works
- [ ] Confirm no orphaned FFmpeg processes after shutdown

**Acceptance Criteria**: No stream directories older than 2 hours remain after cleanup runs

---

## Phase 5: Adaptive Bitrate Streaming (Medium Priority) 🟡

### 5.1 Configure Multi-Bitrate FFmpeg
- [ ] Update video-stream-manager.ts with multi-bitrate args
- [ ] Generate 3 quality levels: 1080p@2Mbps, 720p@1Mbps, 480p@500kbps
- [ ] Create separate output paths for each variant
- [ ] Set proper file naming: `{quality}_{segment}.ts`
- [ ] Test FFmpeg multi-output configuration

### 5.2 Generate Master Playlist
- [ ] Create `generateMasterPlaylist(streamId)` function
- [ ] Generate master.m3u8 with variant playlist references
- [ ] Include BANDWIDTH, RESOLUTION, and CODECS attributes
- [ ] Save master.m3u8 in stream directory
- [ ] Serve master.m3u8 via /api/video/hls/[...path]

### 5.3 Update VideoPlayer for ABR
- [ ] Modify VideoPlayer.tsx to load master.m3u8 instead of 1080p.m3u8
- [ ] Configure HLS.js ABR settings (enable auto level selection)
- [ ] Add quality level indicator UI (show current quality)
- [ ] Add manual quality selector (optional override)
- [ ] Display smooth quality transitions to user

### 5.4 Add Quality Switching Logic
- [ ] Configure HLS.js bandwidth estimation parameters
- [ ] Set buffer-based switching thresholds
- [ ] Implement smooth transition at keyframe boundaries
- [ ] Log quality switch events to console
- [ ] Track quality history for analytics

### 5.5 Test ABR
- [ ] Start stream and load in browser
- [ ] Throttle network to Slow 3G in DevTools
- [ ] Verify quality switches to 480p within 3 segments
- [ ] Restore normal network speed
- [ ] Verify quality switches back to 1080p within 5 segments
- [ ] Confirm no playback interruption during switches
- [ ] Test on real slow network connection

**Acceptance Criteria**: Quality adapts to network conditions within 3 segments with no playback stalls

---

## Phase 6: Analytics Dashboard (Low Priority) 🟢

### 6.1 Create Analytics API Endpoint
- [ ] Create `src/app/api/video/analytics/route.ts`
- [ ] Implement GET handler with query params: streamId, timeRange
- [ ] Return metrics: bitrate history, segment timeline, buffer levels, quality switches
- [ ] Add aggregate metrics: total bandwidth, avg quality, error count
- [ ] Format response as JSON with proper types

### 6.2 Implement Metrics Collection
- [ ] Add metrics tracking to VideoStreamManager
- [ ] Collect: segment generation timestamps, FFmpeg CPU usage, bandwidth usage
- [ ] Store metrics in Redis with TTL (keep last 24 hours)
- [ ] Add metrics to health check responses
- [ ] Create metrics aggregation functions

### 6.3 Create StreamAnalyticsDashboard Component
- [ ] Create `src/components/StreamAnalyticsDashboard.tsx`
- [ ] Add real-time bitrate graph (last 5 minutes, line chart)
- [ ] Add segment generation timeline (last 30 segments, bar chart)
- [ ] Add buffer health visualization (gauge chart)
- [ ] Add quality switching history (timeline chart)
- [ ] Use Recharts or similar charting library

### 6.4 Add System Metrics Panel
- [ ] Display active stream count (with status indicators)
- [ ] Show total bandwidth usage (sum across all streams)
- [ ] Display CPU/Memory per stream (table format)
- [ ] Show error rate and recovery count (last 24 hours)
- [ ] Add refresh button and auto-refresh (every 10s)

### 6.5 Integrate Analytics into Dashboard
- [ ] Add "Analytics" sub-tab to Video Streaming tab
- [ ] Add analytics panel to each camera view (expandable)
- [ ] Connect analytics to /api/video/analytics endpoint
- [ ] Add loading states and error handling
- [ ] Test with multiple cameras streaming simultaneously

### 6.6 Test Analytics Dashboard
- [ ] Start 4 camera streams
- [ ] Open analytics dashboard
- [ ] Verify all graphs update in real-time
- [ ] Throttle network and observe quality switch visualization
- [ ] Kill FFmpeg process and verify error count increments
- [ ] Check analytics data persists across page refresh

**Acceptance Criteria**: Analytics dashboard provides real-time visibility into all stream health metrics

---

## Phase 7: Integration Testing & Validation 🔵

### 7.1 End-to-End Stability Test
- [ ] Start 4 camera streams simultaneously
- [ ] Stream continuously for 8 hours without manual intervention
- [ ] Monitor for buffer stalls (target: <1 per hour)
- [ ] Verify segment duration consistency throughout test
- [ ] Check no memory leaks (stable memory usage over time)
- [ ] Validate CPU usage remains <20% per stream

### 7.2 Network Resilience Test
- [ ] Start 2 camera streams
- [ ] Simulate network interruption (disconnect camera for 30s)
- [ ] Verify auto-recovery restarts stream
- [ ] Check no data loss during recovery
- [ ] Test with varying disconnection durations (10s, 30s, 60s, 120s)
- [ ] Validate FFmpeg reconnection parameters working

### 7.3 Multi-User Concurrency Test
- [ ] Open 10 browser tabs viewing same camera
- [ ] Verify only 1 FFmpeg process spawned
- [ ] Close 5 tabs, verify stream stays alive
- [ ] Close remaining tabs, verify stream terminates after timeout
- [ ] Repeat test with 3 different cameras
- [ ] Check no resource leaks after test

### 7.4 Cleanup & Shutdown Test
- [ ] Start 4 camera streams
- [ ] Stop all streams manually
- [ ] Wait 2 hours (or mock time)
- [ ] Verify cleanup job removes directories
- [ ] Restart server (SIGTERM)
- [ ] Verify graceful shutdown of all FFmpeg processes
- [ ] Check no orphaned processes or files remain

### 7.5 Performance Benchmarking
- [ ] Measure segment generation latency (RTSP → HLS)
- [ ] Measure API response time for /api/video/health
- [ ] Measure WebSocket notification latency
- [ ] Monitor CPU usage during peak load (4 streams)
- [ ] Monitor memory usage over 8 hours
- [ ] Measure disk I/O during segment generation

### 7.6 User Acceptance Testing
- [ ] Traffic engineers stream 4 cameras for full shift (8 hours)
- [ ] No manual interventions required during shift
- [ ] Quality adapts transparently to network conditions
- [ ] Analytics dashboard provides useful insights
- [ ] No playback stalls or interruptions reported
- [ ] Collect user feedback on video quality and stability

**Acceptance Criteria**: System passes all integration tests with >99% uptime and <1 buffer stall per hour

---

## Phase 8: Documentation & Deployment 📝

### 8.1 Update Technical Documentation
- [ ] Update VIDEO_STREAMING_SETUP.md with ABR configuration
- [ ] Document new health monitoring endpoints
- [ ] Add troubleshooting section for common issues
- [ ] Create FFmpeg parameter reference guide
- [ ] Document cleanup service configuration

### 8.2 Update User Documentation
- [ ] Add user guide for quality indicator
- [ ] Explain auto-recovery behavior to users
- [ ] Document analytics dashboard features
- [ ] Create FAQ for common video issues
- [ ] Add best practices for network configuration

### 8.3 Update CLAUDE.md
- [ ] Add video streaming architecture notes
- [ ] Document ABR implementation patterns
- [ ] Add health monitoring guidelines
- [ ] Update troubleshooting section
- [ ] Add performance tuning tips

### 8.4 Create Deployment Checklist
- [ ] FFmpeg version requirements (4.4.0+ with libx264)
- [ ] Disk space requirements (10GB+ for HLS output)
- [ ] Network bandwidth requirements (10Mbps+ per camera)
- [ ] CPU requirements (2 cores per camera recommended)
- [ ] Redis configuration for metrics storage

### 8.5 Production Deployment
- [ ] Deploy to staging environment
- [ ] Run full integration test suite
- [ ] Monitor for 24 hours in staging
- [ ] Address any issues found
- [ ] Deploy to production with rollback plan
- [ ] Monitor production for 48 hours

**Acceptance Criteria**: All documentation updated and production deployment successful

---

## Summary

**Total Tasks**: 70 tasks across 8 phases
**Estimated Effort**: 3-4 weeks (1 developer)

**Priority Breakdown**:
- 🔴 Critical (Phase 1): 10 tasks - Complete first for segment stability
- 🟠 High (Phases 2-3): 18 tasks - Core reliability improvements
- 🟡 Medium (Phases 4-5): 18 tasks - Resource management and ABR
- 🟢 Low (Phase 6): 14 tasks - Enhanced visibility and monitoring
- 🔵 Integration (Phase 7): 10 tasks - Validation and testing
- 📝 Documentation (Phase 8): 10 tasks - Final deployment prep

**Key Milestones**:
1. Week 1: Phases 1-2 (Segment stability + deduplication)
2. Week 2: Phase 3 (Health monitoring + auto-recovery)
3. Week 3: Phases 4-5 (Cleanup + ABR)
4. Week 4: Phases 6-8 (Analytics + testing + deployment)
