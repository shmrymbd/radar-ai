# Vehicle Classification System Architecture

## Overview

The Vehicle Classification System is a comprehensive analytics platform that processes radar data to provide real-time and historical insights into traffic patterns, vehicle types, and intersection performance. This document outlines the system architecture, components, and data flow.

## System Components

### 1. Data Sources

#### Radar Systems (ClairWav-T80)
- **Input**: PassData (0x05) packets
- **Frequency**: Real-time (sub-second)
- **Data Volume**: 100-1000 vehicles per hour per intersection
- **Format**: Binary radar packets converted to JSON

#### Device Management
- **Multi-device Support**: Multiple radar installations
- **Device Selection**: Dynamic device switching
- **Health Monitoring**: Device status and connectivity

### 2. Backend Services

#### Classification Processor
```typescript
class ClassificationProcessor {
  // Singleton pattern for global state management
  private static instance: ClassificationProcessor;
  
  // Core processing methods
  processPassDataForClassification(data: ProcessedPassData, deviceId: string): void;
  getClassificationMetrics(deviceId: string): ClassificationMetrics;
  getClassificationSummary(deviceId: string): ClassificationSummary;
}
```

#### API Layer
- **REST API**: `/api/classification/*` with comprehensive endpoints
  - `/api/classification` - Main classification data with filtering
  - `/api/classification/summary` - Summary statistics
  - `/api/classification/metrics` - Real-time metrics
  - `/api/classification/cache` - Cache management
  - `/api/classification/poller` - Redis poller control
  - `/api/classification/monitoring` - Performance monitoring
  - `/api/classification/enhanced-metrics` - Advanced analytics
  - `/api/classification/auto-process` - Automated processing
- **WebSocket**: Real-time data streaming via unified server
- **Authentication**: Device-based access control
- **Rate Limiting**: Request throttling and protection
- **Performance Monitoring**: Built-in monitoring and statistics

#### Data Storage
- **Redis**: Real-time data and caching with device-specific keys
- **MongoDB**: Historical data persistence and aggregation
- **Memory**: In-memory processing for performance
- **TTL Management**: Automatic data cleanup and cache management
- **Data Export**: Multiple format support (JSON, CSV) with filtering

### 3. Frontend Components

#### Dashboard Interface
- **React Components**: Modular UI components
- **Real-time Updates**: WebSocket integration
- **Responsive Design**: Mobile and desktop support
- **Interactive Charts**: Dynamic data visualization

#### Navigation Integration
- **Tab-based Navigation**: Seamless integration with main dashboard
- **Device Context**: Device-aware data display
- **State Management**: React Context for global state

## Data Flow Architecture

### 1. Real-time Processing Pipeline

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Radar System  │───▶│  PassData (0x05) │───▶│ Classification  │
│   (ClairWav-T80)│    │   Packets        │    │   Processor     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dashboard     │◀───│   WebSocket      │◀───│   Redis Storage │
│   UI/Charts     │    │   Real-time      │    │   Analytics     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 2. Data Processing Steps

#### Step 1: Data Ingestion
```typescript
// Radar data processing
const radarProcessor = new RadarProcessor();
radarProcessor.onPassData((data: ProcessedPassData) => {
  classificationProcessor.processPassDataForClassification(data, deviceId);
});
```

#### Step 2: Classification Processing
```typescript
// Vehicle classification
const vehicleType = classifyVehicle(data);
const metrics = updateClassificationMetrics(vehicleType, data);
const summary = calculateSummaryStatistics(metrics);
```

#### Step 3: Data Storage
```typescript
// Redis storage
const redisClient = new RedisClient();
await redisClient.setex(`classification:${deviceId}:${vehicleType}`, 3600, JSON.stringify(metrics));
```

#### Step 4: Real-time Updates
```typescript
// WebSocket broadcasting
const websocketServer = new WebSocketServer();
websocketServer.broadcast({
  type: 'classification_update',
  deviceId: deviceId,
  data: metrics
});
```

## Component Architecture

### 1. Backend Services

#### Classification Processor
- **Purpose**: Core vehicle classification logic
- **Responsibilities**:
  - Vehicle type classification
  - Speed analysis and violations
  - Lane utilization calculation
  - Time-based aggregation
  - Peak hour analysis

#### API Endpoints
- **GET /api/classification**: Retrieve classification data
- **POST /api/classification**: Process real-time updates
- **GET /api/classification/metrics**: Real-time metrics
- **GET /api/classification/summary**: Summary statistics

#### WebSocket Server
- **Purpose**: Real-time data streaming
- **Features**:
  - Multi-client support
  - Device-specific subscriptions
  - Automatic reconnection
  - Error handling

### 2. Frontend Components

#### Dashboard Page
```typescript
// /src/app/classification/page.tsx
export default function ClassificationPage() {
  const { selectedDevice } = useDevice();
  const [data, setData] = useState<ClassificationData | null>(null);
  
  // Real-time data fetching
  useEffect(() => {
    fetchClassificationData(selectedDevice.id);
  }, [selectedDevice.id]);
  
  return (
    <div className="classification-dashboard">
      <MetricsCards data={data} />
      <VehicleDistribution data={data} />
      <LaneUtilization data={data} />
    </div>
  );
}
```

#### Navigation Integration
```typescript
// /src/app/page.tsx
const renderTabContent = () => {
  switch (activeTab) {
    case 'classification':
      return <ClassificationPage />;
    // ... other tabs
  }
};
```

## Data Models

### 1. Core Data Types

#### ProcessedPassData
```typescript
interface ProcessedPassData {
  vehicleType: string;
  timestamp: Date;
  laneNumber: number;
  crossSectionPosition: number;
  crossSectionSpeed: number;
  headwayTime: number;
  occupancyDuration: number;
  occupancyStatus: string;
}
```

#### ClassificationMetrics
```typescript
interface ClassificationMetrics {
  totalVehicles: number;
  vehicleTypes: VehicleTypeCount[];
  averageSpeeds: SpeedByType[];
  laneUtilization: LaneUtilization[];
  peakHours: PeakHourAnalysis[];
}
```

### 2. Storage Models

#### Redis Data Structure
```typescript
// Key patterns
const keys = {
  classification: `classification:${deviceId}:${vehicleType}`,
  timeBased: `time:${deviceId}:${timeSlot}:${vehicleType}`,
  hourly: `hour:${deviceId}:${hour}:${vehicleType}`,
  laneUtil: `lane:${deviceId}:${laneNumber}`
};
```

## Performance Architecture

### 1. Scalability Design

#### Horizontal Scaling
- **Multiple Instances**: Load balancing across instances
- **Device Isolation**: Independent processing per device
- **Memory Management**: Efficient memory usage per device

#### Vertical Scaling
- **CPU Optimization**: Efficient algorithms
- **Memory Optimization**: Data structure optimization
- **Network Optimization**: WebSocket efficiency

### 2. Performance Metrics

#### Processing Performance
- **Latency**: <100ms per PassData packet
- **Throughput**: 1000+ vehicles per second
- **Memory Usage**: <100MB per device
- **CPU Usage**: <50% under normal load

#### Real-time Performance
- **WebSocket Latency**: <50ms update delay
- **Dashboard Updates**: 5-second refresh cycle
- **Data Freshness**: Real-time data within 1 second

## Security Architecture

### 1. Data Security

#### Input Validation
```typescript
function validatePassData(data: ProcessedPassData): boolean {
  return (
    data.crossSectionSpeed >= 0 && data.crossSectionSpeed <= 200 &&
    data.laneNumber >= 11 && data.laneNumber <= 32 &&
    data.occupancyDuration >= 0 && data.occupancyDuration <= 10
  );
}
```

#### Data Sanitization
- **Input Sanitization**: Clean all incoming data
- **Output Encoding**: Secure data transmission
- **Error Handling**: Safe error responses

### 2. Access Control

#### Device-based Access
- **Device Authentication**: Valid device IDs only
- **Data Isolation**: Device-specific data access
- **Rate Limiting**: Request throttling per device

## Monitoring and Observability

### 1. Health Monitoring

#### System Health
```typescript
interface SystemHealth {
  classificationProcessor: 'healthy' | 'degraded' | 'down';
  redisConnection: 'connected' | 'disconnected';
  websocketServer: 'running' | 'stopped';
  apiEndpoints: 'responsive' | 'slow' | 'down';
}
```

#### Performance Monitoring
- **Processing Latency**: Real-time processing times
- **Memory Usage**: Current memory consumption
- **Error Rates**: Classification error rates
- **Data Quality**: Data completeness metrics

### 2. Alerting System

#### Alert Types
- **High Error Rate**: >5% classification errors
- **Memory Usage**: >80% memory consumption
- **Processing Latency**: >100ms processing time
- **Data Quality**: <90% data completeness

## Deployment Architecture

### 1. Development Environment

#### Local Development
```bash
# Start classification services
npm run dev                    # Next.js development server
node start-tracking-server.js  # WebSocket server
node start-vehicle-generator.js # Test data generator
```

#### Testing
```bash
# Run tests
npm test                      # Unit tests
npm run test:e2e             # End-to-end tests
npm run test:performance     # Performance tests
```

### 2. Production Environment

#### Container Deployment
```dockerfile
# Dockerfile for classification service
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000 8081
CMD ["npm", "start"]
```

#### Environment Configuration
```typescript
// Environment variables
const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  websocket: {
    port: process.env.WEBSOCKET_PORT || 8081
  },
  classification: {
    updateInterval: process.env.UPDATE_INTERVAL || 5000
  }
};
```

## Future Architecture Enhancements

### 1. Microservices Architecture

#### Service Decomposition
- **Classification Service**: Core classification logic
- **Analytics Service**: Advanced analytics and reporting
- **Notification Service**: Real-time alerts and notifications
- **Export Service**: Data export and reporting

### 2. Cloud-native Architecture

#### Container Orchestration
- **Kubernetes**: Container orchestration
- **Service Mesh**: Inter-service communication
- **Auto-scaling**: Dynamic scaling based on load
- **Health Checks**: Automated health monitoring

### 3. Advanced Analytics

#### Machine Learning Integration
- **ML Pipeline**: Automated model training
- **Real-time Inference**: Live ML predictions
- **Model Versioning**: ML model management
- **A/B Testing**: Model performance comparison
