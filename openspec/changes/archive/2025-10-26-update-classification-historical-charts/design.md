# Historical Classification Charts Design

## Context

The current vehicle classification system provides real-time analytics through Redis storage but lacks historical data persistence and advanced charting capabilities. Traffic engineers need to analyze traffic patterns over extended periods to optimize signal timing and understand intersection performance. The system needs to store historical classification data in MongoDB with 15-minute aggregation intervals and provide comprehensive charting options including histograms, heatmaps, and trend analysis.

## Goals / Non-Goals

### Goals
- **Historical Data Persistence**: Store classification data in MongoDB with 15-minute aggregation
- **Time-based Filtering**: Support 24hrs, yesterday, and monthly analysis periods
- **Advanced Charting**: Implement histogram, heatmap, and trend visualizations
- **Performance Optimization**: Efficient data retrieval and chart rendering
- **Data Integrity**: Reliable data archival and retrieval processes

### Non-Goals
- **Real-time Historical Updates**: Historical data updates every 15 minutes, not real-time
- **Complex Machine Learning**: Focus on visualization, not predictive analytics
- **Multi-intersection Analysis**: Single intersection focus for initial implementation
- **Real-time Chart Updates**: Charts update on user interaction, not automatically

## Decisions

### Decision: 15-minute Aggregation Intervals
- **Rationale**: Balances data granularity with storage efficiency and analytical value
- **Alternatives considered**: 1-minute (too granular), 1-hour (too coarse), 5-minute (still too granular)
- **Trade-offs**: 15-minute intervals provide sufficient detail for traffic pattern analysis while keeping storage manageable

### Decision: MongoDB for Historical Storage
- **Rationale**: Leverage existing MongoDB infrastructure for persistent historical data
- **Alternatives considered**: Redis persistence, file-based storage, separate database
- **Trade-offs**: MongoDB provides better querying capabilities and integrates with existing infrastructure

### Decision: Histogram Charting as Primary Visualization
- **Rationale**: Histograms effectively show vehicle type distribution patterns over time
- **Alternatives considered**: Pie charts, bar charts, line charts
- **Trade-offs**: Histograms provide better temporal analysis than static charts

### Decision: Time-based Filtering Interface
- **Rationale**: Predefined time periods (24hrs, yesterday, month) simplify user interaction
- **Alternatives considered**: Custom date picker, relative time selection
- **Trade-offs**: Predefined periods are faster to use but less flexible

## Technical Architecture

### Data Flow
```
PassData (0x05) → Classification Processor → Redis (Real-time) → Dashboard
                     ↓
              MongoDB (Historical) → 15-min Aggregation → Historical Charts
```

### MongoDB Schema Design
```typescript
interface ClassificationHistory {
  _id: ObjectId;
  deviceId: string;
  timestamp: Date;
  timeSlot: string; // "YYYY-MM-DD-HH-MM" format
  vehicleTypes: {
    car: number;
    suv: number;
    truck: number;
    motorcycle: number;
    van: number;
  };
  laneUtilization: {
    lane11: number;
    lane12: number;
    lane31: number;
    lane32: number;
  };
  speedAnalysis: {
    averageSpeed: number;
    speedViolations: number;
    speedDistribution: SpeedRange[];
  };
  totalVehicles: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Chart Types and Visualizations

#### 1. Histogram Charts
- **Vehicle Type Distribution**: Shows count of each vehicle type over time
- **Speed Distribution**: Histogram of speed ranges by vehicle type
- **Lane Utilization**: Histogram of lane usage patterns

#### 2. Heatmap Visualizations
- **Time vs Vehicle Type**: 2D heatmap showing traffic patterns
- **Lane vs Time**: Heatmap of lane utilization over time
- **Speed vs Time**: Color-coded speed patterns

#### 3. Trend Analysis Charts
- **Line Charts**: Traffic volume trends over time
- **Area Charts**: Cumulative traffic patterns
- **Comparative Charts**: Side-by-side period comparisons

#### 4. Advanced Infographics
- **Traffic Flow Diagrams**: Visual representation of intersection flow
- **Peak Hour Analysis**: Bar charts showing busiest periods
- **Composition Trends**: Stacked area charts for vehicle type evolution

## Risks / Trade-offs

### Performance Risks
- **Risk**: Large historical datasets could impact chart rendering performance
- **Mitigation**: Implement data pagination and chart virtualization
- **Monitoring**: Track chart load times and data query performance

### Storage Risks
- **Risk**: 15-minute aggregation could still generate significant data volume
- **Mitigation**: Implement data compression and archival strategies
- **Monitoring**: Track MongoDB storage usage and implement cleanup routines

### Data Consistency Risks
- **Risk**: Aggregation process could miss or duplicate data
- **Mitigation**: Implement idempotent aggregation with conflict resolution
- **Monitoring**: Track aggregation accuracy and data integrity

## Migration Plan

### Phase 1: MongoDB Integration
1. Design and implement MongoDB schema for historical data
2. Create aggregation service for 15-minute data processing
3. Implement data archival from Redis to MongoDB
4. Add error handling and data validation

### Phase 2: Historical API Development
1. Create API endpoints for historical data retrieval
2. Implement time-based filtering and querying
3. Add data export capabilities
4. Create performance optimization for large datasets

### Phase 3: Chart Implementation
1. Implement histogram charting components
2. Add heatmap and trend visualization
3. Create time period selection interface
4. Add chart export and sharing capabilities

### Phase 4: Testing and Optimization
1. Performance testing with large datasets
2. User interface testing and optimization
3. Data accuracy validation
4. Production deployment and monitoring

## Open Questions

- **Data Retention**: What is the optimal retention period for historical classification data?
- **Chart Performance**: What is the maximum data range that can be efficiently rendered?
- **Export Formats**: What export formats are most useful for traffic engineers?
- **Real-time Updates**: Should historical charts update automatically or on user request?
- **Data Compression**: What compression strategies should be used for long-term storage?
