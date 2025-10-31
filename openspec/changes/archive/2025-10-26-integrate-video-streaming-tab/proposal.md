# Proposal: Integrate Video Streaming as Dashboard Tab

## Problem Statement

Currently, video streaming functionality is accessible only through a separate page at `/video-streaming`, requiring users to navigate away from the main dashboard. This breaks the user's workflow and prevents simultaneous monitoring of radar data and video feeds, which is essential for traffic control and incident verification.

## Proposed Solution

Integrate the video streaming interface as a tab within the main dashboard (`/` route), similar to how "Overview", "Live Tracking", and "Classification" tabs work. This will:

1. **Eliminate separate route** - Remove `/video-streaming` page entirely
2. **Embed VideoStreamingGrid component** - Integrate directly into main dashboard tab content
3. **Maintain full functionality** - Preserve all existing video streaming features (camera management, settings, recordings)
4. **Improve UX** - Enable seamless switching between radar data and video feeds without page navigation

## User Benefits

- **Unified interface** - All traffic monitoring tools in one place
- **Faster workflow** - Switch between data views with single click instead of full page navigation
- **Context retention** - Device selection and preferences maintained when switching tabs
- **Better correlation** - Easier to correlate radar events with video evidence

## Technical Approach

### Minimal Changes Required

1. **Update `dashboard/src/app/page.tsx`**:
   - Import `VideoStreamingGrid`, `CameraSettings`, `VideoRecordings` components
   - Replace link placeholder with actual video streaming UI in `video-streaming` case
   - Manage sub-tabs (streams/settings/recordings) within video streaming tab

2. **Remove separate page**:
   - Delete `dashboard/src/app/video-streaming/page.tsx`
   - Update any internal links that reference `/video-streaming`

3. **Update navigation**:
   - Video Streaming tab already exists in navigation
   - No changes needed to `DashboardLayout.tsx`

### Implementation Complexity

**Low** - This is primarily a refactoring task moving existing components from one route to another without architectural changes.

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| State management conflicts between tabs | Each tab component manages its own state; no shared state conflicts expected |
| Performance impact loading video components | Use lazy loading if needed; video components already optimized |
| Breaking existing bookmarks/links | Document deprecation of `/video-streaming` route; could add redirect if needed |

## Out of Scope

- Video player performance improvements (already optimized for 1-second latency)
- Additional video features (new cameras, recording formats, etc.)
- Changes to video API endpoints
- Device context integration for cameras (future enhancement)

## Success Criteria

1. ✅ Video streaming accessible from main dashboard "Video Streaming" tab
2. ✅ All three sub-features (streams, settings, recordings) work correctly
3. ✅ No regressions in existing dashboard tabs (overview, tracking, classification)
4. ✅ `/video-streaming` route removed or redirects to main dashboard
5. ✅ Smooth tab switching without page reloads
6. ✅ Device context preserved when switching tabs

## Timeline Estimate

- **Implementation**: 1-2 hours
- **Testing**: 30 minutes
- **Documentation**: 30 minutes

**Total**: 2-3 hours for complete integration
