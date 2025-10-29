# Adaptive Traffic Signal Control (ASC) Visualization

## Problem Statement

Traffic engineers need real-time visibility into how ClairWav-T80 radar data (packets 0x01-0x05) translates into Adaptive Signal Control (ASC) decisions. Currently, the dashboard displays raw metrics but doesn't show:

1. **Signal Phase Timing Logic**: How headway time, occupancy, and queue data determine green phase extensions or gap-outs
2. **Queue Management Decisions**: When queue lengths/overflow trigger phase changes to prevent spillback
3. **Priority Control Indicators**: How vehicle classification (bus, pedestrian, truck) affects signal timing
4. **Control Algorithm Status**: Real-time visibility into which ASC rules are active and their recommendations

Without this visibility, traffic engineers cannot:
- Validate that radar data is correctly influencing signal timing
- Troubleshoot timing issues when signals don't respond as expected
- Optimize threshold configurations for max headway, spillback distance, etc.
- Understand why the system made specific timing decisions

## Proposed Solution

Add a comprehensive **Adaptive Signal Control Dashboard** that visualizes the three core ASC decision algorithms in real-time:

### 1. **Green Phase Duration Panel**
Shows how occupancy and headway determine phase extensions:
- **Headway Threshold Monitor**: Current vs. max headway (e.g., 2.1s / 3.0s max)
- **Occupancy Rate Indicator**: Virtual loop occupancy with gap-out trigger point (5%)
- **Queue Count Display**: Vehicles in queue with max green extension logic
- **Phase Status**: Current phase, time remaining, extension recommendations

### 2. **Queue & Spillback Management Panel**
Visualizes queue-based emergency controls:
- **Queue Length Meter**: Current queue vs. spillback threshold (e.g., 62m / 75m)
- **Overflow Alert**: Red warning when `queue.overflow === true`
- **Lead Vehicle Position**: Distance from stop line for validation
- **Phase Call Recommendation**: "Call opposing phase" when spillback imminent

### 3. **Priority & Safety Control Panel**
Shows vehicle classification impact on timing:
- **Transit Priority Status**: Active when bus detected in approach zone
- **Pedestrian/Cyclist Detection**: NMV recall activation indicators
- **Heavy Vehicle Extension**: Extra green time recommendations for trucks
- **Active Rule Display**: Which priority rules are currently modifying timing

### 4. **Algorithm Status Indicators**
Real-time status badges showing active ASC rules:
- ✅ "Gap-Out Active" (headway > 3.0s)
- ⚠️ "Max Green Extension" (queue count high)
- 🚨 "Spillback Prevention" (queue > 75m)
- 🚌 "Transit Priority Active" (bus detected)
- 🚶 "Pedestrian Recall" (NMV detected)

## Benefits

1. **Operational Transparency**: Traffic engineers see exactly how radar data drives signal decisions
2. **Troubleshooting Speed**: Quickly identify why signals aren't responding (bad thresholds, missing data, etc.)
3. **Configuration Optimization**: Test threshold adjustments and see immediate impact
4. **Training & Validation**: Educate operators on ASC logic with live examples
5. **Audit Trail**: Document signal control decisions for compliance and analysis

## Data Sources (Existing)

All required data already flows from ClairWav-T80 radar:

| Radar Packet | Field | ASC Use Case |
|--------------|-------|--------------|
| 0x03 (Traffic) | `headwayTime` | Gap-out threshold check (> 3.0s) |
| 0x03 (Traffic) | `virtualLoopOccupancy` | Demand confirmation (< 5% = gap-out) |
| 0x04 (Lane Status) | `queue.vehicleCount` | Max green extension logic |
| 0x04 (Lane Status) | `queue.length` | Spillback prevention (> 75m threshold) |
| 0x04 (Lane Status) | `queue.overflow` | Emergency phase recall trigger |
| 0x04 (Lane Status) | `positions.leadVehicle` | Queue head validation |
| 0x03 (Traffic) | `vehicleFlows.bus` | Transit Signal Priority (TSP) |
| 0x01 (Object) | `targetType` (Person/Bicycle) | Pedestrian/NMV recall |
| 0x01 (Object) | `targetType` (Large Truck) | Heavy vehicle phase extension |

## Implementation Scope

**Frontend** (React/TypeScript):
- New `AdaptiveSignalControl.tsx` component with 4 sub-panels
- Real-time data subscriptions via WebSocket
- Visual indicators (progress bars, status badges, threshold meters)
- Responsive layout for Control Center integration

**Backend** (Next.js API):
- New `/api/signal-control/status` endpoint aggregating ASC logic
- Signal control algorithm implementation (threshold checks, priority logic)
- Real-time WebSocket updates when ASC rules activate/deactivate

**Data Processing**:
- ASC rule evaluation engine consuming 0x01, 0x03, 0x04 packets
- Threshold configuration management (max headway, spillback distance, etc.)
- Priority vehicle detection and classification logic

## Success Criteria

- ✅ Traffic engineers can see active ASC rules in real-time
- ✅ All 9 radar data points mapped to visual indicators
- ✅ Phase timing recommendations displayed with rationale
- ✅ Queue/spillback warnings trigger before actual overflow
- ✅ Priority vehicle detection visible with timing impact
- ✅ Configurable thresholds with instant visual feedback

## Dependencies

- ✅ Existing radar data processing (`0x01`, `0x03`, `0x04` packets)
- ✅ WebSocket infrastructure for real-time updates
- ✅ Control Center tab for layout integration
- ⚠️ Lane configuration (incoming/outgoing) for phase correlation

## Risks & Mitigations

**Risk**: Complex ASC logic may not match actual signal controller implementation
**Mitigation**: Start with visualization only (no actual signal control), document as "recommendation engine"

**Risk**: Real-time updates may cause performance issues
**Mitigation**: Debounce updates to 1-second intervals, use WebSocket throttling

**Risk**: Threshold values may need per-intersection tuning
**Mitigation**: Make all thresholds configurable via lane configuration modal
