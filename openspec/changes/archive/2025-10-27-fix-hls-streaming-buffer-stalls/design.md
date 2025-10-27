# Design: Fix HLS Streaming Buffer Stalls

## Problem Analysis

### Root Causes

**1. Insufficient HLS Buffer Configuration**
- Current: 0.6s segments × 2 segments = 1.2s total buffer
- Required: Minimum 3-5 seconds for stable playback
- Industry standard: 5-10 seconds for live streaming
- Problem: Buffer depletes faster than segments arrive → stalling

**2. Conflicting FFmpeg Parameters**
```bash
# Line 90-91: Initial settings
'-analyzeduration', '1000000',
'-probesize', '1000000',

# Line 113-114: Override with aggressive values
'-probesize', '32',           # ❌ Conflicts with line 91
'-analyzeduration', '0',      # ❌ Prevents proper stream analysis
```
- Result: FFmpeg cannot properly analyze RTSP stream
- Impact: Irregular segment generation, timing issues, buffer stalls

**3. Missing HLS.js Buffer Management**
- No `maxBufferLength` configuration
- No `maxBufferSize` limits
- No error recovery for media/network errors
- Default settings optimized for VOD, not live streaming

**4. No HLS Instance Cleanup**
- HLS.js instances not destroyed on component unmount
- Memory leaks accumulate with each camera view switch
- Event listeners and workers not properly cleaned up

## Solution Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     VideoPlayer.tsx                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  HLS.js Configuration                                 │ │
│  │  - maxBufferLength: 10s                              │ │
│  │  - maxMaxBufferLength: 15s                           │ │
│  │  - lowLatencyMode: true                              │ │
│  │  - Error recovery (network + media)                  │ │
│  │  - Buffer health monitoring                          │ │
│  └───────────────────────────────────────────────────────┘ │
│                          ↑ HLS stream                      │
└──────────────────────────┼────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────┐
│              /api/video/hls/[...path]                     │
│              Serves .m3u8 and .ts files                   │
└──────────────────────────┼────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────┐
│           video-stream-manager.ts                         │
│  ┌───────────────────────────────────────────────────────┐│
│  │  FFmpeg Configuration                                 ││
│  │  - hls_time: 1s (instead of 0.6s)                   ││
│  │  - hls_list_size: 5 (instead of 2)                  ││
│  │  - Remove conflicting parameters                     ││
│  │  - Add stability improvements                        ││
│  │  - Extended startup timeout (30s)                    ││
│  └───────────────────────────────────────────────────────┘│
│                          ↑ RTSP stream                     │
└──────────────────────────┼────────────────────────────────┘
                           │
                    Camera (RTSP)
```

### Key Design Decisions

**Decision 1: Segment Size and Playlist Length**
- **Choice**: 1-second segments with 5-segment playlist
- **Rationale**:
  - 5 seconds buffer provides stability without excessive latency
  - 1-second segments are industry standard for low-latency HLS
  - Balance between buffer health and real-time requirements
- **Alternatives Considered**:
  - 0.5s × 10 segments: More overhead, same buffer, higher CPU
  - 2s × 3 segments: Simpler but 2s latency per segment unacceptable

**Decision 2: FFmpeg Parameter Cleanup**
- **Choice**: Remove lines 113-115 (conflicting parameters)
- **Rationale**:
  - Line 90-91 settings are reasonable (1-2 seconds analysis)
  - Lines 113-115 override with aggressive/broken values
  - Removing conflicts allows FFmpeg proper stream analysis
- **Alternatives Considered**:
  - Keep both: Would maintain bugs
  - Use only aggressive settings: Causes irregular segments

**Decision 3: HLS.js Buffer Configuration**
- **Choice**: Explicit buffer limits with error recovery
- **Rationale**:
  - Defaults are for VOD (video on demand), not live streams
  - Need smaller buffers with automatic catchup for live streaming
  - Error recovery prevents permanent failures from transient issues
- **Key Settings**:
  - `maxBufferLength: 10` - Target buffer (balance latency/stability)
  - `maxMaxBufferLength: 15` - Maximum buffer (prevents runaway buffering)
  - `liveSyncDurationCount: 3` - Stay close to live edge
  - `fragLoadingMaxRetry: 6` - Retry fragments on failure

**Decision 4: Error Recovery Strategy**
- **Choice**: Automatic recovery for non-fatal errors, user notification for fatal
- **Rationale**:
  - Network hiccups are transient - auto-recover with `hls.startLoad()`
  - Media errors are often recoverable - try `hls.recoverMediaError()`
  - Only show error UI for unrecoverable failures
- **User Experience**:
  - Non-fatal errors: Silent recovery, log to console
  - Fatal network error: Retry automatically once, then notify
  - Fatal media error: Attempt recovery, then notify if fails

**Decision 5: Memory Management**
- **Choice**: Store HLS instance in ref and destroy on cleanup
- **Rationale**:
  - React cleanup functions must destroy external resources
  - HLS.js spawns workers and event listeners that leak without cleanup
  - Using ref allows proper cleanup even if component unmounts during playback

### Implementation Phases

**Phase 1: FFmpeg Configuration (Critical)**
- Update `hls_time` from 0.6s to 1s
- Update `hls_list_size` from 2 to 5
- Remove conflicting parameters (lines 113-115)
- Add stability parameters (`-rtbufsize`, `-reconnect` flags)
- Test: Verify segments are 1s and playlist has 5 segments

**Phase 2: HLS.js Buffer Configuration (Critical)**
- Add comprehensive HLS.js config object
- Implement buffer health monitoring
- Add visual feedback for buffer status
- Test: Verify buffer stays above 1 second, no stall errors

**Phase 3: Error Recovery (High Priority)**
- Implement network error recovery (`hls.startLoad()`)
- Implement media error recovery (`hls.recoverMediaError()`)
- Add retry logic for fatal errors (1 retry, then notify)
- Test: Simulate network interruptions, verify auto-recovery

**Phase 4: Memory Management (High Priority)**
- Add HLS instance ref
- Implement cleanup in useEffect return
- Verify no event listener leaks
- Test: Switch cameras 20 times, check memory usage stable

**Phase 5: Extended Timeouts (Medium Priority)**
- Increase playlist wait timeout from 10s to 30s
- Improve waitForPlaylist to verify segment existence
- Add health check endpoint for stream status
- Test: Start multiple streams, verify all initialize successfully

### Performance Considerations

**Memory Impact:**
- Old: 1.2s buffer × 1-2MB/s bitrate = 1.4-2.4MB per stream
- New: 5s buffer × 1-2MB/s bitrate = 5-10MB per stream
- Increase: ~3-8MB per stream (negligible on modern devices)
- With 4 concurrent cameras: ~32MB increase (acceptable)

**Latency Impact:**
- Target: 1-2 second end-to-end latency
- FFmpeg encode: ~200-400ms
- Network transmission: ~100-300ms
- HLS.js buffer: ~500-1000ms (tunable via `liveSyncDurationCount`)
- Total: ~1.5-2 seconds (meets requirement)

**CPU Impact:**
- Larger segments (1s vs 0.6s): 40% fewer segment writes
- Reduced FFmpeg overhead from proper analysis
- HLS.js worker mode: offloads parsing to background thread
- Net result: Slightly lower CPU usage despite larger buffer

### Testing Strategy

**Unit Tests:**
- FFmpeg argument generation
- HLS.js configuration object creation
- Error recovery logic

**Integration Tests:**
- Stream startup and initialization
- Buffer health under normal conditions
- Network interruption recovery
- Camera switching and cleanup

**Load Tests:**
- 4 concurrent camera streams
- Memory usage over 1 hour
- Buffer stability with varying network conditions

**Manual Tests:**
- Visual inspection: smooth playback, no stuttering
- Network throttling: verify auto-recovery
- Camera switch: no memory leaks
- Error scenarios: appropriate user feedback

### Rollback Plan

If issues arise after deployment:

1. **Immediate**: Revert FFmpeg config to increase buffer only
   - Change `hls_list_size` back to 2 but keep 1s segments
   - This doubles buffer from 1.2s to 2s (partial fix)

2. **If still issues**: Revert all HLS.js changes
   - Keep original HLS.js config
   - Focus only on FFmpeg improvements

3. **Full rollback**: Revert entire change
   - Git revert commit
   - Monitor for original buffer stall errors
   - Requires different solution approach

### Future Enhancements

**Adaptive Bitrate Streaming (ABR):**
- Generate multiple quality levels in FFmpeg
- Let HLS.js automatically switch based on bandwidth
- Requires more complex FFmpeg command and storage

**DVR Functionality:**
- Keep longer segment history (30+ segments)
- Allow users to scrub back in time
- Useful for incident review

**WebRTC Alternative:**
- Lower latency (~500ms) compared to HLS (1-2s)
- More complex infrastructure (signaling server)
- Consider if 1s latency proves insufficient
