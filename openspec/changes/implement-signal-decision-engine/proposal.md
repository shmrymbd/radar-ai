# Adaptive Traffic Signal Decision Engine

## Why

This change implements an automated decision engine that uses all 5 radar data types (ObjectData, RegionData, TrafficData, LaneStatus, PassData) to make intelligent red/green signal timing decisions in real-time, replacing manual signal control with data-driven adaptive optimization.

## Problem Statement

The current system collects comprehensive radar data from ClairWav-T80 sensors (packets 0x01-0x05) but lacks an automated decision engine to translate this real-time traffic intelligence into optimal red/green signal timing decisions. Traffic engineers must manually analyze data and adjust signal timing, leading to:

- **Delayed Response**: Manual analysis can't react to real-time traffic conditions
- **Suboptimal Timing**: Human decisions may miss patterns across multiple data sources
- **Inconsistent Logic**: No standardized decision framework across intersections
- **Limited Data Integration**: Current system processes packet types separately rather than holistically

## Proposed Solution

Implement an **Adaptive Traffic Signal Decision Engine** that:

1. **Integrates All Radar Data Types** (0x01-0x05):
   - ObjectData (0x01): Real-time vehicle tracking, positions, speeds
   - RegionData (0x02): Turn movement patterns and percentages
   - TrafficData (0x03): Statistical metrics, headway, occupancy
   - LaneStatus (0x04): Queue lengths, lane occupancy, flow rates
   - PassData (0x05): Vehicle crossing events with timestamps

2. **Multi-Factor Decision Algorithm**:
   - Queue-based priority: Longer queues get green phase
   - Wait time optimization: Balance maximum wait times across approaches
   - Flow rate analysis: Maximize intersection throughput
   - Safety constraints: Enforce minimum green/red times, yellow intervals
   - Turn movement coordination: Optimize protected/permissive phasing

3. **Real-time Adaptive Control**:
   - Continuous data aggregation from Redis streams
   - Sub-second decision latency
   - Dynamic phase extension/termination
   - Emergency vehicle priority override

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Radar Data Sources                       │
├─────────────┬─────────────┬─────────────┬─────────────┬─────┤
│ ObjectData  │ RegionData  │ TrafficData │ LaneStatus  │Pass │
│   (0x01)    │   (0x02)    │   (0x03)    │   (0x04)    │Data │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴─────┘
       │             │             │             │
       └─────────────┴─────────────┴─────────────┘
                      │
              ┌───────▼────────┐
              │  Redis Pub/Sub │
              └───────┬────────┘
                      │
       ┌──────────────▼──────────────┐
       │  Signal Decision Engine     │
       ├─────────────────────────────┤
       │ • Data Aggregation Layer    │
       │ • Multi-Factor Scoring      │
       │ • Decision Logic            │
       │ • Safety Validation         │
       └──────────────┬──────────────┘
                      │
              ┌───────▼────────┐
              │ Signal Commands│
              │  (Red/Green)   │
              └────────────────┘
```

## Data Source Contributions

### ObjectData (0x01) - Vehicle Tracking
**Usage**: Real-time vehicle positions and speeds for dynamic phase timing
- Track vehicle approach speeds → predict arrival times
- Count vehicles in detection zones → measure demand
- Classify vehicle types → apply priority rules (emergency, transit)

### RegionData (0x02) - Turn Movements
**Usage**: Optimize protected vs. permissive turn phases
- Left turn percentages → decide if protected phase needed
- Through movement volume → balance phase splits
- Right turn patterns → optimize overlap phases

### TrafficData (0x03) - Statistical Analysis
**Usage**: Predictive decision making based on historical patterns
- Headway analysis → detect platoon formations
- Occupancy rates → identify saturation levels
- Flow rates → measure intersection capacity utilization

### LaneStatus (0x04) - Queue Detection
**Usage**: Primary input for phase selection and duration
- Queue length → prioritize longest queues
- Occupancy percentage → detect spillback risk
- Vehicles in queue → calculate clearance time needed

### PassData (0x05) - Crossing Events
**Usage**: Real-time feedback for decision validation
- Crossing timestamps → measure actual clearance rates
- Speed distribution → validate phase timing effectiveness
- Lane utilization → identify underutilized capacity

## Decision Algorithm Overview

### Phase 1: Data Aggregation (Every 100ms)
```typescript
interface AggregatedTrafficState {
  timestamp: number;
  deviceId: string;
  approaches: {
    [laneNumber: number]: {
      queueLength: number;        // From LaneStatus (0x04)
      waitTime: number;            // From PassData (0x05) analysis
      vehicleCount: number;        // From ObjectData (0x01)
      averageSpeed: number;        // From TrafficData (0x03)
      turnMovements: TurnRatios;   // From RegionData (0x02)
      occupancyRate: number;       // From LaneStatus (0x04)
    }
  };
}
```

### Phase 2: Multi-Factor Scoring
Each approach receives a priority score (0-100):
```typescript
score = (
  queueLengthFactor * 0.35 +      // Longest queues prioritized
  waitTimeFactor * 0.25 +          // Prevent starvation
  demandFactor * 0.20 +            // Vehicle count and arrival rate
  efficiencyFactor * 0.15 +        // Throughput optimization
  safetyFactor * 0.05              // Emergency/pedestrian priority
)
```

### Phase 3: Decision Logic
```typescript
if (emergencyVehicleDetected) {
  return preemptSignal(emergencyApproach);
}

const highestPriorityApproach = findMaxScore(approaches);

if (currentPhase === highestPriorityApproach) {
  if (canExtendPhase && demandRemains) {
    return extendGreen(currentPhase);
  }
}

if (minGreenTimeElapsed && shouldTerminate) {
  return transitionToPhase(highestPriorityApproach);
}
```

### Phase 4: Safety Validation
All decisions must satisfy:
- Minimum green time (e.g., 5 seconds)
- Maximum green time (e.g., 60 seconds)
- Yellow interval standards (based on speed limit)
- All-red clearance time
- Pedestrian crossing time requirements

## Benefits

### Traffic Efficiency
- **Reduced Delay**: Adaptive timing minimizes queue wait times
- **Increased Throughput**: Optimal phase allocation maximizes vehicles/hour
- **Better Coordination**: Multi-approach optimization prevents gridlock

### Safety Improvements
- **Emergency Priority**: Automatic detection and preemption
- **Pedestrian Safety**: Enforced minimum crossing times
- **Conflict Prevention**: Validated phase transitions with clearance intervals

### Data-Driven Optimization
- **Holistic Analysis**: All 5 data types inform every decision
- **Real-time Adaptation**: Sub-second response to changing conditions
- **Performance Metrics**: Continuous monitoring of decision effectiveness

### Operational Advantages
- **Consistent Logic**: Standardized decision framework
- **Audit Trail**: Complete logging of all decisions and inputs
- **Manual Override**: Engineers can disable automation when needed

## Success Criteria

### Performance Metrics
- **Decision Latency**: < 500ms from data update to signal command
- **Queue Reduction**: 20% decrease in average queue length
- **Throughput Increase**: 15% more vehicles processed per hour
- **Wait Time Reduction**: 25% decrease in maximum wait time

### Reliability Metrics
- **Uptime**: 99.9% availability
- **Safety Compliance**: 100% adherence to minimum timing standards
- **Data Quality**: < 5% decision errors due to bad data

### Operational Metrics
- **Manual Overrides**: < 10% of operation time in manual mode
- **Engineer Satisfaction**: Positive feedback on decision quality
- **Incident Prevention**: Zero safety incidents attributed to automated decisions

## Implementation Phases

### Phase 1: Core Decision Engine (2-3 weeks)
- Data aggregation layer
- Multi-factor scoring algorithm
- Basic decision logic with safety validation

### Phase 2: Advanced Features (2 weeks)
- Emergency vehicle preemption
- Turn movement optimization
- Adaptive learning from historical performance

### Phase 3: Integration & Testing (2 weeks)
- Signal controller integration
- Real-world testing at pilot intersection
- Performance monitoring dashboard

### Phase 4: Production Deployment (1 week)
- Multi-intersection rollout
- Documentation and training
- Ongoing monitoring and refinement

## Risk Mitigation

### Technical Risks
- **Data Quality Issues**: Implement validation and fallback to manual mode
- **System Failures**: Maintain fail-safe default timing plans
- **Integration Problems**: Gradual rollout with pilot testing

### Operational Risks
- **Engineer Resistance**: Provide manual override and extensive training
- **Unexpected Behavior**: Comprehensive logging and rollback capability
- **Performance Issues**: Load testing and optimization before production

## Dependencies

- Existing signal-control specification requirements
- Redis Pub/Sub infrastructure for real-time data
- MongoDB for decision audit logging
- WebSocket server for real-time monitoring
- Lane configuration system for intersection-specific parameters

## Next Steps

1. Review and approve this proposal
2. Create detailed design document with component specifications
3. Break down implementation into specific tasks
4. Update signal-control spec with new requirements
5. Begin Phase 1 development

---

**Proposal Version**: 1.0.0
**Created**: 2025-10-29
**Status**: Draft - Awaiting Approval
