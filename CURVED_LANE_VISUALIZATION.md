# Curved Lane Dotted Lines - Traffic Flow Following

## Overview

The lane separator lines now **dynamically curve** based on actual vehicle traffic patterns, providing realistic road visualization that adapts to how vehicles actually move.

## How It Works

### 1. Traffic Data Collection (1m Grid Resolution)
- Every vehicle position is tracked in a **1-meter grid** (reduced from 2m for higher precision)
- The `globalTrailHistory` Map accumulates vehicle positions over time
- Each grid cell contains a **count of how many vehicles passed through**

### 2. Segment-Based Curve Detection

The road is divided into **5-meter segments** along the Y-axis (direction of travel):

```
Y-axis (Road Direction)
│
├─ Segment 1 (0-5m)    ← Analyze traffic here
├─ Segment 2 (5-10m)   ← Analyze traffic here
├─ Segment 3 (10-15m)  ← Analyze traffic here
...
└─ Segment 60 (295-300m)
```

### 3. Finding Lane Center in Each Segment

For **each segment**, the system:

1. **Samples all grid cells** within the lane boundaries (left edge to right edge)
2. **Weights each position** by traffic density (how many vehicles passed through)
3. **Calculates center of mass** - the average X position where vehicles actually drove

```typescript
// Weighted average calculation
centerX = Σ(position × vehicleCount) / Σ(vehicleCount)
```

**Example:**
```
Segment at Y=10-15m:
  X=-2.0m: 5 vehicles
  X=-1.5m: 20 vehicles  ← Most traffic here
  X=-1.0m: 8 vehicles

  Calculated center: X=-1.45m (weighted toward -1.5m where most vehicles drove)
```

### 4. Detecting Curves vs Straight Roads

The system analyzes the **lateral variance** of detected centers:

```typescript
if (standardDeviation(centerX values) > 0.5 meters) {
  useCurve = true  // Road curves
} else {
  useStraightLine = true  // Road is straight
}
```

**Smart fallback:** If the road is straight, no curve interpolation is applied - the system draws a simple straight line for optimal performance.

### 5. Smooth Curve Rendering

For curved roads, the system uses **quadratic spline interpolation**:

```typescript
// Connect segment centers with smooth curves
for each adjacent pair of segments:
  current = segmentCenter[i]
  next = segmentCenter[i+1]

  controlPoint = (current.x, midpoint.y)
  quadraticCurveTo(controlPoint, next)
```

This creates **natural, flowing curves** that follow the actual traffic path.

## Visual Example

### Straight Road (No Curve Detected)
```
Y
│
│  Lane 1        Lane 2        Lane 3
│    │             │             │
│    │             │             │  ← Straight dotted lines
│    │             │             │
│    │             │             │
└────────────────────────────────── X
```

### Curved Road (Curve Detected from Traffic)
```
Y
│
│  Lane 1      Lane 2      Lane 3
│    │           │           │
│     \           \           \     ← Curves follow
│      \           \           \       actual vehicle
│       │           │           │      paths
│       │           │           │
└────────────────────────────────── X
```

## Key Features

### ✅ Traffic-Based (Not Manual)
- Curves are **automatically detected** from actual vehicle movements
- No manual configuration needed
- Adapts to real-world traffic patterns

### ✅ High Resolution
- **1-meter grid cells** capture fine-grained movement
- **5-meter segments** provide good balance between detail and performance
- Detect subtle curves and lane shifts

### ✅ Weighted by Density
- Areas with **more vehicles** have stronger influence on the curve
- Occasional outliers don't distort the lane line
- Represents the "typical" path vehicles take

### ✅ Performance Optimized
- Curves only calculated when `globalTrailHistory` changes
- `useCallback` memoization prevents unnecessary recalculation
- Straight roads use simple line rendering (no curve overhead)

### ✅ Visual Quality
- **1.5px dots with 3px gaps** - refined, professional appearance
- **Quadratic curves** are smooth and natural-looking
- **White color with 0.9 alpha** - high visibility against heat map

## Validation

The curves accurately represent real traffic because:

1. **Data Source**: Uses actual accumulated vehicle trail data
2. **Statistical Method**: Weighted center-of-mass calculation
3. **Variance Detection**: Only curves when traffic pattern shows lateral variation
4. **Segment Granularity**: 5m segments capture realistic road geometry

## Technical Implementation

### Functions Involved

1. **`findLaneCenterInSegment()`**
   - Analyzes traffic in a Y-segment
   - Returns weighted average X position

2. **`shouldUseCurve()`**
   - Calculates standard deviation of segment centers
   - Determines if curve is needed (>0.5m variance)

3. **`generateCurvedPath()`**
   - Returns segment points for quadratic interpolation
   - Or returns just endpoints for straight line

4. **`detectCurveForLane()`**
   - Orchestrates the full curve detection
   - Divides Y-axis, finds centers, generates path

5. **`drawCurvedSeparator()`**
   - Renders the final curved path using canvas API
   - Uses `quadraticCurveTo()` for smooth curves

## Result

Lane separator lines now **realistically follow the actual roads** as determined by vehicle traffic flow, creating a **digital twin** of the real-world road geometry.

The visualization shows:
- Where vehicles **actually drive** (not just theoretical lane centers)
- How roads **curve and bend** in reality
- **Traffic patterns** like lane merging, diverging, or shifting

This provides traffic engineers with accurate, data-driven road topology visualization.
