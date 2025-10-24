# Live Vehicle Tracking Design

## Architecture Overview

### System Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Radar Data    │───▶│  Redis Storage   │───▶│ Tracking Server │
│  (ClairWav-T80) │    │  (Object Data)   │    │   (WebSocket)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dashboard     │◀───│  Live Tracking   │◀───│  WebSocket      │
│   (Existing)    │    │      Tab         │    │   Client        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow
1. **Radar Detection**: ClairWav-T80 detects vehicles and sends Object Data (0x01)
2. **Redis Storage**: Vehicle positions stored in Redis with real-time updates
3. **Tracking Server**: Processes vehicle data and streams via WebSocket
4. **Live Visualization**: Canvas-based rendering of vehicle positions and movements

## Technical Design Decisions

### 1. Coordinate System Mapping

#### Radar Coordinate System
- **Origin**: Radar position (0,0)
- **X-axis**: Lateral position (-15m to +15m for lane coverage)
- **Y-axis**: Longitudinal position (0m to 300m front-facing)
- **Resolution**: 0.1m accuracy
- **Units**: Meters

#### Visual Coordinate System
- **Canvas Size**: 1200x600 pixels (2:1 aspect ratio)
- **Scale**: 1 pixel = 0.5m (300m range = 600px height)
- **Origin**: Bottom-left corner (radar position)
- **Y-axis**: Inverted (0m at bottom, 300m at top)

#### Coordinate Transformation
```typescript
function radarToVisual(radarX: number, radarY: number): {x: number, y: number} {
  const scale = 2; // 1 pixel = 0.5m
  const canvasHeight = 600;
  
  return {
    x: (radarX + 15) * scale, // Offset for lane coverage
    y: canvasHeight - (radarY * scale) // Invert Y-axis
  };
}
```

### 2. Vehicle Rendering System

#### Vehicle Size Mapping
- **Cars**: 4-5m length × 1.8m width
- **Trucks**: 8-12m length × 2.5m width  
- **Motorcycles**: 2m length × 0.8m width
- **Visual Scale**: Proportional to actual dimensions

#### Vehicle Classification Colors
- **Cars**: Blue (#3B82F6)
- **Trucks**: Red (#EF4444)
- **Motorcycles**: Green (#10B981)
- **Buses**: Orange (#F59E0B)
- **Unknown**: Gray (#6B7280)

#### Speed Visualization
- **Color Intensity**: Darker = faster
- **Speed Ranges**:
  - 0-20 km/h: Light color
  - 20-50 km/h: Medium color
  - 50+ km/h: Dark color
- **Movement Vectors**: Arrow showing direction and speed

### 3. WebSocket Architecture

#### High-Frequency Updates
- **Update Rate**: 10Hz (100ms intervals)
- **Data Format**: Delta updates for efficiency
- **Payload**: Only changed vehicle positions
- **Compression**: JSON with minimal overhead

#### Message Format
```typescript
interface TrackingUpdate {
  type: 'vehicle_update' | 'vehicle_enter' | 'vehicle_exit';
  timestamp: number;
  vehicles: VehiclePosition[];
}

interface VehiclePosition {
  targetId: string;
  x: number;
  y: number;
  length: number;
  width: number;
  speed: number;
  vehicleType: string;
  laneNo: number;
}
```

### 4. Performance Optimizations

#### Canvas Rendering
- **Frame Rate**: 60fps target
- **Viewport Culling**: Only render visible vehicles
- **Update Batching**: Batch multiple vehicle updates
- **Smooth Interpolation**: Interpolate between position updates

#### WebSocket Efficiency
- **Delta Updates**: Only send changed positions
- **Compression**: Gzip compression for large updates
- **Connection Pooling**: Reuse WebSocket connections
- **Rate Limiting**: Prevent excessive update frequency

## Risk Assessment

### Technical Risks

#### High-Frequency Data Processing
- **Risk**: WebSocket server overload with high vehicle density
- **Mitigation**: Implement connection limits and data throttling
- **Monitoring**: Real-time performance metrics and alerting

#### Browser Performance
- **Risk**: Canvas rendering performance on older devices
- **Mitigation**: Implement performance detection and quality scaling
- **Fallback**: Reduced update rate for low-performance devices

#### Data Synchronization
- **Risk**: Vehicle positions may become inconsistent
- **Mitigation**: Implement position validation and correction
- **Recovery**: Automatic re-synchronization mechanisms

### User Experience Risks

#### Visual Clutter
- **Risk**: Too many vehicles causing visual confusion
- **Mitigation**: Implement vehicle filtering and density controls
- **Options**: Lane-specific views and vehicle type filtering

#### Real-time Lag
- **Risk**: Delayed vehicle updates affecting user experience
- **Mitigation**: Optimize WebSocket performance and implement lag detection
- **Indicators**: Show connection status and update latency

## Migration Strategy

### Phase 1: Infrastructure
1. **Deploy Tracking Server**: Separate from existing dashboard
2. **Test WebSocket Performance**: Validate high-frequency updates
3. **Implement Basic Visualization**: Simple vehicle rendering

### Phase 2: Integration
1. **Add Dashboard Tab**: Integrate with existing dashboard
2. **Implement Advanced Features**: Vehicle classification, trails
3. **User Testing**: Traffic engineer feedback and iteration

### Phase 3: Optimization
1. **Performance Tuning**: Optimize for production load
2. **Advanced Features**: Export, recording, analysis tools
3. **Documentation**: User guides and training materials

## Open Questions

### Technical Questions
1. **WebSocket Scaling**: How many concurrent users can the system support?
2. **Data Retention**: How long should vehicle tracking history be kept?
3. **Mobile Support**: Should the tracking view work on mobile devices?

### User Experience Questions
1. **Default View**: What should be the default zoom level and view?
2. **Vehicle Details**: What information should be shown when clicking vehicles?
3. **Export Format**: What formats should be supported for data export?

### Performance Questions
1. **Update Frequency**: Is 10Hz sufficient for traffic engineering needs?
2. **Visual Quality**: What level of detail is needed for vehicle representation?
3. **Historical Data**: How much historical tracking data should be available?

## Success Metrics

### Technical Metrics
- **Update Latency**: <100ms from radar detection to visual update
- **Frame Rate**: Consistent 60fps rendering
- **WebSocket Performance**: <50ms message processing time
- **System Load**: <80% CPU usage under normal load

### User Metrics
- **User Adoption**: 80% of traffic engineers use live tracking
- **Session Duration**: Average 15+ minutes per tracking session
- **Feature Usage**: 60% of users utilize advanced features
- **User Satisfaction**: 4.5+ rating for tracking functionality

### Business Metrics
- **Decision Impact**: 25% improvement in signal timing decisions
- **System Validation**: 95% accuracy in radar data verification
- **Training Time**: <2 hours for traffic engineers to learn system
- **Support Load**: <5% increase in support requests
