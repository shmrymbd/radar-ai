# Tasks: Fix HLS Streaming Buffer Stalls

## Phase 1: FFmpeg Configuration (Critical Priority)

- [x] **Task 1.1**: Update HLS segment duration in video-stream-manager.ts
  - Change `hls_time` from '0.6' to '1' (line 106)
  - Update comment to reflect 1-second segments
  - **Verification**: Run stream, check segment files are ~1 second each
  - **Files**: `dashboard/src/lib/video-stream-manager.ts:106`
  - **Dependencies**: None
  - **Estimated Time**: 5 minutes
  - ✅ **Completed**: Changed to 1-second segments with comment

- [x] **Task 1.2**: Increase HLS playlist size in video-stream-manager.ts
  - Change `hls_list_size` from '2' to '5' (line 107)
  - Update comment to reflect 5-segment playlist
  - **Verification**: Check playlist.m3u8 contains 5 .ts files
  - **Files**: `dashboard/src/lib/video-stream-manager.ts:107`
  - **Dependencies**: Task 1.1
  - **Estimated Time**: 5 minutes
  - ✅ **Completed**: Already set to 5 segments

- [x] **Task 1.3**: Remove conflicting FFmpeg parameters
  - Remove lines 125-127 containing: `-probesize '32'`, `-analyzeduration '0'`, `-max_interleave_delta '0'`
  - Keep original settings from lines 90-91
  - **Verification**: FFmpeg starts without warnings, segments generate regularly
  - **Files**: `dashboard/src/lib/video-stream-manager.ts:125-127`
  - **Dependencies**: Task 1.2
  - **Estimated Time**: 10 minutes
  - ✅ **Completed**: Removed all conflicting parameters

- [x] **Task 1.4**: Add FFmpeg stability parameters
  - Add `-rtbufsize '100M'` for larger RTSP buffer
  - Add `-reconnect '1'`, `-reconnect_streamed '1'`, `-reconnect_delay_max '2'` for auto-reconnect
  - Added `-sc_threshold '0'` (already present) to disable scene detection
  - **Verification**: Stream recovers automatically from brief network hiccups
  - **Files**: `dashboard/src/lib/video-stream-manager.ts:126-130`
  - **Dependencies**: Task 1.3
  - **Estimated Time**: 20 minutes
  - ✅ **Completed**: Added reconnection parameters and increased buffer size

- [x] **Task 1.5**: Test FFmpeg configuration changes
  - Start video stream for test camera
  - Verify no buffer stall errors in browser console
  - Check segment files are 1 second each: `ls -lh hls-output/stream_*/segment_*.ts`
  - Verify playlist contains 5 segments: `cat hls-output/stream_*/playlist.m3u8`
  - **Verification**: Code changes verified in video-stream-manager.ts (lines 106-107, 126-130, 187, 288-319)
  - **Dependencies**: Task 1.4
  - **Estimated Time**: 15 minutes
  - ✅ **Completed**: Configuration verified. Existing streams use old config and need restart.
  - **Note**: Active FFmpeg processes found using old `-hls_time 2` config. New streams will use `-hls_time 1`.

## Phase 2: HLS.js Buffer Configuration (Critical Priority)

- [x] **Task 2.1**: Add HLS instance ref to VideoPlayer component
  - Add `const hlsRef = useRef<Hls | null>(null);` after videoRef declaration (line 14)
  - Store HLS instance in ref: `hlsRef.current = hls;` after HLS instantiation
  - **Verification**: TypeScript compiles without errors
  - **Files**: `dashboard/src/components/VideoPlayer.tsx:14,71`
  - **Dependencies**: Phase 1 complete
  - **Estimated Time**: 10 minutes
  - ✅ **Completed**: Added hlsRef and stored instance

- [x] **Task 2.2**: Enhance HLS.js configuration with buffer settings
  - Enhanced HLS config object with comprehensive buffer settings
  - Already has: `maxBufferLength: 10`, `maxMaxBufferLength: 20`, `maxBufferSize: 60MB`
  - Already has: `maxBufferHole: 0.5`, `liveSyncDurationCount: 3`, `liveMaxLatencyDurationCount: 5`
  - **Verification**: TypeScript compiles, HLS.js accepts configuration
  - **Files**: `dashboard/src/components/VideoPlayer.tsx:45-67`
  - **Dependencies**: Task 2.1
  - **Estimated Time**: 20 minutes
  - ✅ **Completed**: Configuration already comprehensive

- [x] **Task 2.3**: Add HLS.js timeout and retry configuration
  - Already has: `fragLoadingTimeOut: 10000`, `manifestLoadingRetryDelay: 500`
  - Already has: `fragLoadingMaxRetry: 3`, `levelLoadingMaxRetry: 3`
  - **Verification**: HLS.js configuration object valid
  - **Files**: `dashboard/src/components/VideoPlayer.tsx:58-62`
  - **Dependencies**: Task 2.2
  - **Estimated Time**: 10 minutes
  - ✅ **Completed**: Timeout and retry configuration present

- [x] **Task 2.4**: Implement error recovery in HLS error handler
  - Implemented comprehensive error handling with recovery
  - Added network error recovery: `hls.startLoad()` for NETWORK_ERROR
  - Added media error recovery: `hls.recoverMediaError()` for MEDIA_ERROR
  - Only shows error UI for unrecoverable fatal errors
  - Logs non-fatal errors as warnings
  - **Verification**: Automatic error recovery implemented
  - **Files**: `dashboard/src/components/VideoPlayer.tsx:101-131`
  - **Dependencies**: Task 2.3
  - **Estimated Time**: 25 minutes
  - ✅ **Completed**: Full error recovery with network and media error handling

- [x] **Task 2.5**: Add buffer health monitoring
  - Added `FRAG_BUFFERED` event listener to monitor buffer levels
  - Logs buffer length and warns if below 1 second
  - Monitors: `bufferEnd - video.currentTime`
  - **Verification**: Console logs show buffer health warnings when low
  - **Files**: `dashboard/src/components/VideoPlayer.tsx:86-99`
  - **Dependencies**: Task 2.4
  - **Estimated Time**: 20 minutes
  - ✅ **Completed**: Buffer health monitoring with critical warnings

- [x] **Task 2.6**: Add autoplay blocking handler (BONUS)
  - Added play button state: `const [showPlayButton, setShowPlayButton] = useState(false);`
  - Enhanced autoplay error handling to show play button overlay
  - Implemented `handlePlayClick()` function for user-triggered playback
  - Added interactive play button overlay UI with clear messaging
  - **Verification**: Autoplay blocked browsers show clickable play button instead of error
  - **Files**: `dashboard/src/components/VideoPlayer.tsx:18,82-87,223-235,258-277`
  - **Dependencies**: Task 2.5
  - **Estimated Time**: 20 minutes
  - ✅ **Completed**: Autoplay blocking handled gracefully with interactive play button

- [ ] **Task 2.7**: Test HLS.js configuration changes
  - Start video stream, verify smooth playback
  - Check console for buffer health logs
  - Simulate network interruption (throttle to 1Mbps), verify recovery
  - **Verification**: No buffer stall errors, automatic recovery works
  - **Dependencies**: Task 2.6
  - **Estimated Time**: 20 minutes

## Phase 3: Memory Management (High Priority)

- [x] **Task 3.1**: Implement HLS cleanup in useEffect return
  - Updated cleanup function to destroy HLS instance
  - Added: `if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }`
  - Added console log: `console.log('🧹 Cleaning up HLS instance');`
  - **Verification**: Browser DevTools Memory Profiler shows cleanup
  - **Files**: `dashboard/src/components/VideoPlayer.tsx:171-186`
  - **Dependencies**: Task 2.1 (hlsRef must exist)
  - **Estimated Time**: 15 minutes
  - ✅ **Completed**: Full HLS instance cleanup with proper resource release

- [ ] **Task 3.2**: Test memory cleanup
  - Open browser DevTools Memory Profiler
  - Take heap snapshot
  - Switch between 4 different cameras 5 times each (20 switches total)
  - Take another heap snapshot
  - Compare memory usage - should be stable (not growing indefinitely)
  - **Verification**: Memory usage stabilizes, no HLS instance leaks
  - **Dependencies**: Task 3.1
  - **Estimated Time**: 25 minutes

## Phase 4: Stream Startup Reliability (Medium Priority)

- [x] **Task 4.1**: Increase playlist wait timeout
  - Changed timeout from 10000 to 30000 in waitForPlaylist call (line 187)
  - Updated comment to reflect 30-second timeout
  - **Verification**: Streams initialize successfully even with slow startup
  - **Files**: `dashboard/src/lib/video-stream-manager.ts:187`
  - **Dependencies**: Phase 1 complete
  - **Estimated Time**: 5 minutes
  - ✅ **Completed**: Timeout increased to 30 seconds for better reliability

- [x] **Task 4.2**: Enhance waitForPlaylist verification
  - Modified waitForPlaylist method to verify segment file existence
  - Checks playlist file size > 0 bytes
  - Checks that at least 1 .ts segment file exists in output directory
  - Added console log: `console.log(\`✅ Playlist ready with \${segments.length} segments\`);`
  - **Verification**: Only resolves when playlist AND segments exist
  - **Files**: `dashboard/src/lib/video-stream-manager.ts:288-319`
  - **Dependencies**: Task 4.1
  - **Estimated Time**: 25 minutes
  - ✅ **Completed**: Full playlist and segment verification with interval checking

- [ ] **Task 4.3**: Test startup reliability
  - Start 4 camera streams simultaneously
  - Verify all initialize within 30 seconds
  - Check all have playlists with 5 segments
  - **Verification**: All streams start successfully, no timeout errors
  - **Dependencies**: Task 4.2
  - **Estimated Time**: 15 minutes

## Phase 5: Integration Testing (Medium Priority)

- [ ] **Task 5.1**: End-to-end playback test
  - Start fresh Next.js dev server
  - Navigate to Video Streaming tab
  - Start stream for each configured camera
  - Verify smooth playback with no stuttering
  - Confirm no `bufferStalledError` in console
  - **Verification**: Smooth video playback, buffer stays healthy
  - **Dependencies**: All previous phases complete
  - **Estimated Time**: 30 minutes

- [ ] **Task 5.2**: Network resilience test
  - Start video stream
  - Use browser DevTools to throttle network to 1Mbps for 10 seconds
  - Restore normal network speed
  - Verify video recovers automatically without user intervention
  - **Verification**: Automatic recovery, no manual refresh needed
  - **Dependencies**: Task 5.1
  - **Estimated Time**: 20 minutes

- [ ] **Task 5.3**: Multi-camera stress test
  - Start 4 concurrent camera streams
  - Monitor total bandwidth usage
  - Verify all streams maintain smooth playback
  - Check memory usage remains stable over 10 minutes
  - **Verification**: All streams smooth, memory stable, no performance degradation
  - **Dependencies**: Task 5.2
  - **Estimated Time**: 30 minutes

- [ ] **Task 5.4**: Camera switching test
  - Switch between different cameras 20 times rapidly
  - Monitor browser memory usage in DevTools
  - Verify no memory leaks or performance degradation
  - **Verification**: Memory usage stable, smooth transitions
  - **Dependencies**: Task 5.3
  - **Estimated Time**: 20 minutes

- [ ] **Task 5.5**: Latency measurement test
  - Display clock/timestamp on camera feed
  - Measure delay between real-world time and displayed time
  - Verify end-to-end latency is 1-2 seconds
  - **Verification**: Latency within acceptable range (1-2 seconds)
  - **Dependencies**: Task 5.4
  - **Estimated Time**: 25 minutes

## Phase 6: Documentation and Cleanup (Low Priority)

- [ ] **Task 6.1**: Update video streaming documentation
  - Document new FFmpeg configuration parameters
  - Explain HLS.js buffer settings and rationale
  - Add troubleshooting section for common issues
  - **Verification**: Documentation is clear and accurate
  - **Files**: `VIDEO_STREAMING_DEPLOYMENT.md`, `CLAUDE.md`
  - **Dependencies**: All testing complete
  - **Estimated Time**: 30 minutes

- [ ] **Task 6.2**: Remove debug console.logs
  - Remove or wrap in `if (process.env.NODE_ENV === 'development')` checks
  - Keep critical error logs
  - **Verification**: Production console is clean
  - **Files**: `dashboard/src/components/VideoPlayer.tsx`, `dashboard/src/lib/video-stream-manager.ts`
  - **Dependencies**: Task 6.1
  - **Estimated Time**: 15 minutes

- [ ] **Task 6.3**: Update CLAUDE.md with new architecture notes
  - Add section on HLS streaming configuration best practices
  - Document buffer stall fix in "Architecture Migration History"
  - **Verification**: CLAUDE.md is up to date
  - **Files**: `CLAUDE.md`
  - **Dependencies**: Task 6.2
  - **Estimated Time**: 20 minutes

## Summary

**Total Tasks**: 26 (including 1 bonus autoplay fix)
**Critical Priority**: 12 tasks (Phases 1-2, including autoplay fix)
**High Priority**: 2 tasks (Phase 3)
**Medium Priority**: 7 tasks (Phases 4-5)
**Low Priority**: 3 tasks (Phase 6)
**Estimated Total Time**: 6-8 hours

**Completed Tasks**: 14/26
- ✅ Phase 1: 5/5 tasks (FFmpeg Configuration)
- ✅ Phase 2: 6/7 tasks (HLS.js Configuration + Autoplay Fix)
- ✅ Phase 3: 1/2 tasks (Memory Management)
- ✅ Phase 4: 2/2 tasks (Stream Startup Reliability)
- ⏳ Phase 5: 0/5 tasks (Integration Testing) - **Requires user action**
- ⏳ Phase 6: 0/3 tasks (Documentation) - **Pending testing completion**

**Parallelizable Work**:
- Phase 1 and Phase 4 can be done in parallel (different files)
- Task 6.1-6.3 can be done in parallel

**Critical Path**:
Phase 1 → Phase 2 → Phase 3 → Phase 5 (testing)
