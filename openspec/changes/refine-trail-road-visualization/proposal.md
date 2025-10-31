# Refine Trail-Based Road Visualization

**Change ID**: `refine-trail-road-visualization`
**Date**: October 31, 2025
**Status**: Implemented
**Priority**: Medium

## Why

The current trail-based road visualization uses 2-meter grid blocks and straight dotted separator lines. While functional, this approach has limitations:

1. **Low Resolution**: 2-meter grid blocks create blocky heat maps that don't capture fine-grained traffic patterns
2. **Unrealistic Lane Lines**: Straight dotted separators don't reflect actual road curvature
3. **Poor Visual Fidelity**: Roads rarely have perfectly straight lanes; curves and bends are common
4. **Missed Detail**: Finer traffic patterns (lane-changing zones, merging areas) are averaged out in large blocks

Traffic engineers and analysts need higher-fidelity road visualization to:
- **Identify precise lane usage patterns** with meter-level accuracy
- **See realistic road topology** that matches actual curved roads
- **Detect lane-changing behavior** in specific zones
- **Validate radar accuracy** against actual road geometry

## What Changes

**Refine the trail-based road visualization** with higher resolution and curved lane separators that adapt to actual traffic flow patterns.

### Key Improvements

1. **50% Smaller Grid Blocks**
   - Reduce grid size from 2m to 1m for heat map rendering
   - Quadruple the spatial resolution (4x more grid cells)
   - Capture fine-grained traffic density variations
   - Maintain performance with efficient rendering

2. **Curved Dotted Separator Lines**
   - Replace straight lane separators with curved paths following actual traffic flow
   - Sample trail data along Y-axis (10m segments) to detect road curvature
   - Use Catmull-Rom spline with Bezier curve interpolation for ultra-smooth curves
   - Highly sensitive detection (0.2m threshold) captures subtle curves
   - Wider sampling (2m) from both adjacent lanes for accurate curve detection
   - Smaller dots (1.5px instead of 3px) for refined appearance

3. **Adaptive Road Shape Detection**
   - Analyze trail density in segments along the Y-axis
   - Detect lateral shifts in lane centers (curves)
   - Generate separator curves that follow actual traffic flow
   - Handle both gentle curves and sharp bends

4. **Enhanced Vehicle and Trail Persistence for Digital Twin**
   - **Keep vehicle objects visible longer**: Extend vehicle display cache from immediate removal to 10-30 seconds after exit
   - **Show more vehicles simultaneously**: Display vehicles even after they technically "exit" the detection zone
   - **Increase trail fade duration**: From 5s to 30s for better trail visibility
   - **Persistent global cache**: Vehicle trails and positions survive longer for realistic traffic density
   - **Configurable retention period**: 10-30 minutes for extended pattern analysis
   - **Digital twin effect**: See cumulative traffic (20-50 vehicles) instead of only active detections (5-10 vehicles)

5. **Performance Optimization**
   - Implement efficient curve calculation algorithms
   - Cache computed separator paths
   - Render curves using canvas quadratic curves
   - Limit curve recalculation to minimize overhead
   - Smart memory management for longer trail persistence

### Modified Components

**Files:**
- `dashboard/src/components/LiveTracking.tsx` - Grid size reduction, curve detection, spline rendering
- `openspec/specs/live-tracking/spec.md` - Updated requirements for refined visualization

**Configuration Changes:**
- Grid size: 2m → 1m
- Dot size: 3px → 1.5px
- Dot gap: 6px → 3px
- Curve sampling: 10m segments along Y-axis (2m wide sampling area)
- Curve detection threshold: 0.2m lateral variance (highly sensitive)
- Curve rendering: Catmull-Rom spline with Bezier curves
- **Vehicle display retention**: 10-30 seconds after exit (new)
- **Vehicle cleanup threshold**: From "immediate" to "30s after last seen" (new)
- Trail fade duration: 5s → 30s (6x longer visibility)
- Global trail cache retention: Configurable 10-30 minutes
- Trail persistence: Enabled by default for digital twin effect

## Impact

- **Affected Specs**: `live-tracking` (modified requirements)
- **Affected Code**:
  - `LiveTracking.tsx` heat map rendering (grid size change)
  - `LiveTracking.tsx` lane separator drawing (curve algorithm)
  - Trail accumulation logic (same data structure, different grouping)
- **User Impact**:
  - Enhanced visual quality
  - More accurate road representation
  - Better lane-change detection
  - No breaking changes to existing functionality
- **Performance**:
  - Heat map: 4x more cells, but still O(n) rendering
  - Curve calculation: One-time per frame, cached
  - Expected impact: <5ms additional render time

## Benefits

1. **Higher Fidelity**: Meter-level precision in traffic pattern visualization
2. **Realistic Representation**: Curved lanes match actual road geometry
3. **Better Analysis**: Detect subtle patterns like lane-changing zones
4. **Professional Appearance**: Refined dots and smooth curves look more polished
5. **Improved Validation**: Easier to compare radar data against known road layouts
6. **Digital Twin Realism**: See 20-50 vehicles simultaneously instead of just 5-10 active detections
7. **Realistic Traffic Density**: Vehicle objects persist 10-30s after exit, showing actual road occupancy
8. **Extended Pattern Analysis**: 10-30 minute retention enables long-term traffic pattern study
9. **Historical Context**: See where vehicles are AND where they were in the recent past

## Risks and Mitigations

**Risk**: Performance degradation from 4x more grid cells
- **Mitigation**: Use requestAnimationFrame throttling, limit heat map updates to visible changes only

**Risk**: Curve calculation complexity
- **Mitigation**: Simple segmented approach (divide Y-axis into segments), use efficient quadratic curves

**Risk**: Curves might not match straight roads
- **Mitigation**: Fall back to straight lines when lateral variance is below threshold (< 0.5m)

## Alternatives Considered

1. **Keep 2m blocks, only add curves**: Rejected - still too blocky for detailed analysis
2. **Use 0.5m blocks**: Rejected - excessive overhead, diminishing returns
3. **Bezier curves for separators**: Rejected - quadratic curves simpler and faster
