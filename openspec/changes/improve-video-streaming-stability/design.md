# Design: Improve Video Streaming Stability

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          RTSP Camera Sources                              │
└───────────────────────┬───────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    VideoStreamManager (Enhanced)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Stream Lifecycle Management                                      │   │
│  │  • Deduplication: Check existing streams before spawning         │   │
│  │  • Process pooling: Reuse FFmpeg instances when possible         │   │
│  │  • Graceful shutdown: Clean termination of all streams           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FFmpeg Multi-Bitrate Encoder                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  1080p@2Mbps │  │  720p@1Mbps  │  │  480p@500kbps│                   │
│  │  • CBR mode  │  │  • CBR mode  │  │  • CBR mode  │                   │
│  │  • 1s segments│ │  • 1s segments│ │  • 1s segments│                  │
│  │  • keyframes  │  │  • keyframes │  │  • keyframes │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│         │                  │                  │                           │
│         └──────────────────┴──────────────────┘                           │
└───────────────────────┬───────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      HLS Output & Validation                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  hls-output/                                                      │   │
│  │  ├── stream_camera1_123456/                                      │   │
│  │  │   ├── master.m3u8 (variant playlist)                          │   │
│  │  │   ├── 1080p.m3u8, 1080p_*.ts                                  │   │
│  │  │   ├── 720p.m3u8, 720p_*.ts                                    │   │
│  │  │   └── 480p.m3u8, 480p_*.ts                                    │   │
│  │  └── stream_camera2_123457/ (...)                                │   │
│  │                                                                    │   │
│  │  Segment Validator:                                               │   │
│  │  • Verify duration = 1.0s ± 10ms                                 │   │
│  │  • Check keyframe at start                                       │   │
│  │  • Validate file size consistency                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    StreamHealthMonitor (New)                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Health Checks (every 30s):                                      │   │
│  │  • Segment generation rate (should be ~1/second)                 │   │
│  │  • FFmpeg process alive & CPU < 80%                              │   │
│  │  • Playlist updated within last 10s                              │   │
│  │  • Disk space sufficient (> 1GB free)                            │   │
│  │                                                                    │   │
│  │  Auto-Recovery:                                                   │   │
│  │  • Restart stream if checks fail 3 consecutive times             │   │
│  │  • Log failures to Redis for dashboard display                   │   │
│  │  • Notify via WebSocket when recovery occurs                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Resource Cleanup Service (New)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Hourly Cleanup Job:                                              │   │
│  │  • Scan hls-output/ for stream directories                       │   │
│  │  • Check last access time (track via metadata file)              │   │
│  │  • Remove directories inactive > 2 hours                          │   │
│  │  • Log cleanup operations                                         │   │
│  │                                                                    │   │
│  │  Shutdown Hook:                                                   │   │
│  │  • Gracefully terminate all FFmpeg processes                     │   │
│  │  • Save stream metadata for potential resume                     │   │
│  │  • Clean up temporary files                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes (Enhanced)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /api/video/hls/[...path] - Serve HLS playlists & segments      │   │
│  │  /api/video/streams - Start/stop streams (with deduplication)    │   │
│  │  /api/video/health - NEW: Stream health metrics & status         │   │
│  │  /api/video/analytics - NEW: Stream analytics data               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Enhanced VideoPlayer Component                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  HLS.js with ABR:                                                 │   │
│  │  • Auto-select quality based on bandwidth                        │   │
│  │  • Switch between 1080p/720p/480p seamlessly                     │   │
│  │  • Display current quality to user                               │   │
│  │                                                                    │   │
│  │  Health Indicators:                                               │   │
│  │  • Buffer level gauge (0-10s)                                    │   │
│  │  • Current bitrate display                                        │   │
│  │  • Network quality indicator (Excellent/Good/Poor)               │   │
│  │  • Stream uptime counter                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Stream Analytics Dashboard (New)                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Real-time Graphs:                                                │   │
│  │  • Bitrate over time (last 5 minutes)                            │   │
│  │  • Segment generation timeline                                    │   │
│  │  • Buffer health visualization                                    │   │
│  │  • Quality switching history                                      │   │
│  │                                                                    │   │
│  │  System Metrics:                                                  │   │
│  │  • Active streams count                                           │   │
│  │  • Total bandwidth usage                                          │   │
│  │  • CPU/Memory per stream                                          │   │
│  │  • Error rate & recovery count                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Constant Bitrate (CBR) Mode

**Decision**: Use CBR instead of Variable Bitrate (VBR)

**Rationale**:
- CBR produces predictable segment sizes (±10% variation)
- Easier to buffer and manage on client side
- Prevents buffer stalls from oversized segments
- Simplifies bandwidth estimation for ABR algorithm

**Implementation**:
```bash
-b:v 2M -maxrate 2.2M -bufsize 4M  # 1080p
-b:v 1M -maxrate 1.1M -bufsize 2M  # 720p
-b:v 500k -maxrate 550k -bufsize 1M # 480p
```

### 2. Forced Keyframes Every 1 Second

**Decision**: Insert keyframes at exact 1-second intervals

**Rationale**:
- Ensures segments can be cut at exact 1s boundaries
- Enables quick quality switching (can only switch at keyframes)
- Prevents segment duration drift over time
- Industry standard for HLS ABR

**Implementation**:
```bash
-force_key_frames "expr:gte(t,n_forced*1)"  # Keyframe every 1 second
-g 30 -keyint_min 30  # Max 30 frames between keyframes (30fps)
```

### 3. Stream Deduplication Strategy

**Decision**: Check for existing streams before spawning new FFmpeg

**Rationale**:
- Prevents resource waste from duplicate streams
- Current system creates 2+ streams for same camera (bug)
- Single stream can serve multiple dashboard viewers
- Reduces server load by 50%+ in multi-user scenarios

**Implementation**:
```typescript
// Before starting stream:
const existingStream = this.getStreamByCamera(cameraId);
if (existingStream && existingStream.isHealthy()) {
  return { streamId: existingStream.streamId, hlsUrl: existingStream.hlsUrl };
}
```

### 4. Health Monitoring Approach

**Decision**: Separate monitoring service with 30s check interval

**Rationale**:
- Decouples monitoring from stream generation
- 30s interval balances responsiveness vs overhead
- Can monitor multiple streams efficiently
- Enables proactive recovery before user notices

**Metrics to Monitor**:
1. **Segment Generation Rate**: Should be ~1 segment/second
2. **FFmpeg Process Health**: CPU < 80%, process alive
3. **Playlist Freshness**: Updated within last 10s
4. **Disk Space**: > 1GB free for segment storage

### 5. Auto-Recovery Policy

**Decision**: Restart stream after 3 consecutive failed health checks

**Rationale**:
- 3 failures = ~90s of issues (3 × 30s intervals)
- Avoids false positives from transient network blips
- Gives FFmpeg time to recover on its own
- User experiences max 90s downtime (acceptable for monitoring)

**Recovery Sequence**:
1. Log failure to Redis for dashboard display
2. Terminate existing FFmpeg process gracefully
3. Wait 5s for cleanup
4. Spawn new FFmpeg with same configuration
5. Verify new stream starts successfully
6. Notify connected clients via WebSocket

### 6. Cleanup Strategy

**Decision**: Hourly cleanup job + shutdown hook

**Rationale**:
- Hourly frequency prevents disk filling without excessive overhead
- 2-hour threshold allows resume if user briefly navigates away
- Shutdown hook ensures clean state on server restart
- Prevents accumulation of orphaned directories (currently 18+)

**Cleanup Logic**:
```typescript
// Every hour:
for (const streamDir of allStreamDirs) {
  const lastAccess = getLastAccessTime(streamDir);
  if (now - lastAccess > 2 * HOUR && !isActiveStream(streamDir)) {
    removeDirectory(streamDir);
    logCleanup(streamDir);
  }
}
```

### 7. Adaptive Bitrate (ABR) Configuration

**Decision**: 3 quality levels with HLS.js auto-selection

**Rationale**:
- 3 levels sufficient for most network conditions (mobile/wifi/broadband)
- HLS.js has mature ABR algorithm (bandwidth-based + buffer-based)
- More levels = more CPU cost without proportional benefit
- Covers common bandwidth ranges: <1Mbps, 1-2Mbps, >2Mbps

**Quality Levels**:
| Level | Resolution | Bitrate | Use Case |
|-------|-----------|---------|----------|
| High | 1920x1080 | 2 Mbps | Broadband, local network |
| Medium | 1280x720 | 1 Mbps | WiFi, mobile 4G |
| Low | 854x480 | 500 Kbps | Mobile 3G, poor network |

### 8. Segment Validation

**Decision**: Validate segments before serving to clients

**Rationale**:
- Catches issues early before they cause playback errors
- Can retry generation if validation fails
- Provides diagnostic data for troubleshooting
- Prevents serving corrupt segments

**Validation Checks**:
```typescript
async validateSegment(segmentPath: string): Promise<ValidationResult> {
  // 1. Check file exists and size > 0
  // 2. Verify duration = 1.0s ± 10ms (using ffprobe)
  // 3. Check for keyframe at start (using ffprobe)
  // 4. Validate file size within expected range for bitrate
  return { valid: true, duration: 1.002, hasKeyframe: true };
}
```

## File Structure Changes

```
dashboard/
├── src/
│   ├── lib/
│   │   ├── video-stream-manager.ts (MODIFIED - add ABR, deduplication)
│   │   ├── stream-health-monitor.ts (NEW)
│   │   ├── stream-cleanup-service.ts (NEW)
│   │   └── segment-validator.ts (NEW)
│   │
│   ├── components/
│   │   ├── VideoPlayer.tsx (MODIFIED - add ABR UI, health indicators)
│   │   └── StreamAnalyticsDashboard.tsx (NEW)
│   │
│   └── app/api/video/
│       ├── health/route.ts (NEW)
│       ├── analytics/route.ts (NEW)
│       └── streams/route.ts (MODIFIED - add deduplication)
│
└── hls-output/ (CLEANED - automated cleanup)
    ├── stream_camera1_123456/
    │   ├── master.m3u8 (NEW - variant playlist)
    │   ├── 1080p.m3u8, 1080p_*.ts
    │   ├── 720p.m3u8, 720p_*.ts
    │   ├── 480p.m3u8, 480p_*.ts
    │   └── metadata.json (NEW - for cleanup tracking)
    └── stream_camera2_123457/ (...)
```

## Implementation Phases

### Phase 1: FFmpeg Segment Stabilization (Priority: Critical)
- Add CBR mode configuration
- Implement forced keyframes
- Add segment validation
- **Expected Result**: Consistent 1.0s segments

### Phase 2: Stream Deduplication (Priority: High)
- Add stream existence check
- Implement stream reuse logic
- Track stream usage count
- **Expected Result**: Max 1 FFmpeg per camera

### Phase 3: Health Monitoring (Priority: High)
- Create StreamHealthMonitor service
- Implement health check metrics
- Add auto-recovery logic
- Create /api/video/health endpoint
- **Expected Result**: 99% uptime with auto-recovery

### Phase 4: Resource Cleanup (Priority: Medium)
- Implement hourly cleanup job
- Add last-access tracking
- Create shutdown hook
- **Expected Result**: No orphaned directories

### Phase 5: Adaptive Bitrate (Priority: Medium)
- Configure FFmpeg for multi-bitrate output
- Create master playlist
- Update VideoPlayer for ABR
- Add quality indicator UI
- **Expected Result**: Smooth quality transitions

### Phase 6: Analytics Dashboard (Priority: Low)
- Create StreamAnalyticsDashboard component
- Implement metrics collection
- Add real-time graphs
- Create /api/video/analytics endpoint
- **Expected Result**: Full visibility into stream health

## Performance Targets

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Segment Duration Consistency | 0.6s-1.36s (variable) | 1.0s ± 10ms | 100% consistent |
| FFmpeg Processes (4 cameras) | 8+ (duplicates) | 4 (one per camera) | 50% reduction |
| Stream Uptime | ~95% (manual restarts) | 99% (auto-recovery) | +4% |
| Orphaned Directories | 18+ accumulating | 0 (automated cleanup) | 100% cleaned |
| Buffer Stalls (per hour) | 10-20 stalls | <1 stall | 95% reduction |
| Quality Adaptation | None (fixed quality) | <3s adaptation | New capability |
| Resource Usage (per stream) | 15-20% CPU | <12% CPU | 40% reduction |

## Testing Strategy

### Unit Tests
- Segment validator function tests
- Health check logic tests
- Cleanup service tests
- FFmpeg configuration builder tests

### Integration Tests
- Multi-bitrate stream generation
- ABR quality switching
- Auto-recovery from failures
- Cleanup job execution

### Performance Tests
- 4 cameras × 8 hours continuous streaming
- Network throttling (Slow 3G ↔ 4G transitions)
- Rapid camera switching (20 switches in 2 minutes)
- Resource usage monitoring (CPU/Memory/Disk)

### User Acceptance Tests
- Traffic engineers can monitor reliably for full shifts
- Quality adapts transparently to network conditions
- Stream failures recover without user intervention
- Analytics dashboard provides useful insights
