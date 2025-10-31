# Design: Control Center Tab

## Architectural Decisions

### 1. Component Architecture

#### Three-Panel Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Control Center Tab                                           │
├──────────────┬──────────────────────┬────────────────────────┤
│              │                      │                        │
│   Video      │   Tracking Map       │   Lane Status          │
│   Player     │   (LiveTracking)     │   Panel                │
│              │                      │                        │
│   Camera     │   Vehicle trails     │   Lane 11: Queue 12m   │
│   Select     │   Heat maps          │   Lane 12: Queue 8m    │
│              │   Zoom controls      │   Lane 13: Queue 15m   │
│   Overlay    │   Position info      │   Lane 485: Queue 0m   │
│   Toggle     │                      │                        │
│              │                      │   Occupancy %          │
│              │                      │   Flow rates           │
│              │                      │   Avg speeds           │
│              │                      │                        │
└──────────────┴──────────────────────┴────────────────────────┘
```

**Rationale**: Side-by-side layout enables simultaneous monitoring of video, tracking, and metrics without scrolling, reducing cognitive load for traffic engineers.

#### Component Hierarchy
```tsx
<ControlCenter>
  <div className="control-center-grid">
    <VideoPanel>
      <CameraSelector />
      <VideoPlayer />
      <OverlayToggle />
      <VehicleOverlay /> {/* Optional radar overlay */}
    </VideoPanel>

    <TrackingPanel>
      <LiveTracking /> {/* Existing component */}
    </TrackingPanel>

    <LaneStatusPanel>
      <LaneStatusCard lane={11} />
      <LaneStatusCard lane={12} />
      <LaneStatusCard lane={13} />
      <LaneStatusCard lane={485} />
    </LaneStatusPanel>
  </div>
</ControlCenter>
```

### 2. Video Overlay System

#### Overlay Rendering Strategy
**Decision**: Use HTML5 Canvas overlay positioned absolutely over video element

**Alternatives Considered**:
1. ❌ **SVG Overlay**: Poor performance with many vehicles (>20)
2. ❌ **WebGL**: Overkill complexity for simple vehicle rectangles
3. ✅ **Canvas**: Best performance, easy coordinate transformation

**Implementation**:
```tsx
<div className="video-container">
  <video ref={videoRef} />
  <canvas
    ref={overlayRef}
    className="video-overlay"
    style={{ position: 'absolute', top: 0, left: 0 }}
  />
</div>
```

#### Coordinate Transformation
**Challenge**: Map radar coordinates (meters from origin) to video pixel coordinates

**Solution**:
```typescript
interface CoordinateTransform {
  // Radar space: meters (x, y from radar origin)
  // Video space: pixels (0,0 = top-left of video)

  radarToVideo(radarX: number, radarY: number): { x: number, y: number } {
    // 1. Get camera calibration matrix (from camera settings)
    const calibration = getCameraCalibration(cameraId);

    // 2. Transform radar coords to world coords
    const worldX = radarX + calibration.radarOffset.x;
    const worldY = radarY + calibration.radarOffset.y;

    // 3. Apply camera projection (perspective transform)
    const videoX = (worldX * calibration.scale.x) + calibration.center.x;
    const videoY = (worldY * calibration.scale.y) + calibration.center.y;

    return { x: videoX, y: videoY };
  }
}
```

**Initial Simplification**: For MVP, use basic 1:1 scale mapping. Camera calibration is future enhancement.

#### Overlay Rendering Loop
```typescript
useEffect(() => {
  if (!showOverlay) return;

  const renderOverlay = () => {
    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d');

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get vehicles from tracking data (shared state)
    const vehicles = trackingVehicles.current;

    vehicles.forEach(vehicle => {
      const { x, y } = coordinateTransform.radarToVideo(
        vehicle.position.x,
        vehicle.position.y
      );

      // Draw vehicle rectangle
      ctx.strokeStyle = getVehicleColor(vehicle.vehicleType);
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 10, y - 10, 20, 20);

      // Draw ID label
      ctx.fillStyle = 'white';
      ctx.fillText(vehicle.targetId, x, y - 15);
    });

    requestAnimationFrame(renderOverlay);
  };

  const animationId = requestAnimationFrame(renderOverlay);
  return () => cancelAnimationFrame(animationId);
}, [showOverlay, trackingVehicles]);
```

### 3. Data Flow Architecture

#### Shared State Management
**Decision**: Use React Context + refs for cross-panel data sharing

```typescript
// ControlCenterContext.tsx
interface ControlCenterState {
  vehicles: VehiclePosition[];
  laneStatus: LaneStatusData[];
  selectedCamera: string;
  showVideoOverlay: boolean;
}

export const ControlCenterContext = createContext<ControlCenterState>();

export function ControlCenterProvider({ children }) {
  const vehiclesRef = useRef<VehiclePosition[]>([]);
  const [laneStatus, setLaneStatus] = useState<LaneStatusData[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [showVideoOverlay, setShowVideoOverlay] = useState(true);

  // Subscribe to WebSocket for vehicle updates
  useEffect(() => {
    const ws = connectWebSocket();
    ws.on('tracking', (data) => {
      vehiclesRef.current = data.vehicles;
    });
  }, []);

  // Poll /api/lanes for lane status
  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch('/api/lanes?device=' + selectedDevice.id);
      const data = await response.json();
      setLaneStatus(data.data);
    }, 3000); // 3-second refresh

    return () => clearInterval(interval);
  }, [selectedDevice]);

  return (
    <ControlCenterContext.Provider value={{
      vehiclesRef,
      laneStatus,
      selectedCamera,
      setSelectedCamera,
      showVideoOverlay,
      setShowVideoOverlay
    }}>
      {children}
    </ControlCenterContext.Provider>
  );
}
```

**Rationale**:
- **vehiclesRef**: Avoid re-renders for high-frequency tracking updates (10+ per second)
- **laneStatus**: State-based for less frequent updates (every 3 seconds)
- Context allows any panel to access shared data without prop drilling

#### WebSocket Subscription Pattern
```typescript
// Reuse existing unified WebSocket from LiveTracking
const { subscribe } = useUnifiedWebSocket();

useEffect(() => {
  const unsubscribe = subscribe('tracking', (data) => {
    vehiclesRef.current = data.vehicles;
  });

  return unsubscribe;
}, []);
```

### 4. Responsive Layout Strategy

#### Desktop Layout (≥1280px)
```css
.control-center-grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr; /* Video | Tracking | Lane Status */
  gap: 1rem;
  height: calc(100vh - 140px); /* Account for header + tabs */
}
```

#### Tablet Layout (768px - 1279px)
```css
@media (max-width: 1279px) {
  .control-center-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }

  .video-panel { order: 1; }
  .tracking-panel { order: 2; }
  .lane-status-panel { order: 3; }
}
```

#### Mobile Layout (<768px) - Tab/Accordion Pattern
```tsx
<div className="mobile-control-center">
  <div className="mobile-tabs">
    <button
      className={mobileTab === 'video' ? 'active' : ''}
      onClick={() => setMobileTab('video')}
    >
      📹 Video
    </button>
    <button
      className={mobileTab === 'tracking' ? 'active' : ''}
      onClick={() => setMobileTab('tracking')}
    >
      🗺️ Tracking
    </button>
    <button
      className={mobileTab === 'lanes' ? 'active' : ''}
      onClick={() => setMobileTab('lanes')}
    >
      🛣️ Lanes
    </button>
  </div>

  <div className="mobile-panel-content">
    {mobileTab === 'video' && <VideoPanel />}
    {mobileTab === 'tracking' && <TrackingPanel />}
    {mobileTab === 'lanes' && <LaneStatusPanel />}
  </div>
</div>
```

**Rationale**: On mobile, showing all three panels simultaneously is impractical. Tab pattern allows focus on one view at a time while maintaining quick switching.

### 5. Lane Status Panel Design

#### Data Structure (from 0x04 Lane Status packets)
```typescript
interface LaneStatusData {
  lane: {
    number: number;           // 11, 12, 13, 485
    status: number;           // Bit flags
  };
  queue: {
    length: number;           // meters
    vehicles: number;         // count
  };
  occupancy: {
    space: number;            // percentage (0-100)
    time: number;             // percentage (0-100)
  };
  speed: {
    average: number;          // km/h
    percentile85: number;     // km/h
  };
  flow: {
    rate: number;             // vehicles/hour
  };
  timestamp: Date;
}
```

#### Panel Layout
```tsx
<div className="lane-status-panel">
  <h3>Lane Status</h3>

  {laneStatus.map(lane => (
    <LaneStatusCard key={lane.lane.number} data={lane}>
      <div className="lane-header">
        <span className="lane-number">Lane {lane.lane.number}</span>
        <StatusIndicator status={lane.lane.status} />
      </div>

      <div className="lane-metrics">
        <Metric label="Queue" value={`${lane.queue.length}m`} />
        <Metric label="Vehicles" value={lane.queue.vehicles} />
        <Metric label="Occupancy" value={`${lane.occupancy.space}%`} />
        <Metric label="Speed" value={`${lane.speed.average} km/h`} />
        <Metric label="Flow" value={`${lane.flow.rate} veh/h`} />
      </div>

      <ProgressBar
        label="Space Occupancy"
        value={lane.occupancy.space}
        max={100}
        color={getOccupancyColor(lane.occupancy.space)}
      />

      <ProgressBar
        label="Time Occupancy"
        value={lane.occupancy.time}
        max={100}
        color={getOccupancyColor(lane.occupancy.time)}
      />
    </LaneStatusCard>
  ))}

  <div className="last-update">
    Updated: {formatTimestamp(lastUpdate)}
  </div>
</div>
```

#### Color Coding Strategy
```typescript
function getOccupancyColor(occupancy: number): string {
  if (occupancy < 30) return '#10B981'; // Green - light traffic
  if (occupancy < 60) return '#F59E0B'; // Amber - moderate traffic
  if (occupancy < 85) return '#EF4444'; // Red - heavy traffic
  return '#991B1B';                     // Dark red - congestion
}

function getStatusIndicator(status: number): { color: string, label: string } {
  // Bit flags from 0x04 packet
  if (status & 0x01) return { color: 'red', label: 'Fault' };
  if (status & 0x02) return { color: 'amber', label: 'Warning' };
  return { color: 'green', label: 'Normal' };
}
```

### 6. Performance Optimizations

#### Panel Memoization
```tsx
const VideoPanel = React.memo(VideoPanel);
const TrackingPanel = React.memo(TrackingPanel);
const LaneStatusPanel = React.memo(LaneStatusPanel);
```

#### Throttled Updates
```typescript
// Throttle WebSocket vehicle updates to 500ms
const throttledVehicleUpdate = useCallback(
  throttle((vehicles: VehiclePosition[]) => {
    vehiclesRef.current = vehicles;
  }, 500),
  []
);
```

#### Lazy Panel Rendering
```typescript
// Only render panels when visible (for mobile accordion)
{mobileTab === 'tracking' && <TrackingPanel />}
// Instead of:
<TrackingPanel style={{ display: mobileTab === 'tracking' ? 'block' : 'none' }} />
```

## Technology Choices

### Frontend
- **React 19.2.0**: Client components for interactivity
- **CSS Grid**: Responsive three-panel layout
- **Canvas API**: Video overlay rendering
- **WebSocket**: Real-time vehicle tracking (existing infrastructure)

### Backend
- **Existing `/api/lanes` endpoint**: Lane status data
- **Existing WebSocket server**: Vehicle tracking data
- **No new backend changes required**

### Dependencies
- No new npm packages required
- Reuses existing components and infrastructure

## Cross-Cutting Concerns

### Device Context
All panels respect the selected device from `DeviceContext`:
```typescript
const { selectedDevice } = useDevice();

// Video: Filter cameras by device
const deviceCameras = cameras.filter(c => c.deviceId === selectedDevice.id);

// Tracking: Already filtered by device in LiveTracking
<LiveTracking /> // Reads selectedDevice internally

// Lane Status: Pass device to API
fetch(`/api/lanes?device=${selectedDevice.id}`);
```

### Error Handling
Each panel handles errors independently:
```typescript
<VideoPanel>
  {videoError ? <ErrorState message={videoError} /> : <VideoPlayer />}
</VideoPanel>

<TrackingPanel>
  <ErrorBoundary fallback={<ErrorState />}>
    <LiveTracking />
  </ErrorBoundary>
</TrackingPanel>

<LaneStatusPanel>
  {laneError ? <ErrorState message={laneError} /> : <LaneCards />}
</LaneStatusPanel>
```

### Accessibility
- Keyboard navigation between panels (Tab key)
- ARIA labels for all interactive elements
- Screen reader announcements for status changes
- High contrast mode support

## Migration Strategy

### Implementation Phases
1. **Phase 1**: Create `ControlCenter.tsx` shell with three-panel grid
2. **Phase 2**: Embed existing `LiveTracking` component (center panel)
3. **Phase 3**: Build `LaneStatusPanel` with `/api/lanes` integration
4. **Phase 4**: Add video overlay canvas system
5. **Phase 5**: Implement responsive mobile layout
6. **Phase 6**: Testing and refinement

### Rollback Plan
If issues arise:
1. Remove "Control Center" tab from navigation
2. Users can still access Video Streaming, Live Tracking separately
3. No data or backend changes, so rollback is safe
