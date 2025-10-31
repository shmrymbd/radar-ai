# Dashboard Specification Deltas

This document contains specification changes for the `redesign-control-center-layout` OpenSpec change.

---

## MODIFIED Requirements

### Requirement: Dashboard Navigation Structure
The dashboard SHALL provide tab-based navigation with the following tabs in order:
1. **Overview** - Real-time metrics and alerts
2. **Analytics** - Traffic analytics with visualizations
3. **Control Center** - Integrated video, tracking, and lane status (PRIMARY tracking interface)
4. **Classification** - Vehicle classification analytics
5. **Video Streaming** - Video management (streams, settings, recordings)
6. **Settings** - Configuration options

**REMOVED**: "Live Tracking" standalone tab (previously tab #2 after Overview)

**Rationale**: Control Center provides superior integrated tracking experience with video overlay and lane status. Standalone tracking tab was redundant and created user confusion.

#### Scenario: User navigates to Control Center for tracking
- **WHEN** user clicks "Control Center" tab
- **THEN** system displays three-panel layout with LiveTracking in center panel (50% width)
- **AND** video panel shows on left (25% width) with overlay capability
- **AND** lane status panel shows on right (25% width)
- **AND** vehicle selection synchronizes across all three panels

#### Scenario: User attempts to access removed "Live Tracking" tab via URL
- **WHEN** user navigates to `?tab=tracking` directly
- **THEN** system gracefully handles by showing default "Overview" tab
- **AND** no navigation errors occur
- **AND** user can still access tracking via Control Center tab

#### Scenario: User expects standalone tracking
- **WHEN** user looks for vehicle tracking functionality
- **THEN** Control Center tab is clearly labeled with icon 🎛️
- **AND** Control Center provides all tracking features (canvas, trails, heat maps, zoom)
- **AND** user gets enhanced experience with video overlay and lane status
- **AND** no functionality is lost compared to standalone tab

---

## MODIFIED Requirements

### Requirement: Control Center Tab
The Control Center tab SHALL be the **primary and only** interface for accessing live vehicle tracking functionality.

**Previous behavior**: Control Center was ONE OF TWO ways to access tracking (alongside standalone "Live Tracking" tab)

**New behavior**: Control Center is THE ONLY way to access tracking (standalone tab removed)

#### Scenario: User accesses tracking features
- **WHEN** user wants to view live vehicle tracking
- **THEN** user clicks "Control Center" tab
- **AND** tracking canvas appears in center panel with full functionality
- **AND** no duplicate "Live Tracking" tab is available

#### Scenario: Navigation is simplified
- **WHEN** user views dashboard navigation tabs
- **THEN** six tabs are visible (Overview, Analytics, Control Center, Classification, Video Streaming, Settings)
- **AND** no "Live Tracking" tab is present
- **AND** tab order flows logically from overview → analytics → operations → classification → video → settings

---

## REMOVED Requirements

### Requirement: Standalone Live Tracking Tab
~~The dashboard SHALL provide a standalone "Live Tracking" tab that displays only the LiveTracking component.~~

**Reason for removal**: Functionality fully subsumed by Control Center tab, which provides superior integrated experience.

#### Scenario: User expects standalone tracking tab (NO LONGER SUPPORTED)
- ~~**WHEN** user clicks "Live Tracking" tab~~
- ~~**THEN** system displays full-screen tracking canvas~~
- **NOTE**: This scenario is no longer supported. Users should use Control Center tab instead.

---

## ADDED Requirements

### Requirement: Control Center Tab Positioning
The Control Center tab SHALL be positioned as the **third tab** in the navigation, immediately after Analytics and before Classification.

**Tab Order**:
1. Overview
2. Analytics
3. **Control Center** ← Positioned here (previously 4th)
4. Classification
5. Video Streaming
6. Settings

**Rationale**: Control Center represents operational monitoring (real-time), so it follows analytics (historical) and precedes classification (specialized analysis).

#### Scenario: Tab order is logical
- **WHEN** user views dashboard tabs from left to right
- **THEN** overview provides high-level summary
- **AND** analytics provides historical analysis
- **AND** control center provides real-time operations
- **AND** classification provides specialized vehicle analysis
- **AND** video streaming provides camera management
- **AND** settings provides configuration

#### Scenario: User finds tracking intuitively
- **WHEN** user wants real-time vehicle tracking
- **THEN** user identifies Control Center as operational hub (icon 🎛️, name implies operations)
- **AND** user discovers integrated tracking, video, and lane status
- **AND** user recognizes this is superior to standalone tracking
