# PassData Study Guide - Radar Traffic System

## Overview

**PassData (0x05)** is one of the five critical data packet types processed by the ClairWav-T80 radar system in your traffic signal control dashboard. It captures vehicle crossing events through trigger lines, providing essential timing and speed data for traffic flow analysis.

## What is PassData?

PassData represents **vehicle passing events** - moments when vehicles cross designated trigger lines in the radar detection zone. This data is crucial for:

- **Traffic Flow Analysis**: Understanding vehicle movement patterns
- **Speed Monitoring**: Detecting speed violations and flow rates  
- **Safety Analysis**: Headway time calculations for safe following distances
- **Signal Optimization**: Timing adjustments based on real vehicle behavior

## Data Structure

### Raw PassData Interface (23 bytes per event)
```typescript
export interface PassData {
  frameType: '0x05';           // Packet identifier
  deviceId: string;            // Radar device identifier
  timestamp: string;           // Event timestamp
  laneNumber: number;          // Lane where event occurred (1-65535)
  crossSectionPosition: number; // Y-axis position (0.1m resolution)
  crossSectionSpeed: number;   // Speed at crossing (0.1 km/h resolution)
  headwayTime: number;         // Time gap from previous vehicle (1s resolution)
  passingTime: string;         // Precise crossing timestamp (ms)
  occupancyDuration: number;   // Time in detection zone
  occupancyStatus: number;     // 1=entering, 0=exiting
  vehicleType: number;         // Vehicle classification
}
```

### Processed PassData Interface
```typescript
export interface ProcessedPassData {
  deviceId: string;
  timestamp: Date;             // Converted to Date object
  laneNumber: number;
  crossSectionPosition: number;
  crossSectionSpeed: number;
  headwayTime: number;
  occupancyDuration: number;
  occupancyStatus: string;     // 'entering' or 'exiting'
  vehicleType: string;        // Human-readable vehicle type
}
```

## Key Parameters Explained

### 1. **Lane Number** (2 bytes)
- **Range**: 1-65535
- **Purpose**: Identifies which lane the passing event occurred in
- **Usage**: Lane-specific traffic analysis, multi-lane intersection monitoring

### 2. **Cross-section Position** (2 bytes)
- **Range**: 0-65535 (0.1m resolution)
- **Purpose**: Y-axis distance where vehicle crossed the trigger line
- **Example**: `150` = 15.0m from radar
- **Usage**: Event location tracking, trigger line analysis

### 3. **Cross-section Speed** (2 bytes)
- **Range**: 0-65535 (0.1 km/h resolution)
- **Purpose**: Vehicle speed at the moment of crossing
- **Example**: `450` = 45.0 km/h
- **Usage**: Speed monitoring, violation detection, traffic flow analysis

### 4. **Headway Time** (2 bytes)
- **Range**: 0-65535 (1 second resolution)
- **Purpose**: Time gap between this vehicle and the previous vehicle
- **Example**: `3` = 3 seconds between vehicles
- **Usage**: Traffic flow analysis, capacity assessment, safety analysis

### 5. **Passing Time** (8 bytes)
- **Type**: Unix timestamp in milliseconds
- **Purpose**: Precise timestamp when vehicle crossed trigger line
- **Example**: `1728751878160` = 2025-10-12T13:11:18.160Z
- **Usage**: Event sequencing, temporal analysis

### 6. **Occupancy Duration** (2 bytes)
- **Range**: 0-65535 (1 second resolution)
- **Purpose**: Time vehicle spent in detection zone
- **Usage**: Vehicle behavior analysis, zone efficiency

### 7. **Occupancy Status** (1 byte)
- **Values**: 1 = entering, 0 = exiting
- **Purpose**: Direction of vehicle movement through zone
- **Usage**: Traffic flow direction analysis

### 8. **Vehicle Type** (1 byte)
- **Purpose**: Vehicle classification for analysis
- **Usage**: Traffic composition analysis, vehicle-specific behavior

## Data Processing Flow

### 1. **Raw Data Reception**
```typescript
// Radar sends 23-byte PassData packets (0x05)
// Each packet represents one vehicle crossing event
```

### 2. **Data Processing**
```typescript
public processPassData(data: PassData): ProcessedPassData {
  return {
    deviceId: data.deviceId,
    timestamp: new Date(data.passingTime),
    laneNumber: data.laneNumber,
    crossSectionPosition: data.crossSectionPosition,
    crossSectionSpeed: data.crossSectionSpeed,
    headwayTime: data.headwayTime,
    occupancyDuration: data.occupancyDuration,
    occupancyStatus: data.occupancyStatus === 1 ? 'entering' : 'exiting',
    vehicleType: this.getVehicleTypeName(data.vehicleType)
  };
}
```

### 3. **Redis Storage**
```typescript
// Stored in Redis with key: Radar04/passdata
// TTL: 2 hours (7200 seconds)
// Max entries: 500 (keeps last 500 events)
```

### 4. **Data Retrieval**
```typescript
// API endpoint: /api/tracking
// Returns processed PassData for dashboard visualization
```

## Use Cases in Traffic Analysis

### 1. **Traffic Flow Monitoring**
- **Headway Analysis**: Monitor safe following distances
- **Speed Distribution**: Analyze speed patterns by lane
- **Flow Rate Calculation**: Vehicles per hour per lane

### 2. **Signal Timing Optimization**
- **Queue Detection**: Identify when vehicles are waiting
- **Green Time Adjustment**: Optimize signal timing based on actual flow
- **Coordination**: Synchronize signals based on vehicle arrival patterns

### 3. **Safety Analysis**
- **Speed Violations**: Detect vehicles exceeding speed limits
- **Following Distance**: Monitor unsafe following patterns
- **Incident Detection**: Identify unusual traffic patterns

### 4. **Performance Metrics**
- **Lane Utilization**: Which lanes are most/least used
- **Vehicle Classification**: Mix of vehicle types
- **Temporal Patterns**: Peak hours, daily/weekly patterns

## Integration with Dashboard

### Real-time Visualization
- **Live Vehicle Tracking**: Show vehicles as they cross trigger lines
- **Speed Monitoring**: Color-coded speed indicators
- **Flow Analysis**: Real-time traffic flow calculations

### Historical Analysis
- **Trend Analysis**: Long-term traffic pattern analysis
- **Performance Reports**: Traffic flow efficiency metrics
- **Signal Optimization**: Data-driven signal timing improvements

## Technical Implementation

### Redis Storage Pattern
```
Key: Radar04/passdata
Type: List (FIFO)
TTL: 7200 seconds (2 hours)
Max Entries: 500
```

### API Integration
```typescript
// GET /api/tracking
// Returns latest PassData with vehicle tracking information
```

### WebSocket Updates
```typescript
// Real-time PassData streaming to dashboard
// Live vehicle position and movement updates
```

## Best Practices

### 1. **Data Quality**
- Validate all parameters against defined ranges
- Check for reasonable speed and position values
- Monitor for data anomalies

### 2. **Performance**
- Use Redis TTL to manage memory usage
- Limit stored entries to prevent memory overflow
- Implement efficient data retrieval patterns

### 3. **Analysis**
- Combine with other data types (Object Data, Lane Status)
- Use temporal analysis for pattern recognition
- Implement real-time alerting for anomalies

## Related Data Types

PassData works in conjunction with:

- **Object Data (0x01)**: Individual vehicle positions
- **Lane Status (0x04)**: Lane performance metrics  
- **Traffic Data (0x03)**: Statistical analysis
- **Region Data (0x02)**: Turn movement statistics

## Conclusion

PassData is essential for understanding vehicle behavior at intersections. It provides the timing and speed data needed for intelligent traffic signal control, safety monitoring, and traffic flow optimization. The 23-byte packet format efficiently captures critical vehicle crossing events while maintaining high precision for traffic engineering applications.

---

*This study guide covers the PassData implementation in your radar-ai traffic signal control system. For technical details, see the source code in `/dashboard/src/lib/radar-processor.ts` and `/dashboard/src/types/radar.ts`.*
