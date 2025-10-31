# Proposal: Add Control Center Tab

## Change ID
`add-control-center-tab`

## Overview
Create a new "Control Center" tab in the main dashboard that combines live video streaming, vehicle tracking map, and lane status metrics into a unified operations view. This provides traffic engineers with a comprehensive real-time monitoring interface for intersection management.

## Why

### Business Value
Traffic engineers currently must switch between three separate tabs (Video Streaming, Live Tracking, and Overview) to get a complete operational picture of an intersection. This context switching:
- **Slows incident response** - Critical seconds lost correlating video + data during emergencies
- **Increases cognitive load** - Engineers must mentally correlate information across disconnected views
- **Reduces situational awareness** - Missing the "big picture" when monitoring only one data source
- **Limits training effectiveness** - New operators struggle to understand traffic patterns without integrated context

A unified Control Center provides immediate visual + quantitative correlation, enabling:
- **70% reduction in tab switches** per monitoring session
- **Faster incident detection** through simultaneous video + tracking + metrics
- **Better traffic analysis** by correlating visual observations with lane performance
- **Improved training** for new operators with integrated real-time context

### Target Users
- **Primary**: Traffic engineers and operations staff monitoring intersections in real-time
- **Secondary**: System administrators validating system performance and data quality
- **Tertiary**: New traffic engineering staff during training and onboarding

### Success Criteria
- Control Center becomes 2nd most used tab (after Overview) within 2 weeks of deployment
- Average tab switches per session reduces by 40%+
- User satisfaction: 80%+ positive feedback from traffic engineering staff
- Performance: Maintains <100ms panel render, <500ms WebSocket latency, <10% CPU usage

## What Changes

### Add Control Center Tab to Dashboard Navigation
Add a new "Control Center" tab positioned between "Analytics" and "Classification" tabs with operations/control center icon.

### Three-Panel Unified Layout
Create responsive three-panel layout:
1. **Video Panel (Left, 25%)** - Camera selection, live video feed, overlay toggle
2. **Tracking Panel (Center, 50%)** - Embedded LiveTracking component with full functionality
3. **Lane Status Panel (Right, 25%)** - Real-time lane metrics with color-coded indicators

### Canvas-Based Video Overlay System
- HTML5 Canvas overlay positioned over video player
- Real-time vehicle position rendering (30fps throttled)
- Color-coded by vehicle type with ID labels
- Coordinate transformation from radar space to video pixel space
- Stale data indication (opacity reduction after 2 seconds)
- Toggle control to enable/disable overlay

### Lane Status Real-Time Display
- Individual cards for each configured lane (11, 12, 13, 485)
- Display queue length, occupancy %, speed, and flow rate metrics
- Color-coded status indicators (green/amber/red based on occupancy)
- Auto-refresh every 3 seconds via `/api/lanes` API polling

### Shared State Management
- ControlCenterContext for cross-panel data synchronization
- Shared vehicle tracking data via useRef (avoid re-renders)
- Cross-panel vehicle selection synchronization
- Independent error handling per panel

### Responsive Mobile Layout
- Tab pattern for mobile (<768px): Video | Tracking | Lanes
- Vertical stacking for tablet (768px-1279px)
- Side-by-side for desktop (≥1280px)
- Touch-friendly tab buttons for mobile switching

### Performance Optimizations
- React.memo wrapping for each panel component
- 500ms WebSocket update throttling
- 30fps video overlay rendering limit
- Lazy mobile panel rendering (unmount inactive panels)
- <10% CPU usage target validated

### Accessibility Features
- WCAG 2.1 Level AA compliance
- Keyboard navigation with visible focus indicators
- Screen reader ARIA labels for all interactive elements
- High contrast mode support with 4.5:1 text contrast
- Status change announcements for screen readers

## Motivation

### Problem
Currently, traffic engineers must switch between multiple tabs to get a complete operational picture:
- **Video Streaming tab**: Shows camera feeds but no tracking or lane data
- **Live Tracking tab**: Shows vehicle positions but no video or detailed lane metrics
- **Overview tab**: Shows lane status but lacks visual tracking context

This fragmentation forces users to mentally correlate information across different views, slowing down incident response and traffic management decisions.

### Solution
A unified "Control Center" tab that displays:
1. **Live video stream** (left panel) - Single camera feed with vehicle position overlays
2. **Vehicle tracking map** (center panel) - Real-time radar-based vehicle tracking with trails
3. **Lane status metrics** (right panel) - Detailed lane-by-lane performance data

This integrated view enables:
- **Immediate visual correlation** between video, radar tracking, and lane metrics
- **Faster incident response** - see video, vehicle positions, and lane impact simultaneously
- **Better traffic pattern analysis** - correlate visual observations with quantitative data
- **Reduced cognitive load** - all critical information in one view

## User Impact

### Benefits
- **Traffic Engineers**: Single-screen operations monitoring reduces tab switching by ~70%
- **Incident Response**: Visual + data correlation cuts response time for identifying issues
- **Training**: New operators can understand traffic patterns more quickly with integrated view
- **Analysis**: Easier to identify correlations between vehicle movements, lane occupancy, and flow

### Affected Users
- Primary: Traffic engineers and operations staff
- Secondary: System administrators monitoring intersection performance
- Training: New traffic engineering staff learning system operations

## Technical Approach

### Architecture
1. **New Component**: `ControlCenter.tsx` - Client component with three-panel layout
2. **Video Integration**: Reuse `VideoPlayer.tsx` with radar overlay capability
3. **Tracking Integration**: Embed existing `LiveTracking.tsx` component
4. **Lane Status**: New `LaneStatusPanel.tsx` component consuming `/api/lanes` endpoint
5. **Layout Management**: CSS Grid with responsive breakpoints for mobile/tablet

### Data Flow
```
Redis (device/objectdata) → WebSocket → ControlCenter
                                      ├→ VideoPlayer (with overlay)
                                      ├→ LiveTracking (existing)
                                      └→ LaneStatusPanel (new)

Redis (device/lanedata) → /api/lanes → LaneStatusPanel
```

### Key Components
- **VideoPlayer Enhancement**: Add overlay layer for vehicle positions from tracking data
- **LaneStatusPanel**: Real-time display of 0x04 packet data with auto-refresh
- **Responsive Layout**: Tab/accordion pattern for mobile devices

### Integration Points
- Existing WebSocket infrastructure for real-time tracking
- Existing `/api/lanes` endpoint for lane status data
- Existing device context for multi-device support
- Existing VideoPlayer and LiveTracking components

## Implementation Scope

### In Scope
- New "Control Center" tab in main dashboard navigation
- Three-panel side-by-side layout (video | tracking | lane status)
- Video player with vehicle position overlay from tracking data
- Lane status panel with all 0x04 packet fields (queue, occupancy, speed)
- Responsive layout with tab/accordion for mobile
- Device context integration (existing devices)

### Out of Scope
- Multi-camera split-screen (single camera only)
- Historical playback or video recording controls
- Signal timing control interface (future enhancement)
- Advanced radar overlay (e.g., detection zones, calibration)
- Custom layout configuration (fixed three-panel design)

## Risks & Mitigations

### Performance Risk
**Risk**: Rendering three complex real-time components simultaneously may impact performance
**Mitigation**:
- Use React.memo for each panel to prevent unnecessary re-renders
- Throttle WebSocket updates to 500ms intervals
- Lazy-load panels as they become visible in responsive layout

### Video Overlay Complexity
**Risk**: Synchronizing video frames with radar tracking positions may have latency mismatches
**Mitigation**:
- Use timestamp-based correlation between video and tracking data
- Display overlay transparency indicator when data is stale (>2 seconds)
- Make overlay optional via toggle control

### Mobile Performance
**Risk**: Three-panel layout may be too complex for mobile devices
**Mitigation**:
- Implement tab/accordion pattern to show one panel at a time on mobile
- Prioritize tracking map as default view on mobile
- Allow swipe gestures to switch between panels

## Success Metrics
- **Usage**: Control Center tab becomes 2nd most used tab (after Overview) within 2 weeks
- **Efficiency**: Average tab switches per session reduces by 40%+
- **Performance**: Panel render time <100ms, WebSocket updates <500ms latency
- **User Feedback**: 80%+ positive feedback from traffic engineering staff

## Timeline Estimate
- **Specification**: 1 day (this proposal)
- **Implementation**: 3-5 days
  - Day 1: LaneStatusPanel component + API integration
  - Day 2: ControlCenter layout + responsive design
  - Day 3: VideoPlayer overlay integration
  - Day 4: Testing + refinement
  - Day 5: Documentation + review
- **Testing**: 1 day
- **Deployment**: Same day as main branch merge

## Dependencies
- Existing `/api/lanes` endpoint (✅ already implemented)
- Existing WebSocket infrastructure (✅ already implemented)
- Existing VideoPlayer component (✅ already implemented)
- Existing LiveTracking component (✅ already implemented)
- Device context management (✅ already implemented)

## Follow-up Work
Future enhancements (not in this change):
1. **Advanced Overlays**: Detection zones, virtual loops, calibration markers on video
2. **Signal Control**: Interactive signal timing adjustment interface
3. **Layout Customization**: User-configurable panel sizes and positions
4. **Multi-Camera Support**: Picture-in-picture or camera switching controls
5. **Recording Integration**: Quick-record button for incident documentation
