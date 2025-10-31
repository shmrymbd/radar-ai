# Implementation Tasks

## Phase 1: Remove Standalone Live Tracking Tab ✅

### 1.1 Update Navigation Configuration
- [ ] Remove "Live Tracking" tab definition from `dashboard/src/components/DashboardLayout.tsx`
  - Delete line 16: `{ id: 'tracking', label: 'Live Tracking', icon: '🚗' }`
  - Verify tab order: Overview → Analytics → Control Center → Classification → Video Streaming → Settings
- [ ] Update `dashboard/src/app/page.tsx` routing logic
  - Remove `case 'tracking':` block (or make it redirect to 'control-center')
  - Ensure Control Center case remains: `case 'control-center': return <ControlCenter />;`

### 1.2 Handle Navigation State
- [ ] Test default tab behavior (should still be 'overview')
- [ ] Test direct navigation to removed tab (e.g., `?tab=tracking`)
  - Should gracefully handle by showing default tab or redirecting
- [ ] Verify tab switching works correctly with new tab order

### 1.3 Update Component Imports
- [ ] Check if `LiveTracking` import in `page.tsx` is still needed
  - If only used in 'tracking' case, remove import
  - If used elsewhere, keep import
- [ ] Verify `ControlCenter` import remains

**Validation**: Navigation shows 6 tabs (not 7), no "Live Tracking" tab visible, Control Center accessible

---

## Phase 2: Enhance Control Center Usability

### 2.1 Verify Current Layout
- [ ] Test Control Center on desktop (1920x1080, 2560x1440)
- [ ] Test Control Center on tablet (768px-1279px vertical stacking)
- [ ] Test Control Center on mobile (tab pattern)
- [ ] Confirm LiveTracking trail settings are at bottom (recently reorganized)

### 2.2 Optimize Panel Proportions (Optional Enhancement)
- [ ] Consider adjusting panel widths if needed:
  - Current: Video 25% | Tracking 50% | Lanes 25%
  - Alternative: Video 30% | Tracking 40% | Lanes 30% (more balanced)
- [ ] Test with real data to determine optimal proportions
- [ ] User feedback on panel sizing

### 2.3 Add Quick Access Indicator
- [ ] Add tooltip to Control Center tab: "Integrated view: Video + Tracking + Lanes"
- [ ] Optional: Add "New" or "Enhanced" badge temporarily to draw attention

**Validation**: Control Center provides optimal layout, users understand it's the tracking hub

---

## Phase 3: Documentation Updates

### 3.1 Update Project Documentation
- [ ] Update `CLAUDE.md` navigation structure section
  - Remove "Live Tracking" from tab list
  - Emphasize Control Center as tracking hub
- [ ] Update `CONTROL_CENTER_IMPLEMENTATION_SUMMARY.md`
  - Add note about standalone tab removal
  - Clarify Control Center is primary tracking interface
- [ ] Update `README.md` if it mentions "Live Tracking" tab

### 3.2 Update API Documentation
- [ ] Review `API_DOCUMENTATION.md` for references to tracking tab
- [ ] Ensure all tracking examples point to Control Center
- [ ] Update screenshots if any show old navigation

### 3.3 Update OpenSpec Specifications
- [ ] Update `openspec/specs/dashboard/spec.md` with MODIFIED requirement
  - Navigation structure requirement
  - Control Center requirement
- [ ] Ensure spec reflects new tab order

**Validation**: All documentation references updated, no broken links

---

## Phase 4: Testing & Validation

### 4.1 Functional Testing
- [ ] Test all remaining tabs work correctly (Overview, Analytics, Control Center, Classification, Video Streaming, Settings)
- [ ] Test tab switching in all directions
- [ ] Test browser back/forward navigation
- [ ] Test deep linking to specific tabs (e.g., `?tab=control-center`)
- [ ] Test what happens when accessing removed tab (e.g., `?tab=tracking`)

### 4.2 Integration Testing
- [ ] Test Control Center with real radar data
- [ ] Test video overlay synchronization
- [ ] Test lane status updates
- [ ] Test cross-panel vehicle selection
- [ ] Test WebSocket connection stability

### 4.3 Responsive Testing
- [ ] Test on desktop breakpoints (≥1280px)
- [ ] Test on tablet breakpoints (768px-1279px)
- [ ] Test on mobile breakpoints (<768px)
- [ ] Test mobile tab pattern for Control Center
- [ ] Test orientation changes (portrait/landscape)

### 4.4 User Acceptance Testing
- [ ] Verify navigation is intuitive (no confusion about where tracking went)
- [ ] Confirm Control Center provides expected functionality
- [ ] Gather feedback on panel layout
- [ ] Identify any usability issues

**Validation**: All tests pass, no regressions, users can easily find tracking in Control Center

---

## Phase 5: Deployment & Monitoring

### 5.1 Pre-Deployment Checklist
- [ ] All tasks in Phases 1-4 completed
- [ ] TypeScript compilation successful (no errors)
- [ ] ESLint checks pass (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Documentation updated and reviewed

### 5.2 Deployment
- [ ] Commit changes with descriptive message
- [ ] Create PR with OpenSpec reference (if using PR workflow)
- [ ] Deploy to production environment
- [ ] Verify deployment successful

### 5.3 Post-Deployment Monitoring
- [ ] Monitor for navigation errors (404s, broken links)
- [ ] Monitor user feedback and confusion
- [ ] Monitor Control Center usage analytics
- [ ] Monitor performance metrics (no degradation)

### 5.4 Archive OpenSpec Change
- [ ] Run `openspec archive redesign-control-center-layout --yes`
- [ ] Verify change moved to archive with date prefix
- [ ] Verify dashboard spec updated with MODIFIED requirements

**Validation**: Production deployment stable, users successfully navigating to Control Center

---

## Dependencies Between Tasks

- **Phase 1 must complete before Phase 2** - Cannot enhance what doesn't exist yet
- **Phase 3 can run parallel with Phase 2** - Documentation independent of code changes
- **Phase 4 depends on Phases 1-2** - Must have working code to test
- **Phase 5 depends on Phases 1-4** - All work complete before deployment

## Estimated Timeline

- **Phase 1**: 30 minutes (simple configuration changes)
- **Phase 2**: 1-2 hours (optional enhancements and testing)
- **Phase 3**: 1 hour (documentation updates)
- **Phase 4**: 2-3 hours (comprehensive testing)
- **Phase 5**: 1 hour (deployment and monitoring)

**Total**: 5-7 hours for complete implementation and validation

## Risk Assessment

**Low Risk** - This is a navigation simplification with minimal code changes:
- No data model changes
- No API changes
- No component logic changes
- Single entry point removal (not addition)
- Easy to revert if needed
