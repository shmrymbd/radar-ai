# Vehicle Classification Algorithms - Technical Documentation

## Overview

This document provides detailed technical information about the vehicle classification algorithms used in the radar-ai traffic signal control system. The algorithms process PassData (0x05) packets to classify vehicles and generate traffic analytics.

## Data Source

### PassData (0x05) Packet Structure

The classification system processes the following fields from PassData packets:

```typescript
interface ProcessedPassData {
  vehicleType: string;           // Vehicle classification
  timestamp: Date;               // Event timestamp
  laneNumber: number;            // Lane identifier
  crossSectionPosition: number; // Position in lane (meters)
  crossSectionSpeed: number;    // Vehicle speed (km/h)
  headwayTime: number;          // Time to next vehicle (seconds)
  occupancyDuration: number;    // Time in detection zone (seconds)
  occupancyStatus: string;      // 'entering' or 'exiting'
}
```

## Classification Algorithms

### 1. Vehicle Type Classification

#### Algorithm: Rule-based Classification

The system uses a rule-based approach to classify vehicles based on radar measurements:

```typescript
function classifyVehicle(passData: ProcessedPassData): string {
  const { crossSectionSpeed, occupancyDuration, headwayTime } = passData;
  
  // Speed-based classification
  if (crossSectionSpeed > 60) return 'motorcycle';
  if (crossSectionSpeed < 30) return 'truck';
  
  // Duration-based classification
  if (occupancyDuration > 3.0) return 'truck';
  if (occupancyDuration < 1.0) return 'motorcycle';
  
  // Headway-based classification
  if (headwayTime > 4.0) return 'truck';
  if (headwayTime < 1.5) return 'motorcycle';
  
  // Default classification
  return 'car';
}
```

#### Vehicle Type Categories

- **Car**: Standard passenger vehicles (4-5 meters length)
- **SUV**: Sport utility vehicles (4.5-6 meters length)
- **Truck**: Commercial vehicles (8+ meters length)
- **Motorcycle**: Two-wheeled vehicles (2-3 meters length)
- **Van**: Commercial passenger vehicles (5-7 meters length)

### 2. Speed Analysis

#### Algorithm: Statistical Speed Analysis

```typescript
function analyzeSpeed(speeds: number[]): SpeedAnalysis {
  const sorted = speeds.sort((a, b) => a - b);
  const n = speeds.length;
  
  return {
    average: speeds.reduce((sum, speed) => sum + speed, 0) / n,
    median: sorted[Math.floor(n / 2)],
    min: Math.min(...speeds),
    max: Math.max(...speeds),
    standardDeviation: calculateStandardDeviation(speeds),
    violations: speeds.filter(speed => speed > SPEED_LIMIT).length
  };
}
```

#### Speed Violation Detection

```typescript
const SPEED_LIMIT = 60; // km/h

function detectSpeedViolations(speed: number): boolean {
  return speed > SPEED_LIMIT;
}
```

### 3. Lane Utilization Analysis

#### Algorithm: Lane Occupancy Calculation

```typescript
function calculateLaneUtilization(laneData: LaneData[]): number {
  const totalTime = laneData.reduce((sum, data) => sum + data.duration, 0);
  const occupiedTime = laneData.reduce((sum, data) => sum + data.occupancyTime, 0);
  
  return occupiedTime / totalTime;
}
```

#### Lane Efficiency Metrics

```typescript
interface LaneEfficiency {
  utilizationRate: number;    // Percentage of time lane is used
  averageSpeed: number;        // Mean speed in lane
  vehicleCount: number;       // Total vehicles in lane
  occupancyRate: number;      // Percentage of lane capacity used
}
```

### 4. Time-based Aggregation

#### Algorithm: Multi-level Time Aggregation

```typescript
function aggregateByTime(data: PassData[], period: TimePeriod): AggregatedData {
  const buckets = new Map<string, PassData[]>();
  
  data.forEach(record => {
    const bucket = getTimeBucket(record.timestamp, period);
    if (!buckets.has(bucket)) {
      buckets.set(bucket, []);
    }
    buckets.get(bucket)!.push(record);
  });
  
  return processBuckets(buckets);
}
```

#### Time Periods

- **1 minute**: Real-time analysis
- **15 minutes**: Short-term patterns
- **1 hour**: Hourly trends
- **Daily**: Daily patterns and peak analysis

### 5. Peak Hour Analysis

#### Algorithm: Traffic Density Calculation

```typescript
function calculatePeakHours(hourlyData: HourlyData[]): PeakHour[] {
  return hourlyData
    .map(data => ({
      hour: data.hour,
      density: data.vehicleCount / data.laneCapacity,
      averageSpeed: data.totalSpeed / data.vehicleCount,
      trafficFlow: data.vehicleCount / 60 // vehicles per minute
    }))
    .sort((a, b) => b.density - a.density)
    .slice(0, 5); // Top 5 peak hours
}
```

## Data Processing Pipeline

### 1. Real-time Processing

```typescript
class ClassificationProcessor {
  processPassDataForClassification(data: ProcessedPassData, deviceId: string): void {
    // 1. Classify vehicle type
    const vehicleType = this.classifyVehicle(data);
    
    // 2. Update real-time counters
    this.updateClassificationData(vehicleType, data, deviceId);
    
    // 3. Update time-based aggregation
    this.updateTimeBasedData(vehicleType, data, data.timestamp, deviceId);
    
    // 4. Update hourly analysis
    this.updateHourlyAnalysis(vehicleType, data, data.timestamp.getHours(), deviceId);
    
    // 5. Update specialized analyses
    this.updateHeadwayAnalysis(data, deviceId);
    this.updateOccupancyAnalysis(data, deviceId);
    this.updatePositionAnalysis(data, deviceId);
  }
}
```

### 2. Data Storage Strategy

#### Redis Data Structures

```typescript
// Real-time counters
const classificationKey = `classification_${deviceId}_${vehicleType}`;
const timeKey = `time_${deviceId}_${timeSlot}_${vehicleType}`;
const hourKey = `hour_${deviceId}_${hour}_${vehicleType}`;

// Data structure
interface ClassificationData {
  count: number;
  totalSpeed: number;
  speeds: number[];
  lanes: Map<number, number>;
  timestamps: Date[];
}
```

#### Memory Management

- **TTL Strategy**: Automatic cleanup of old data
- **Data Compression**: Efficient storage of historical data
- **Memory Limits**: Configurable memory usage limits

### 3. Performance Optimization

#### Algorithm Complexity

- **Vehicle Classification**: O(1) - Constant time
- **Speed Analysis**: O(n) - Linear with vehicle count
- **Lane Utilization**: O(n) - Linear with lane data
- **Time Aggregation**: O(n log n) - Sorting complexity

#### Memory Usage

```typescript
// Estimated memory usage per device
const MEMORY_PER_DEVICE = {
  realTime: '10MB',      // Real-time counters
  historical: '50MB',     // Historical data (24h)
  analytics: '20MB'      // Processed analytics
};
```

## Quality Assurance

### 1. Data Validation

```typescript
function validatePassData(data: ProcessedPassData): boolean {
  return (
    data.crossSectionSpeed >= 0 && data.crossSectionSpeed <= 200 &&
    data.laneNumber >= 11 && data.laneNumber <= 32 &&
    data.occupancyDuration >= 0 && data.occupancyDuration <= 10 &&
    ['entering', 'exiting'].includes(data.occupancyStatus)
  );
}
```

### 2. Classification Accuracy

#### Confidence Scoring

```typescript
function calculateClassificationConfidence(data: ProcessedPassData): number {
  const speedConfidence = getSpeedConfidence(data.crossSectionSpeed);
  const durationConfidence = getDurationConfidence(data.occupancyDuration);
  const headwayConfidence = getHeadwayConfidence(data.headwayTime);
  
  return (speedConfidence + durationConfidence + headwayConfidence) / 3;
}
```

### 3. Error Handling

```typescript
function handleClassificationError(error: Error, data: ProcessedPassData): void {
  console.error('Classification error:', error);
  
  // Log error for analysis
  logClassificationError({
    error: error.message,
    data: sanitizePassData(data),
    timestamp: new Date()
  });
  
  // Fallback classification
  return 'unknown';
}
```

## Monitoring and Metrics

### 1. Performance Metrics

- **Processing Latency**: Time to process each PassData packet
- **Memory Usage**: Current memory consumption
- **Classification Accuracy**: Percentage of correct classifications
- **Data Throughput**: Vehicles processed per second

### 2. Quality Metrics

- **Data Completeness**: Percentage of valid PassData packets
- **Classification Confidence**: Average confidence scores
- **Speed Violation Rate**: Percentage of speed violations
- **Lane Utilization Efficiency**: Optimal lane usage

### 3. Alerting

```typescript
interface ClassificationAlerts {
  highErrorRate: boolean;        // >5% classification errors
  lowConfidence: boolean;        // <70% average confidence
  memoryUsage: boolean;          // >80% memory usage
  processingLatency: boolean;    // >100ms processing time
}
```

## Future Enhancements

### 1. Machine Learning Integration

- **Neural Network Classification**: Deep learning for vehicle classification
- **Pattern Recognition**: AI-based traffic pattern analysis
- **Predictive Analytics**: Forecast traffic conditions

### 2. Advanced Analytics

- **Traffic Flow Modeling**: Mathematical models for traffic flow
- **Congestion Prediction**: Early warning systems
- **Optimization Algorithms**: Signal timing optimization

### 3. Real-time Optimization

- **Dynamic Classification**: Adaptive classification rules
- **Performance Tuning**: Automatic performance optimization
- **Scalability**: Horizontal scaling capabilities
