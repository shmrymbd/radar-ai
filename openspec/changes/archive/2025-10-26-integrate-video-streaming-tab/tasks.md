# Implementation Tasks

## Phase 1: Component Integration (Main Implementation)

### Task 1.1: Update main dashboard page
- [x] Import video streaming components (`VideoStreamingGrid`, `CameraSettings`, `VideoRecordings`) in `dashboard/src/app/page.tsx`
- [x] Add state management for video streaming sub-tabs (`streams`, `settings`, `recordings`)
- [x] Replace link placeholder in `video-streaming` case with actual component rendering
- [x] Add sub-tab navigation UI within video streaming tab (similar to `/video-streaming/page.tsx` implementation)
- [x] Implement conditional rendering for three sub-tabs

**Validation**: ✅ Video streaming tab displays grid layout with camera feeds when clicked

---

### Task 1.2: Port state management logic
- [x] Copy `fetchCameras()` and `fetchRecordings()` logic from separate page
- [x] Add `cameras`, `recordings`, `loading`, `error` state to main dashboard
- [x] Implement `useEffect` hooks for data fetching when video tab is active
- [x] Add camera save/update/delete handlers
- [x] Add recording playback handlers

**Validation**: ✅ Camera management and recordings work identically to separate page

---

### Task 1.3: Handle sub-tab state
- [x] Add `videoSubTab` state to track active sub-tab (`streams` | `settings` | `recordings`)
- [x] Render sub-tab navigation buttons within video streaming content area
- [x] Apply active tab styling to sub-tab buttons
- [x] Ensure sub-tab state persists while video-streaming tab is active
- [x] Reset sub-tab to 'streams' when switching away from video-streaming tab

**Validation**: ✅ Sub-tabs (Streams, Settings, Recordings) switch correctly within video streaming tab

---

## Phase 2: Cleanup (Remove Old Implementation)

### Task 2.1: Remove separate video streaming page
- [x] Delete `dashboard/src/app/video-streaming/page.tsx`
- [x] Verify no other files import from this deleted file
- [x] Check for any route references to `/video-streaming` in codebase

**Validation**: ✅ `npm run build` succeeds with no import errors

---

### Task 2.2: Update internal navigation
- [x] Search codebase for any `href="/video-streaming"` links
- [x] Remove or update links to use tab switching instead
- [x] Verify no broken links in documentation

**Validation**: ✅ No broken internal links remain

---

### Task 2.3: Optional redirect handling
- [x] Consider adding redirect from `/video-streaming` to `/?tab=video-streaming` in `next.config.js` (optional)
- [x] Document deprecation of separate video streaming route

**Validation**: ✅ Direct navigation to `/video-streaming` shows 404 (expected behavior)

---

## Phase 3: Testing & Validation

### Task 3.1: Functional testing
- [x] Test video streaming tab activation from main dashboard
- [x] Verify all three sub-tabs render correctly (streams, settings, recordings)
- [x] Test camera configuration save/update/delete operations
- [x] Verify video playback works in embedded context
- [x] Test recording playback and download functionality

**Validation**: ✅ All video streaming features work identically to separate page

---

### Task 3.2: Integration testing
- [x] Switch between all dashboard tabs (overview, tracking, classification, video-streaming, settings)
- [x] Verify device context persists across tab switches
- [x] Test tab switching performance (no noticeable lag)
- [x] Verify no memory leaks when switching away from video tab
- [x] Test video stream cleanup when switching tabs (streams should pause/stop)

**Validation**: ✅ Seamless tab switching without errors or performance degradation

---

### Task 3.3: Regression testing
- [x] Verify Overview tab still works correctly
- [x] Verify Live Tracking tab still works correctly
- [x] Verify Classification tab link still works
- [x] Test device selector functionality across all tabs
- [x] Verify WebSocket connections work correctly

**Validation**: ✅ No regressions in existing dashboard functionality

---

## Phase 4: Documentation

### Task 4.1: Update user documentation
- [x] Update `CLAUDE.md` navigation structure section
- [x] Remove reference to separate `/video-streaming` route
- [x] Document new integrated video streaming tab
- [x] Update component architecture documentation

**Validation**: ✅ Documentation accurately reflects new implementation

---

### Task 4.2: Update deployment documentation
- [x] Update `DEPLOYMENT_GUIDE.md` with new navigation instructions
- [x] Update `VIDEO_STREAMING_DEPLOYMENT.md` with embedded tab workflow
- [x] Update all URLs referencing `/video-streaming` route

**Validation**: ✅ Deployment documentation accurately reflects integrated architecture

---

## Dependencies

- **Parallel work**: Tasks 1.1, 1.2, 1.3 can be done together (all part of same file edit)
- **Sequential**: Phase 1 → Phase 2 → Phase 3 → Phase 4
- **Blocker**: Phase 1 must be complete before Phase 2 (need working integration before deleting old page)

## Estimated Timeline

- **Phase 1**: 1-1.5 hours (main implementation)
- **Phase 2**: 15-30 minutes (cleanup)
- **Phase 3**: 30-45 minutes (testing)
- **Phase 4**: 15-30 minutes (documentation)

**Total**: 2-3 hours
