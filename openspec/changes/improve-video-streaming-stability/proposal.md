# Improve Video Streaming Stability

**Change ID**: `improve-video-streaming-stability`
**Date**: 2025-11-01
**Status**: Proposed
**Priority**: High

## Why

The current HLS video streaming implementation has critical stability and performance issues that degrade user experience and prevent reliable traffic monitoring:

### Critical Issues

1. **Inconsistent Segment Durations**: HLS segments vary from 0.6s to 1.36s (should be exactly 1.0s), causing buffer instability and playback stuttering
2. **Multiple Redundant Streams**: Duplicate FFmpeg processes for the same camera waste CPU/memory resources
3. **No Adaptive Bitrate (ABR)**: Single quality stream cannot adapt to varying network conditions, causing stalls
4. **Poor Resource Cleanup**: 18 orphaned stream directories accumulating in `hls-output/`, indicating cleanup failures
5. **No Health Monitoring**: Zero visibility into stream health, forcing manual investigation when issues occur
6. **Incomplete Previous Fix**: The `fix-hls-streaming-buffer-stalls` change (2025-10-27) was only 54% complete with no integration testing

### Evidence from Production

```bash
# Playlist shows variable segment durations (should be 1.0s consistently)
#EXTINF:1.240000,  segment_176.ts
#EXTINF:0.600000,  segment_177.ts
#EXTINF:1.200000,  segment_178.ts
#EXTINF:1.360000,  segment_179.ts
#EXTINF:0.600000,  segment_180.ts

# Duplicate FFmpeg processes for same camera
ffmpeg ... stream_camera_1761669396242_cpxhp6ard_1761934166504
ffmpeg ... stream_camera_1761669396242_cpxhp6ard_1761934167336

# 18 orphaned stream directories
stream_camera_*_1761907585679 ... stream_camera_*_1761934167336
```

### User Impact

- Video playback stutters every 2-3 seconds disrupting traffic monitoring
- Manual stream restarts required frequently
- No visibility when streams fail silently
- Wasted server resources from duplicate streams
- Cannot monitor traffic reliably during peak hours

## What Changes

**Implement production-grade video streaming** with adaptive bitrate, consistent segment generation, automated health monitoring, and comprehensive resource management.

### Solution Components

1. **Fix FFmpeg Segment Generation**
   - Enforce strict 1-second segment boundaries with `-force_key_frames`
   - Add constant bitrate mode (`-b:v` + `-maxrate` + `-bufsize`) for predictable segment sizes
   - Implement segment validation before serving to clients

2. **Add Adaptive Bitrate Streaming (ABR)**
   - Generate 3 quality levels: 1080p@2Mbps, 720p@1Mbps, 480p@500Kbps
   - Create HLS master playlist with variant streams
   - Allow HLS.js to automatically switch based on network conditions

3. **Implement Stream Deduplication**
   - Check for existing active streams before spawning FFmpeg
   - Reuse existing streams when possible
   - Implement proper stream lifecycle management

4. **Add Health Monitoring & Auto-Recovery**
   - Monitor segment generation rate (should be 1/second)
   - Track FFmpeg process health and CPU usage
   - Implement automatic restart for failed streams
   - Add WebSocket health status to frontend
   - Create `/api/video/health` endpoint with metrics

5. **Improve Resource Cleanup**
   - Implement periodic cleanup job (hourly)
   - Remove streams inactive for >2 hours
   - Track stream access times
   - Add cleanup on server shutdown

6. **Add Stream Analytics Dashboard**
   - Real-time bitrate graphs
   - Segment generation timeline
   - Buffer health visualization
   - Network quality indicators
   - FFmpeg process metrics

### Technical Approach

**FFmpeg Multi-Bitrate Configuration:**
```bash
# Master stream generation
ffmpeg -i rtsp://camera \
  # 1080p variant
  -map 0:v -map 0:a -c:v libx264 -b:v 2M -maxrate 2.2M -bufsize 4M \
  -s 1920x1080 -hls_segment_filename "1080p_%03d.ts" 1080p.m3u8 \
  # 720p variant
  -map 0:v -map 0:a -c:v libx264 -b:v 1M -maxrate 1.1M -bufsize 2M \
  -s 1280x720 -hls_segment_filename "720p_%03d.ts" 720p.m3u8 \
  # 480p variant
  -map 0:v -map 0:a -c:v libx264 -b:v 500k -maxrate 550k -bufsize 1M \
  -s 854x480 -hls_segment_filename "480p_%03d.ts" 480p.m3u8 \
  # Shared settings
  -force_key_frames "expr:gte(t,n_forced*1)" \
  -hls_time 1 -hls_list_size 10 \
  -hls_flags independent_segments+delete_segments
```

**Health Monitoring Service:**
```typescript
// New: StreamHealthMonitor.ts
class StreamHealthMonitor {
  // Monitor segment generation rate
  async checkSegmentRate(streamId: string): Promise<HealthStatus>

  // Monitor FFmpeg process
  async checkProcessHealth(streamId: string): Promise<ProcessStatus>

  // Auto-restart failed streams
  async autoRecover(streamId: string): Promise<boolean>

  // Periodic health checks (every 30s)
  startPeriodicMonitoring(): void
}
```

## Impact

### Benefits
- ✅ Smooth, stutter-free video playback with consistent 1s segments
- ✅ Automatic quality adaptation for varying network conditions (ABR)
- ✅ 50% reduction in server resources via stream deduplication
- ✅ 99% uptime with auto-recovery from stream failures
- ✅ Complete visibility into stream health via monitoring dashboard
- ✅ Cleaner filesystem with automated resource cleanup
- ✅ Better user experience during peak traffic monitoring hours

### Risks & Mitigation
- **Risk**: ABR requires more CPU for multi-quality encoding
  - **Mitigation**: Use hardware acceleration if available (`-c:v h264_nvenc`)
  - **Mitigation**: Limit to 3 quality levels (sufficient for most use cases)

- **Risk**: Complex FFmpeg configuration may be harder to debug
  - **Mitigation**: Comprehensive logging for each variant stream
  - **Mitigation**: Fallback to single-quality if multi-bitrate fails

- **Risk**: Monitoring service adds overhead
  - **Mitigation**: 30-second check interval (low overhead)
  - **Mitigation**: Run as separate thread to avoid blocking main process

### Testing Requirements
- ✅ Verify consistent 1.0s segment durations across all quality levels
- ✅ Test ABR switching during network throttling (Slow 3G → 4G transitions)
- ✅ Validate stream deduplication prevents duplicate FFmpeg processes
- ✅ Confirm auto-recovery restarts failed streams within 10 seconds
- ✅ Verify cleanup job removes orphaned streams correctly
- ✅ Load test: 4 cameras streaming simultaneously for 8 hours
- ✅ Network resilience test: Disconnect camera for 30s, should auto-recover

### Dependencies
- FFmpeg 4.4.0+ with libx264 (already installed)
- HLS.js 1.6.13+ with ABR support (already installed)
- Node.js child process monitoring capabilities (built-in)
- Redis or in-memory store for health metrics (Redis already available)

## Acceptance Criteria

1. **Segment Consistency**: All HLS segments are exactly 1.0s duration (±10ms tolerance)
2. **No Duplicate Streams**: Maximum 1 FFmpeg process per active camera
3. **ABR Switching**: Quality changes within 3 segments during network variations
4. **Auto-Recovery**: Failed streams restart automatically within 10 seconds
5. **Resource Cleanup**: No orphaned directories older than 2 hours
6. **Health Visibility**: Dashboard shows real-time stream health for all cameras
7. **Stability**: Continuous streaming for 8+ hours without manual intervention
8. **Performance**: CPU usage <20% per stream, memory stable over time
