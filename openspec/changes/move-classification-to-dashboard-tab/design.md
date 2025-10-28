# Design: Embedded Dashboard Tabs

## Context
The dashboard has three tabs that currently show placeholders with broken links to deleted routes. All required components exist but are not integrated. This design explains how to embed these components while preserving architectural constraints.

## Architectural Constraints

### 1. MongoDB-First Classification Architecture
**Critical**: The classification system uses a **MongoDB-first architecture** with NO in-memory caching or polling.

- **Data Flow**: Redis → PassDataSubscriber → MongoDB → API Routes → WebSocket → UI
- **NO in-memory cache**: ClassificationProcessor is a minimal shell (187 lines, deprecated methods)
- **NO polling**: Real-time updates via Redis keyspace notifications
- **Single source of truth**: MongoDB `passdata` collection

**Components must**:
- Query `/api/classification` endpoints (MongoDB-backed)
- Use WebSocket via `useUnifiedWebSocket` hook for real-time updates
- Never instantiate ClassificationProcessor directly
- Pass `deviceId` to all API calls

### 2. Multi-Device Context Management
All tabs must respect device selection via `DeviceContext`:

```typescript
import { useDevice } from '@/contexts/DeviceContext';

function MyComponent() {
  const { selectedDevice } = useDevice();
  // Use selectedDevice.id in API calls and WebSocket subscriptions
}
```

### 3. WebSocket Connection Strategy
Unified WebSocket server (port 8080) handles all real-time data:

- **Single connection per client** with channel-based subscriptions
- **Device-aware routing**: Messages filtered by `deviceId`
- **Channel types**: `dashboard`, `tracking`, `classification`
- **Automatic reconnection** with exponential backoff

**Pattern**:
```typescript
const { data, isConnected, error } = useUnifiedWebSocket(
  selectedDevice.id,
  ['classification'] // Subscribe to specific channels
);
```

## Component Integration Strategy

### 1. Classification Tab
**Component**: `ClassificationDashboard.tsx` (exists, ready to use)

**Current behavior**:
- Has internal tab navigation: Real-time, Historical, Vehicles, Analytics
- Uses `useDevice()` for device context
- Uses `useUnifiedWebSocket` for real-time updates
- Queries `/api/classification` for MongoDB data

**Integration**:
```typescript
case 'classification':
  return <ClassificationDashboard />;
```

**No modifications needed** - component is self-contained.

### 2. Video Streaming Tab
**Components**:
- `VideoStreamingGrid.tsx` (camera feeds)
- `CameraSettings.tsx` (configuration)
- `VideoRecordings.tsx` (playback)

**Integration requires sub-tab navigation**:

```typescript
// Add state for video sub-tabs
const [videoSubTab, setVideoSubTab] = useState<'streams' | 'settings' | 'recordings'>('streams');

case 'video-streaming':
  return (
    <div>
      {/* Sub-tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setVideoSubTab('streams')} ...>Streams</button>
          <button onClick={() => setVideoSubTab('settings')} ...>Settings</button>
          <button onClick={() => setVideoSubTab('recordings')} ...>Recordings</button>
        </nav>
      </div>

      {/* Sub-tab content */}
      {videoSubTab === 'streams' && <VideoStreamingGrid />}
      {videoSubTab === 'settings' && <CameraSettings />}
      {videoSubTab === 'recordings' && <VideoRecordings />}
    </div>
  );
```

**State management**:
- Camera data should be lifted to page.tsx scope
- Share camera state between VideoStreamingGrid and CameraSettings
- Reset video streams when switching away from tab (resource cleanup)

### 3. Analytics Tab
**Component**: `TrafficAnalytics.tsx` (exists, ready to use)

**Integration**:
```typescript
case 'analytics':
  return <TrafficAnalytics deviceId={selectedDevice.id} />;
```

**Note**: Component requires `deviceId` prop.

## Tab State Management

### Resource Lifecycle
Different tabs have different resource management needs:

| Tab | Resources | Lifecycle Strategy |
|-----|-----------|-------------------|
| Overview | WebSocket | Keep alive always |
| Tracking | WebSocket + Canvas | Keep alive, clear canvas on unmount |
| Analytics | API polling (charts) | Fetch on mount, cleanup timers |
| Classification | WebSocket + MongoDB | Keep WebSocket, cache API responses |
| Video Streaming | HLS streams + FFmpeg | **Stop streams on unmount** |

**Critical for Video Streaming**:
```typescript
useEffect(() => {
  if (activeTab === 'video-streaming') {
    // Initialize camera data
  } else {
    // Cleanup: pause/stop video streams to free resources
  }
}, [activeTab]);
```

### Device Switching
When device changes:
1. DeviceContext broadcasts change
2. All components using `useDevice()` re-render
3. WebSocket connections update via `useUnifiedWebSocket`
4. API calls include new `deviceId`

**No special handling needed** - existing hooks handle this.

## Implementation Approach

### Phase 1: Remove Placeholders
1. Remove all `Link` imports and components
2. Remove placeholder divs with "coming soon" messages
3. Add component imports at top of file

### Phase 2: Embed Simple Tabs
1. Classification tab: Direct component embedding
2. Analytics tab: Direct component embedding with deviceId prop

### Phase 3: Video Streaming Sub-Tabs
1. Add `videoSubTab` state
2. Create sub-tab navigation UI (match existing tab button styles)
3. Conditionally render sub-tab components
4. Add video stream cleanup logic

### Phase 4: State Management
1. Lift camera state to page.tsx if needed
2. Add video resource cleanup in useEffect
3. Test device switching across all tabs
4. Verify WebSocket connections remain stable

## Testing Strategy

### Unit-Level
- Each embedded component renders without errors
- Device context is properly consumed
- WebSocket hooks initialize correctly

### Integration-Level
- Tab switching preserves state
- Device switching updates all tabs
- Video streams cleanup properly
- No memory leaks from WebSocket connections

### Validation Checklist
- [ ] No broken links to `/classification` or `/video-streaming`
- [ ] Classification tab shows real-time MongoDB data
- [ ] Video streaming sub-tabs navigate correctly
- [ ] Analytics charts render with device-specific data
- [ ] Device selector works across all tabs
- [ ] WebSocket connections stable during tab switches
- [ ] Video streams stop when switching away from tab

## Risk Mitigation

### Risk 1: Video Stream Resource Leaks
**Impact**: High (memory/bandwidth waste)
**Mitigation**: Implement cleanup in useEffect for video tab

### Risk 2: WebSocket Connection Instability
**Impact**: Medium (real-time data loss)
**Mitigation**: Use existing `useUnifiedWebSocket` hook which has reconnection logic

### Risk 3: Classification Cache Confusion
**Impact**: Medium (stale data, architectural violations)
**Mitigation**:
- Verify no ClassificationProcessor instantiation
- Ensure all data comes from `/api/classification`
- Document MongoDB-first architecture in code comments

## Open Questions
None - all components exist and architecture is well-defined.
