# Fix HLS Video Streaming Buffer Stalls

**Change ID**: `fix-hls-streaming-buffer-stalls`
**Date**: 2025-10-28
**Status**: Proposed
**Priority**: Critical

## Why

The current HLS video streaming implementation experiences repeated `bufferStalledError` events causing playback stuttering and interruptions. Analysis reveals critical configuration issues:

**Critical Issues Identified:**
1. **Insufficient Buffer Size**: 0.6-second HLS segments with only 2 segments in playlist = 1.2 seconds total buffer (industry minimum: 3-5 seconds)
2. **Conflicting FFmpeg Parameters**: `probesize` and `analyzeduration` set twice with contradictory values, preventing proper stream analysis
3. **Inadequate HLS.js Configuration**: Missing buffer management settings, no error recovery, no adaptive quality
4. **Memory Leaks**: HLS.js instances not properly destroyed on component unmount
5. **No Stream Recovery**: Fatal errors crash playback with no auto-recovery mechanisms

**User Impact:**
- Video playback stalls every 2-3 seconds (repeatedly logged `bufferStalledError`)
- "No active stream found for camera" errors on initial load
- Buffer length critically low at 0.052 seconds (needs 3-5 seconds minimum)
- Poor user experience prevents effective traffic monitoring

**Evidence from Production Logs:**
```
bufferStalledError: Playback stalling at @2.427912 due to low buffer
buffer: 0.05208799999999991 seconds
```

## What Changes

**Fix HLS streaming stability and performance** by optimizing FFmpeg configuration, improving HLS.js buffer management, and implementing proper error recovery.

**Modified Files:**
- `dashboard/src/lib/video-stream-manager.ts` - Optimize FFmpeg HLS settings and remove conflicting parameters
- `dashboard/src/components/VideoPlayer.tsx` - Add comprehensive HLS.js configuration and error recovery
- `dashboard/src/app/api/video/streams/route.ts` - Add stream health monitoring

**New Capabilities:**
- Stable HLS buffering with 5-second minimum buffer (5× segments)
- Automatic error recovery for network and media errors
- Buffer health monitoring with visual feedback
- Memory leak prevention with proper HLS.js cleanup
- Improved stream startup reliability with extended timeouts

## Impact

**Benefits:**
- ✅ Eliminate buffer stall errors with proper segment sizing (1s segments × 5 = 5s buffer)
- ✅ Smooth video playback without stuttering or interruptions
- ✅ Automatic recovery from transient network issues
- ✅ Reduced memory usage with proper HLS.js cleanup
- ✅ Better user experience with connection status feedback
- ✅ Maintain 1-2 second end-to-end latency target

**Risks:**
- Low risk - changes are configuration optimizations and error handling improvements
- Increased memory usage from larger buffer (5s vs 1.2s) - negligible impact
- Slightly higher initial buffering time (1-2 seconds) - acceptable for stability

**Testing Required:**
- Verify no buffer stall errors under normal conditions
- Test automatic recovery from network interruptions
- Validate memory cleanup on component unmount
- Confirm 1-2 second latency maintained
- Load test with multiple concurrent camera streams

**Dependencies:**
- FFmpeg installed and available in PATH
- HLS.js library (already installed: ^1.6.13)
- Existing video-stream-manager infrastructure
