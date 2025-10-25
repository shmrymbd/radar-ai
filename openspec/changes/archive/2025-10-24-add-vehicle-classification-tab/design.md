# Vehicle Classification Tab Design

## Context

The radar-ai traffic signal control dashboard currently provides real-time vehicle tracking but lacks comprehensive vehicle classification and counting analytics. Traffic engineers need detailed insights into vehicle types, traffic composition, and historical patterns to optimize signal timing and analyze intersection performance.

## Goals / Non-Goals

### Goals
- **Real-time Classification**: Process PassData (0x05) for immediate vehicle classification
- **Historical Analytics**: Provide time-based analysis of traffic patterns and composition
- **Traffic Engineering Insights**: Support data-driven signal timing optimization
- **Performance Monitoring**: Track intersection efficiency by vehicle type
- **User Experience**: Intuitive dashboard for traffic engineers

### Non-Goals
- **Real-time Vehicle Tracking**: Existing tracking functionality remains unchanged
- **Signal Control**: Direct signal control integration (separate capability)
- **Predictive Analytics**: Machine learning-based predictions (future enhancement)
- **Multi-intersection**: Focus on single intersection analysis

## Decisions

### Decision: PassData (0x05) as Primary Data Source
- **Rationale**: PassData provides vehicle crossing events with classification, speed, and timing data
- **Alternatives considered**: Object Data (0x01) for position tracking, Lane Status (0x04) for queue analysis
- **Trade-offs**: PassData is event-driven vs continuous tracking, but provides better classification data

### Decision: Redis-based Real-time Processing
- **Rationale**: Leverage existing Redis infrastructure for sub-second latency
- **Alternatives considered**: Direct database processing, file-based storage
- **Trade-offs**: Memory usage vs performance, but Redis provides optimal real-time capabilities

### Decision: Time-based Aggregation Strategy
- **Rationale**: Multiple time windows (1min, 15min, 1hour, daily) for different analysis needs
- **Alternatives considered**: Single time window, event-based only
- **Trade-offs**: Storage overhead vs analytical flexibility

### Decision: Component-based Frontend Architecture
- **Rationale**: Reusable components for different classification views and analytics
- **Alternatives considered**: Monolithic dashboard, separate applications
- **Trade-offs**: Development complexity vs maintainability

## Technical Architecture

### Data Flow
```
PassData (0x05) → Classification Processor → Redis Storage → WebSocket → Dashboard
                     ↓
              Analytics Engine → Historical Data → Reports
```

### Component Structure
```
Vehicle Classification Tab
├── Real-time Classification Dashboard
│   ├── Vehicle Type Distribution
│   ├── Speed Analysis by Type
│   ├── Lane Utilization
│   └── Live Counting
├── Historical Analytics
│   ├── Time-based Trends
│   ├── Peak Hour Analysis
│   ├── Traffic Composition
│   └── Performance Metrics
└── Reporting & Export
    ├── Classification Reports
    ├── Data Export
    └── Custom Analytics
```

### Data Models
```typescript
interface VehicleClassification {
  vehicleType: string;
  count: number;
  averageSpeed: number;
  speedDistribution: SpeedRange[];
  laneDistribution: LaneCount[];
  timeDistribution: TimeSlot[];
}

interface ClassificationMetrics {
  totalVehicles: number;
  vehicleTypes: VehicleTypeCount[];
  averageSpeeds: SpeedByType[];
  laneUtilization: LaneUtilization[];
  peakHours: PeakHourAnalysis[];
}
```

## Risks / Trade-offs

### Performance Risks
- **Risk**: High PassData volume could impact real-time processing
- **Mitigation**: Implement efficient Redis data structures and TTL management
- **Monitoring**: Track processing latency and memory usage

### Data Quality Risks
- **Risk**: Inaccurate vehicle classification from radar data
- **Mitigation**: Implement validation algorithms and confidence scoring
- **Monitoring**: Track classification accuracy and data quality metrics

### Storage Risks
- **Risk**: Historical data could consume excessive Redis memory
- **Mitigation**: Implement data archival and compression strategies
- **Monitoring**: Track storage usage and implement cleanup routines

## Migration Plan

### Phase 1: Backend Infrastructure
1. Implement PassData classification processor
2. Add Redis storage for classification metrics
3. Create API endpoints for data retrieval
4. Implement real-time WebSocket updates

### Phase 2: Frontend Development
1. Create classification tab component
2. Implement real-time dashboard
3. Add historical analytics views
4. Integrate with existing navigation

### Phase 3: Analytics Enhancement
1. Add advanced analytics algorithms
2. Implement reporting capabilities
3. Create export functionality
4. Add performance optimizations

### Phase 4: Testing and Deployment
1. Comprehensive testing suite
2. Performance optimization
3. User acceptance testing
4. Production deployment

## Open Questions

- **Classification Accuracy**: How to validate radar-based vehicle classification accuracy?
- **Historical Retention**: What is the optimal retention period for classification data?
- **Real-time Updates**: What is the optimal update frequency for classification dashboard?
- **Export Formats**: What export formats are most useful for traffic engineers?
- **Performance Metrics**: What KPIs are most important for traffic signal optimization?
