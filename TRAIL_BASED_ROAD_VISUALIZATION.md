# Trail-Based Road Visualization

## Overview

The Live Vehicle Tracking system includes an innovative feature that automatically infers road lane topology from accumulated vehicle trail data. Instead of requiring manual lane configuration, the system learns road structure by analyzing where vehicles actually travel.

## Features

### Automatic Lane Detection
- **Density Analysis**: Analyzes trail point density along the X-axis to identify lane centers
- **Peak Detection**: Uses density peaks (>15% of maximum) to detect lane positions
- **Lane Merging**: Automatically merges lanes within 3 meters to avoid duplicates
- **Minimum Data**: Requires at least 20 trail data points to start detection

### Heat Map Visualization
- **Traffic Density**: Blue-to-red gradient showing traffic density
  - Blue: Low traffic density
  - Red: High traffic density
- **Opacity**: Dynamic opacity (20-70%) for better visibility
- **Real-time Updates**: Continuously updates as vehicles move

### Lane Separators
- **Dotted Lines**: White dotted lines separating lanes
- **Pattern**: 3px dots, 6px gaps for clear visibility
- **Full Length**: Extends the full length of the detection zone
- **Boundaries**: Includes left edge of first lane and right edge of last lane

### Lane Labels
- **Numbering**: "Lane 1", "Lane 2", etc.
- **Styling**: White text with black outline for readability
- **Positioning**: Positioned near lane centers

### User Controls
- **Toggle**: "Show Road from Trails" checkbox to enable/disable visualization
- **Real-time**: Changes apply immediately
- **Persistent**: Visualization state maintained during session

## Technical Implementation

### Algorithm

1. **Trail Data Accumulation**
   - Vehicle trajectories are stored in `globalTrailHistory` Map
   - Grid-based storage (2m grid cells) for efficient processing
   - Key format: `${gridX}_${gridY}`

2. **Lane Detection**
   ```typescript
   // Group trail points by X position
   xBins: Map<number, number> // X position -> count
   
   // Find density peaks
   threshold = maxDensity * 0.15 // 15% threshold
   
   // Filter and merge nearby lanes
   lanes.filter(density > threshold && notWithin3m)
   ```

3. **Visualization**
   - Heat map canvas overlay (z-index: 1)
   - Lane separators drawn as dotted lines
   - Labels positioned at lane centers

### Performance Considerations

- **Memory**: Trail history limited to 1000 entries, auto-cleanup to 500 recent
- **Rendering**: Updates only when trail data changes
- **Thresholds**: Configurable thresholds for lane detection sensitivity

## Usage

### Enabling Road Visualization

1. Navigate to **Live Tracking** tab
2. Ensure vehicles are moving (trail data accumulating)
3. Check **"Show Road from Trails"** checkbox
4. Wait for at least 20 trail points to accumulate
5. Lanes will appear automatically as data accumulates

### Viewing Lane Information

- Lane count displayed in heat map stats: "X lanes detected"
- Trail data points shown: "Trail Data Points: X"
- Green checkmark appears when visualization is rendered

## Configuration

### Detection Parameters

- **Minimum Trail Points**: 20 (configurable in code)
- **Lane Detection Threshold**: 15% of max density
- **Lane Width**: 3.5 meters (assumed standard)
- **Lane Merge Distance**: 3 meters
- **Grid Size**: 2 meters

### Visual Parameters

- **Heat Map Opacity**: 20-70% (dynamic based on intensity)
- **Lane Separator Style**: White, 2px width, dotted (3px dot, 6px gap)
- **Lane Center Style**: Orange, 1px width, dashed (2px dash, 4px gap)
- **Label Font**: Bold 14px sans-serif

## Benefits

1. **Zero Configuration**: No manual lane setup required
2. **Adaptive**: Automatically adapts to actual traffic patterns
3. **Visual Feedback**: Clear visualization of traffic density
4. **Real-time**: Updates continuously as vehicles move
5. **Educational**: Helps verify lane detection accuracy

## Future Enhancements

- [ ] Configurable lane detection sensitivity
- [ ] Lane width detection from trail data
- [ ] Multi-directional lane detection
- [ ] Lane merging/splitting detection
- [ ] Export lane topology to configuration
- [ ] Historical lane pattern analysis

## Related Documentation

- [Live Tracking Specification](../openspec/specs/live-tracking/spec.md)
- [Vehicle Trails Enhancement](../openspec/changes/archive/2025-10-27-enhance-vehicle-trails/)

## Implementation Details

**Files Modified:**
- `dashboard/src/components/LiveTracking.tsx`
  - `extractLaneBoundaries()`: Lane detection algorithm
  - `drawHeatMapRoad()`: Visualization rendering
  - `useEffect()`: Continuous heat map updates

**State Management:**
- `globalTrailHistory`: Map<string, number> - Trail point counts by grid cell
- `showRoadFromTrails`: boolean - Toggle for visualization
- `heatMapInitialized`: boolean - Initialization flag

**Canvas Setup:**
- Heat map canvas: Absolute positioned, z-index 1, pointer-events-none
- Main canvas: Relative positioned for vehicle rendering
- Coordinate transformation: `radarToVisual()` for mapping radar coordinates to screen

