# Radar Device Selection Design

## Architecture Overview

### Current State
The system currently uses a hardcoded device ID "Radar04" throughout:
- Redis key prefixing (`Radar04/objectdata`, `Radar04/lanestatus`, etc.)
- WebSocket server connections
- API endpoint data retrieval
- Dashboard data display

### Target Architecture

#### 1. Device Context Management
```typescript
interface RadarDevice {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'test';
  redisPrefix: string;
  websocketPort?: number;
}
```

#### 2. Dynamic Redis Key Management
- Replace hardcoded `Radar04` prefix with dynamic device selection
- Support multiple device prefixes: `test/`, `Radar04/`, `Radar05/`, etc.
- Maintain backward compatibility with existing data

#### 3. WebSocket Server Architecture
- Single WebSocket server supporting multiple devices
- Device-specific data channels
- Client subscription to specific device data
- Efficient broadcasting to multiple device subscribers

#### 4. Frontend Device Selection
- Device selector dropdown in dashboard header
- Real-time device switching without page reload
- Visual indicators for device status
- Device-specific data validation

## Data Flow Design

### Current Flow
```
Radar Hardware → Redis (Radar04/*) → WebSocket → Dashboard
```

### Target Flow
```
Radar Hardware → Redis (device/*) → WebSocket (device channels) → Dashboard (device selector)
```

## Component Architecture

### 1. Device Context Provider
```typescript
interface DeviceContextType {
  selectedDevice: RadarDevice;
  availableDevices: RadarDevice[];
  switchDevice: (deviceId: string) => void;
  deviceStatus: Record<string, 'online' | 'offline'>;
}
```

### 2. Enhanced Redis Storage
- Dynamic key prefixing based on selected device
- Device-specific data isolation
- Efficient device switching without data loss

### 3. WebSocket Server Enhancement
- Multi-device support with channel-based broadcasting
- Device-specific subscription management
- Efficient data streaming for multiple devices

### 4. API Endpoint Updates
- Device-aware data retrieval
- Dynamic Redis key construction
- Device-specific error handling

## Implementation Strategy

### Phase 1: Core Infrastructure
1. Create device context and management system
2. Update Redis storage to support dynamic prefixes
3. Enhance WebSocket server for multi-device support

### Phase 2: Frontend Integration
1. Add device selector UI component
2. Integrate device context with existing components
3. Update dashboard to use device-aware data

### Phase 3: Configuration & Testing
1. Add device configuration management
2. Implement device status monitoring
3. Add comprehensive testing for device switching

## Technical Considerations

### Performance
- Efficient device switching without full page reload
- Optimized WebSocket connections for multiple devices
- Caching strategy for device-specific data

### Scalability
- Support for 10+ radar devices
- Efficient Redis key management
- WebSocket connection pooling

### Reliability
- Device failure handling and fallback
- Connection recovery for device switching
- Data consistency across device changes

## Migration Strategy

### Backward Compatibility
- Default device selection to "Radar04" for existing deployments
- Gradual migration path for existing installations
- Environment variable support for device configuration

### Testing Strategy
- Unit tests for device context management
- Integration tests for device switching
- E2E tests for multi-device scenarios
- Performance tests for device switching latency
