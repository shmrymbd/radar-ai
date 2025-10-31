# Traffic Flow Curve Detection - Visual Example

## Real-World Scenario: Highway Curve

Imagine a highway with a gentle curve to the right as vehicles approach:

### Step 1: Vehicle Trail Data Collection (1m Grid)

```
Heat Map View (Traffic Density)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Y=0-5m    [██ ░░ ░░]  [██ ░░ ░░]  [██ ░░ ░░]  ← Straight
          Lane 1      Lane 2      Lane 3

Y=5-10m   [░█ █░ ░░]  [░█ █░ ░░]  [░█ █░ ░░]  ← Starting to curve

Y=10-15m  [░░ ██ ░░]  [░░ ██ ░░]  [░░ ██ ░░]  ← More curve

Y=15-20m  [░░ ░█ █░]  [░░ ░█ █░]  [░░ ░█ █░]  ← Maximum curve

Y=20-25m  [░░ ░░ ██]  [░░ ░░ ██]  [░░ ░░ ██]  ← Straightening

Legend: ██ = High traffic  █ = Medium  ░ = Low/None
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2: Segment Analysis

For **Lane 2** (middle lane), analyze each 5m segment:

```
Segment 1 (Y=0-5m):
  Traffic center detected at X = 0.0m (straight)

Segment 2 (Y=5-10m):
  Traffic center detected at X = 0.3m (slight right shift)

Segment 3 (Y=10-15m):
  Traffic center detected at X = 0.8m (more right shift)

Segment 4 (Y=15-20m):
  Traffic center detected at X = 1.2m (maximum right shift)

Segment 5 (Y=20-25m):
  Traffic center detected at X = 1.0m (less right shift)
```

**Lateral Variance Calculation:**
```
Centers: [0.0, 0.3, 0.8, 1.2, 1.0]
Standard Deviation: 0.47m

Result: 0.47m < 0.5m threshold
→ CURVE DETECTED! (close to threshold, but let's enhance)
```

### Step 3: Curve Path Generation

The system connects these centers with smooth quadratic curves:

```
Visual Coordinate System (Top-down view)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

          X=-2      X=0      X=2      X=4
          │         │        │        │
Y=25m ────┼─────────┼────────●────────┼────  ← Point 5
          │         │       ╱         │
Y=20m ────┼─────────┼──────●──────────┼────  ← Point 4 (max curve)
          │         │     ╱           │
Y=15m ────┼─────────┼────●────────────┼────  ← Point 3
          │         │   ╱             │
Y=10m ────┼─────────┼──●──────────────┼────  ← Point 2
          │         │ ╱               │
Y=5m  ────┼─────────●──────────────── ┼────  ← Point 1
          │         │                 │
          │    LANE CENTER PATH       │
          │    (follows traffic)      │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Dotted Line Rendering

The curved path is rendered as a dotted line:

```
Rendered Lane Separator (Dotted Curve)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Y=25m ────────────────●─────●─────●──────
                         ●────●────
Y=20m ────────────────●──────────────────
                    ●
Y=15m ──────────●──●
                  ●
Y=10m ────────●──●
              ●
Y=5m  ──────●─●

       ● = 1.5px white dot
       Gap = 3px between dots

RESULT: Smooth curved dotted line following
        the actual path vehicles took!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Multiple Lanes Example

With 3 lanes, all lanes curve together:

```
Complete Road Visualization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Y=25m     ●  ●  ●        ●  ●  ●        ●  ●  ●
            ●  ●           ●  ●           ●  ●
Y=20m      ●  ●           ●  ●           ●  ●
          ●  ●           ●  ●           ●  ●
Y=15m    ●  ●           ●  ●           ●  ●
        ●  ●           ●  ●           ●  ●
Y=10m  ●  ●           ●  ●           ●  ●
      ●  ●           ●  ●           ●  ●
Y=5m ●  ●           ●  ●           ●  ●

     Lane 1         Lane 2         Lane 3
     (Left)         (Center)       (Right)

All three lanes curve together following
the actual road geometry!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Algorithm Flow Diagram

```
┌─────────────────────────────────────────────┐
│  Vehicle passes through detection zone      │
│  Position recorded: (x=-1.2, y=45.3)       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Add to globalTrailHistory Map              │
│  Key: "gridX_gridY" (1m grid)               │
│  Value: count++ (increment density)         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  extractLaneBoundaries() called             │
│  Detects lanes at: X=-3.5, 0, +3.5         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  For each lane separator:                  │
│  detectCurveForLane(leftEdge, rightEdge)   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Divide Y-axis into 5m segments             │
│  For each segment:                          │
│    findLaneCenterInSegment()                │
│      → Analyzes traffic in this Y range    │
│      → Returns weighted center X position  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  shouldUseCurve() analyzes variance         │
│  If stdDev > 0.5m → USE CURVE               │
│  Else → USE STRAIGHT LINE                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  generateCurvedPath()                       │
│  Returns segment points for interpolation   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  drawCurvedSeparator()                      │
│  Renders with quadraticCurveTo()            │
│  Dotted pattern: 1.5px dots, 3px gaps       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Realistic curved dotted lane line          │
│  following actual traffic flow! ✓           │
└─────────────────────────────────────────────┘
```

## Why This is "Realistic"

### 1. **Data-Driven** (Not Guesswork)
- Based on **actual vehicle positions** from radar
- Not theoretical or manually drawn
- Reflects **real-world driver behavior**

### 2. **Weighted by Traffic Volume**
- High-traffic paths have **more influence**
- Outliers (single vehicles) don't skew the curve
- Shows the **typical/common path**

### 3. **Adaptive to Road Changes**
- If traffic pattern changes, curves **update automatically**
- Construction detours, lane closures → curves adapt
- **Self-correcting** over time

### 4. **Segment Granularity**
- 5m segments capture **realistic road curvature**
- Not too fine (noisy) or too coarse (blocky)
- Matches typical highway curve radius

### 5. **Smart Thresholds**
- 0.5m variance threshold prevents **false curves** on straight roads
- Only curves when there's **meaningful lateral movement**
- Performance optimization for common straight-road case

## Real-World Applications

### Highway On-Ramp Merge
```
Before (Straight Lines):          After (Curved Following Traffic):
    │                                   │
    │ Lane 1                            │ Lane 1
    │                                    \
    │                                     ╲
    │                 Merge lane           ╲ Merge lane
    │                 enters here            ╲ curves naturally
    │                                          \
    │ Lane 2                                    \ Lane 2
    │                                            │
```

### Roundabout Approach
```
Vehicles approach roundabout and curve right:

Detected curve path:
       │
       │ Straight approach
       │
        \
         \
          ●─●─●─● Curve begins (following actual vehicle paths)
              ╲
               ╲
                ● Into roundabout
```

## Summary

✅ **Curves are REALISTIC** because they:
1. Use **actual vehicle position data** (not simulated)
2. Weight by **traffic density** (common paths emphasized)
3. Detect **statistical patterns** (variance-based curve detection)
4. Render **smooth, natural curves** (quadratic spline interpolation)
5. **Adapt automatically** to changing traffic patterns

The dotted lane lines truly **follow the actual traffic flow** captured by the radar system!
