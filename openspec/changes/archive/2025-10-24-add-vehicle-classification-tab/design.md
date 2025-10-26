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
│   │   ├── Pie Chart (Vehicle Type %)
│   │   ├── Bar Chart (Count by Type)
│   │   └── Speed Distribution by Type
│   ├── Speed Analysis by Type
│   │   ├── Box Plot (Speed Ranges)
│   │   ├── Violation Analysis
│   │   └── Average Speed Trends
│   ├── Lane Utilization
│   │   ├── Heatmap (Lane vs Time)
│   │   ├── Utilization Bars
│   │   └── Occupancy Rates
│   └── Live Counting
│       ├── Real-time Counters
│       ├── Rate Indicators
│       └── Flow Metrics
├── Historical Analytics
│   ├── Time-based Trends
│   │   ├── Line Charts (Hourly/Daily)
│   │   ├── Seasonal Patterns
│   │   └── Trend Analysis
│   ├── Peak Hour Analysis
│   │   ├── Bar Charts (Peak Hours)
│   │   ├── Heat Maps (Time vs Type)
│   │   └── Congestion Patterns
│   ├── Traffic Composition
│   │   ├── Stacked Area Charts
│   │   ├── Composition Trends
│   │   └── Type Evolution
│   └── Performance Metrics
│       ├── KPI Dashboards
│       ├── Efficiency Ratios
│       └── Comparative Analysis
└── Reporting & Export
    ├── Classification Reports
    │   ├── PDF Generation
    │   ├── Custom Templates
    │   └── Automated Scheduling
    ├── Data Export
    │   ├── CSV/JSON Export
    │   ├── API Endpoints
    │   └── Bulk Downloads
    └── Custom Analytics
        ├── Query Builder
        ├── Custom Charts
        └── Advanced Filters
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

## Visual Mockups and Charts

### Dashboard Layout Mockup
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🚦 Traffic Signal Control Dashboard - Vehicle Classification                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Overview] [Tracking] [Classification] [Analytics] [Settings]                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Device: Test Device (test)                                    Last Updated: 14:32│
├─────────────────────────────────────────────────────────────────────────────────┤
│ 📊 Key Performance Indicators                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │Total Vehicles│ │Avg Speed   │ │Vehicle Types│ │Speed Viol.  │ │Peak Hour    │ │
│ │    1,247    │ │  42.3 km/h │ │      5      │ │     23      │ │   17:00     │ │
│ │   +12.3%    │ │   +2.1%    │ │   +1 new   │ │   -5.2%    │ │   +8.7%    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 📈 Vehicle Type Distribution (Last 24 Hours)                                   │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                             │ │
│ │  🚗 Cars: 65.2% (812 vehicles)    ████████████████████████████████████████ │ │
│ │  🚙 SUVs: 28.4% (354 vehicles)     ████████████████████████████████████     │ │
│ │  🚛 Trucks: 4.8% (60 vehicles)    █████████████████████████████            │ │
│ │  🏍️ Motorcycles: 1.6% (21 vehicles) █████████████████████                 │ │
│ │                                                                             │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 🛣️ Lane Utilization Analysis                                                   │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Lane 11 (Northbound): ████████████████████████████████████████ 78.5% (312) │ │
│ │ Lane 12 (Northbound): ████████████████████████████████████████████ 82.1%   │ │
│ │ Lane 31 (Southbound): ████████████████████████████████████████ 71.3% (284) │ │
│ │ Lane 32 (Southbound): ████████████████████████████████████████████ 85.2%   │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ⏰ Time-based Traffic Patterns                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Hourly Distribution (Last 24h)                                              │ │
│ │ 06:00 ████ 12:00 ████████████████████████████████████████████████████████  │ │
│ │ 07:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 08:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 09:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 10:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 11:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 12:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 13:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 14:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 15:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 16:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 17:00 ████████████████████████████████████████████████████████████████████ │ │
│ │ 18:00 ████████████████████████████████████████████████████████████████████ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Chart Types and Visualizations

#### 1. Vehicle Type Distribution
- **Pie Chart**: Circular visualization showing percentage breakdown
- **Bar Chart**: Horizontal bars comparing vehicle counts
- **Donut Chart**: Enhanced pie chart with center metrics

#### 2. Speed Analysis
- **Box Plot**: Statistical distribution of speeds by vehicle type
- **Violation Chart**: Speed limit violations by type and time
- **Speed Heatmap**: Color-coded speed patterns across lanes and time

#### 3. Lane Utilization
- **Gauge Charts**: Circular progress indicators for lane occupancy
- **Heatmap**: 2D visualization of lane usage over time
- **Stacked Bar Chart**: Lane utilization by vehicle type

#### 4. Time-based Analytics
- **Line Charts**: Traffic trends over hours, days, weeks
- **Area Charts**: Cumulative traffic patterns
- **Multi-line Charts**: Comparative analysis across vehicle types

### Interactive Features
- **Hover Tooltips**: Detailed information on chart elements
- **Click to Filter**: Interactive filtering by clicking chart elements
- **Zoom and Pan**: Detailed view of time-series data
- **Export Options**: Save charts as images or PDFs

## Open Questions

- **Classification Accuracy**: How to validate radar-based vehicle classification accuracy?
- **Historical Retention**: What is the optimal retention period for classification data?
- **Real-time Updates**: What is the optimal update frequency for classification dashboard?
- **Export Formats**: What export formats are most useful for traffic engineers?
- **Performance Metrics**: What KPIs are most important for traffic signal optimization?
