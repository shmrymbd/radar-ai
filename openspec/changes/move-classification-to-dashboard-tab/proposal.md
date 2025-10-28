## Why
The main dashboard currently has placeholder tabs with broken links to deleted page routes (`/classification` and `/video-streaming`). The actual components (`ClassificationDashboard.tsx`, `VideoStreamingGrid.tsx`, `TrafficAnalytics.tsx`) exist but aren't being used. This creates a fragmented user experience where traffic engineers must navigate away from the unified dashboard to access critical features, breaking workflow continuity and causing confusion with non-functional links.

The video streaming tab was previously implemented inline (see archived change `2025-10-26-integrate-video-streaming-tab`) but was accidentally reverted to a placeholder. The classification and analytics tabs were never fully integrated despite the components being ready.

## What Changes
- **BREAKING**: Remove placeholder link-based navigation in main dashboard
- Embed `ClassificationDashboard` component directly in Classification tab
- Embed `VideoStreamingGrid`, `CameraSettings`, and `VideoRecordings` components in Video Streaming tab with sub-tab navigation
- Embed `TrafficAnalytics` component directly in Analytics tab
- Remove all `Link` components pointing to deleted routes
- Manage video streaming sub-tabs (Streams/Settings/Recordings) locally in main dashboard
- Preserve MongoDB-first classification architecture (no in-memory cache, no polling)
- Maintain device context synchronization across all embedded tabs
- Ensure WebSocket connections work properly in embedded context

## Impact
- Affected specs: dashboard (modify Classification, Video Streaming, and Analytics tab requirements)
- Affected code:
  - `dashboard/src/app/page.tsx` (main dashboard - major rewrite of tab rendering logic)
  - All components already exist and are ready to use:
    - `dashboard/src/components/ClassificationDashboard.tsx` ✓ exists
    - `dashboard/src/components/VideoStreamingGrid.tsx` ✓ exists
    - `dashboard/src/components/CameraSettings.tsx` ✓ exists
    - `dashboard/src/components/VideoRecordings.tsx` ✓ exists
    - `dashboard/src/components/TrafficAnalytics.tsx` ✓ exists
- No route deletions needed (already removed)
- No component creation needed (all exist)
- Pure integration work
