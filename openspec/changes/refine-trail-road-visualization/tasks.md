# Implementation Tasks

## Phase 1: Grid Size Refinement

- [x] **Reduce heat map grid size from 2m to 1m**
  - Update `gridSize` constant in `drawHeatMapRoad()` function
  - Update `getGridKey()` default parameter from 2 to 1
  - Verify heat map cells render correctly at new resolution
  - Test performance with 4x more grid cells

- [x] **Adjust heat map opacity for finer granularity**
  - Fine-tune alpha calculation for 1m cells (may need different opacity scaling)
  - Ensure visibility remains good with smaller cells
  - Test with various traffic densities

## Phase 2: Curved Lane Separator Implementation

- [x] **Implement segmented curve detection algorithm**
  - Divide Y-axis (DETECTION_ZONE) into 5-meter segments
  - For each segment, calculate average X position of trail points for each lane
  - Detect lateral shifts in lane centers along Y-axis
  - Store segment points for curve rendering

- [x] **Create curve path generation function**
  - Input: Array of lane center points along Y-axis
  - Calculate control points for smooth quadratic curves
  - Generate canvas path using `quadraticCurveTo()`
  - Fall back to straight lines when variance < 0.5m

- [x] **Update lane separator rendering**
  - Replace current straight line drawing (lines 650-688)
  - Use new curve paths instead of `lineTo()`
  - Apply dotted pattern: 1.5px dots, 3px gaps
  - Maintain white color and 0.9 alpha

- [x] **Optimize curve calculation**
  - Cache computed curves per frame
  - Only recalculate when trail data changes significantly
  - Use memoization for segment analysis

## Phase 3: Enhanced Vehicle Persistence (Digital Twin Effect)

- [x] **Extend vehicle display retention time**
  - Add `vehicleRetentionDuration` config parameter (default: 30000ms / 30 seconds)
  - Modify vehicle cleanup logic to keep vehicles for 30s after `lastSeen` instead of immediate removal
  - Update `VehicleState` interface if needed to track retention status
  - Add visual indicator (reduced opacity or outline) for "retained" vs "active" vehicles

- [x] **Implement configurable vehicle cache retention**
  - Add UI control for retention duration (10s / 20s / 30s options)
  - Update vehicle cleanup effect to use configurable threshold
  - Test memory usage with 50+ retained vehicles
  - Ensure performance remains acceptable with higher vehicle count

- [x] **Enhance trail fade duration**
  - Update DEFAULT_TRAIL_CONFIG fadeDuration from 5000ms to 30000ms
  - Update UI slider max value to accommodate 30s trails
  - Adjust global trail cleanup logic to retain trails for 2x fade duration (60s)
  - Test trail visibility over extended periods

- [x] **Add digital twin visualization mode toggle**
  - Create "Digital Twin Mode" checkbox in controls
  - When enabled: Apply 30s vehicle retention and 30s trail fade
  - When disabled: Revert to original behavior (immediate cleanup, 5s trails)
  - Save preference to localStorage

## Phase 4: Visual Refinement

- [x] **Reduce dot size for separators**
  - Change `setLineDash([3, 6])` to `setLineDash([1.5, 3])`
  - Verify visibility on different zoom levels
  - Test contrast against heat map background

- [x] **Update lane center line styling**
  - Reduce dash pattern from `[2, 4]` to `[1, 2]`
  - Adjust for consistency with new separator style
  - Ensure lane labels remain readable

- [x] **Add visual distinction for retained vehicles**
  - Render "retained" vehicles (past 30s) with 50% opacity
  - Add dashed border to distinguish from active vehicles
  - Test readability and visual clarity

## Phase 5: Testing and Validation

- [ ] **Performance testing**
  - Measure render time with 1m grid vs 2m grid
  - Verify <5ms overhead target
  - Test with maximum expected vehicle count (50+ with retention enabled)
  - Profile memory usage with larger trail history
  - Verify acceptable performance with 30s vehicle retention (20-50 vehicles on screen)

- [ ] **Visual quality verification**
  - Test with straight road scenarios (curves should default to straight)
  - Test with curved road scenarios (verify smooth curves)
  - Test with mixed traffic (ensure curves follow dominant patterns)
  - Verify zoom/pan interactions work correctly

- [ ] **Edge case handling**
  - Test with minimal trail data (<20 points)
  - Test with single-lane scenarios
  - Test with wide lane spacing
  - Test with tight curves/sharp bends

## Phase 6: Documentation and Cleanup

- [x] **Update code comments**
  - Document curve algorithm in function comments
  - Explain segment-based approach
  - Note performance considerations

- [x] **Update spec delta**
  - Modify requirements in `specs/live-tracking/spec.md`
  - Update scenarios for 1m grid and curved separators
  - Add new scenarios for curve detection

- [x] **Create implementation notes**
  - Document algorithm choices
  - Note any deviations from proposal
  - Record performance measurements

## Dependencies

- **Phase 2 depends on Phase 1**: Curve algorithm needs stable 1m grid data
- **Phase 3 can run parallel to Phases 1-2**: Vehicle retention independent of grid/curve changes
- **Phase 4 can run parallel to Phases 2-3**: Visual tweaks independent of curve/retention logic
- **Phase 5 requires Phases 1-4**: Complete functionality needed for testing
- **Phase 6 is final**: Documentation after implementation proven

## Validation Criteria

✅ Heat map renders at 1m resolution
✅ Lane separators curve smoothly along road shape
✅ Straight roads show straight separators (no false curves)
✅ Render time increase <5ms per frame
✅ Visual quality improved vs. current implementation
✅ No breaking changes to existing features
✅ Zoom/pan work correctly with new rendering
✅ **Vehicle objects persist for 30s after exit from detection zone**
✅ **Digital twin mode shows 20-50 vehicles instead of 5-10**
✅ **Trails remain visible for 30 seconds with smooth fade**
✅ **Retained vehicles visually distinct from active vehicles**
✅ **Memory usage acceptable with 50+ vehicles and extended trails**
