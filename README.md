# Radar Traffic Signal Control Dashboard

A real-time traffic signal control dashboard for traffic engineers using ClairWav-T80 radar systems. The dashboard analyzes vehicle detection data to optimize traffic light timing and improve intersection performance.

## Project Overview

This project processes real-time radar data from ClairWav-T80 systems to provide traffic engineers with:
- Real-time queue detection and monitoring
- Traffic flow optimization analysis
- Signal timing adjustment recommendations
- Congestion monitoring and alerts
- Performance metrics and reporting

## Technical Architecture

### Backend
- **Framework**: Next.js 15.1.8 with App Router and Server Components
- **Database**: Redis 5.9.0 (192.168.6.22:6379) with Radar04/* key pattern
- **Historical Storage**: MongoDB 6.20.0 (192.168.6.22:27017)
- **Real-time**: Unified WebSocket server (port 8080) for live data updates
- **Language**: TypeScript 5.x with strict typing
- **Runtime**: Node.js 18+ with @types/node ^24

### Data Sources
The system processes five types of radar data packets:
- **Object Data (0x01)**: Individual vehicle tracking (65 bytes/vehicle)
- **Lane Status (0x04)**: Lane performance metrics (32 bytes/lane)
- **Pass Data (0x05)**: Vehicle passing events (23 bytes/event)
- **Traffic Data (0x03)**: Statistical analysis (50 bytes/entry)
- **Region Data (0x02)**: Turn movement statistics (12 bytes/region)

### Key Features
- **Real-time Dashboard**: Live traffic monitoring with 0.1m resolution queue detection
- **Multi-lane Analysis**: Comprehensive analysis across lanes 11, 12, 13, and 485
- **Vehicle Classification System**: Advanced analytics for vehicle types, traffic composition, and intersection performance
- **Live Vehicle Tracking**: Interactive visualization with heat maps and coordinate systems
- **Video Streaming**: Multi-camera HLS streaming with 1-second latency and recording capabilities
- **Historical Analytics**: Time-based traffic patterns, peak hour analysis, and performance metrics
- **Interactive Charts**: Dynamic visualizations for vehicle distribution, speed analysis, and lane utilization
- **Multi-device Support**: Dynamic device selection with device-specific data isolation
- **WebSocket Integration**: Real-time updates via unified WebSocket server
- **Performance Monitoring**: Built-in monitoring and rate limiting for optimal performance
- Speed analysis and violation detection
- Turn movement statistics
- Signal timing optimization algorithms

## Project Constitution

This project follows a constitution-based development approach with defined principles for:
- Real-time data processing requirements
- Redis-centric architecture
- Next.js 15 best practices
- Traffic engineering accuracy
- Performance monitoring standards

See `.specify/memory/constitution.md` for complete project principles and governance.

## Development Setup

### Prerequisites
- Node.js 18+ 
- Redis server access (192.168.6.22:6379) ✅ **VERIFIED & ACTIVE**
- ClairWav-T80 radar system integration ✅ **ACTIVE DATA STREAMING**

### Installation
```bash
npm install
npm run dev
```

### Environment Variables
```env
REDIS_HOST=192.168.6.22
REDIS_PORT=6379
REDIS_KEY_PREFIX=Radar04
RADAR_PROTOCOL_VERSION=2.1
```

### Redis Connection Status ✅ **VERIFIED & ACTIVE**
- **Server**: 192.168.6.22:6379 (Redis 7.4.6)
- **Status**: Production-ready with 6+ days uptime
- **Data Volume**: 3.3M+ Object Data entries, 413K+ Lane Status entries
- **Performance**: Sub-second access times, 14 active clients
- **Data Quality**: Real-time radar data streaming with proper validation

**Connection Test**: `redis-cli -h 192.168.6.22 -p 6379 ping` → ✅ PONG

### MongoDB Connection Status ✅ **VERIFIED & ACTIVE**
- **Server**: 192.168.6.22:27017 (MongoDB 4.4.29)
- **Status**: Production-ready with comprehensive traffic data
- **Databases**: traffic_analysis (3.4GB), trafficlair (7.2GB)
- **Data Volume**: 27.6M+ traffic records, 16M+ radar records
- **Collections**: vehicle_detections, lane_status, pass_events, metrics_15min

**Connection Test**: `mongo --host 192.168.6.22 --port 27017 --username admin --password admin123 --authenticationDatabase admin --eval "db.runCommand('ping')"` → ✅ SUCCESS

See [REDIS_CONNECTION_STATUS.md](./REDIS_CONNECTION_STATUS.md) and [MONGODB_CONNECTION_STATUS.md](./MONGODB_CONNECTION_STATUS.md) for detailed connection information.

## Data Processing

### Radar Data Types
- **Object Data**: Real-time vehicle tracking with position, speed, and classification
- **Lane Status**: Queue analysis, occupancy rates, and traffic flow metrics
- **Pass Data**: Vehicle crossing events with timing and speed data
- **Traffic Data**: Statistical analysis with vehicle type counts and flow rates
- **Region Data**: Turn movement percentages for signal optimization

### Vehicle Classification System
- **PassData Processing**: Real-time analysis of vehicle crossing events (0x05 packets)
- **Vehicle Type Classification**: Automatic classification of cars, SUVs, trucks, motorcycles, and vans
- **Speed Analysis**: Statistical analysis of speeds by vehicle type with violation detection
- **Lane Utilization**: Traffic density analysis across intersection lanes
- **Time-based Aggregation**: Multi-level time analysis (1min, 15min, 1hour, daily)
- **Peak Hour Analysis**: Identification of busiest traffic periods
- **Traffic Composition**: Analysis of vehicle type distribution and trends

### Key Calculations
- Queue length and vehicle counts
- Average speeds and headway times
- Space and time occupancy rates
- Turn movement percentages
- Traffic density and flow rates
- **Vehicle Classification Metrics**: Type distribution, speed analysis, lane utilization
- **Real-time Analytics**: Live vehicle counting and classification updates
- **Historical Trends**: Time-based traffic pattern analysis

## Performance Requirements

- Sub-second data processing latency
- Real-time queue detection with 0.1m resolution
- Multi-lane analysis capabilities
- Vehicle classification processing
- Signal timing optimization algorithms

## Security and Validation

- All radar data validated against parameter ranges
- Traffic engineering calculation accuracy
- Real-time data quality monitoring
- Secure Redis connections
- Audit logging for signal timing changes

## Documentation

### Core Documentation
- **Radar Parameters**: Complete reference guide for all data types
- **API Documentation**: [Complete API Reference](./API_DOCUMENTATION.md)
- **Deployment Guide**: [Comprehensive Deployment Instructions](./DEPLOYMENT_GUIDE.md)
- **Video Streaming**: [Video Streaming Deployment Guide](./VIDEO_STREAMING_DEPLOYMENT.md)
- **Traffic Engineering**: Calculation methods and algorithms
- **System Architecture**: Technical diagrams and workflows
- **User Guide**: Traffic engineer interface documentation

### Vehicle Classification Documentation
- [API Classification Guide](./dashboard/src/docs/API_CLASSIFICATION.md)
- [Classification User Guide](./dashboard/src/docs/CLASSIFICATION_USER_GUIDE.md)
- [Classification Algorithms](./dashboard/src/docs/CLASSIFICATION_ALGORITHMS.md)
- [Classification Architecture](./dashboard/src/docs/CLASSIFICATION_ARCHITECTURE.md)
- [Classification Deployment](./dashboard/src/docs/CLASSIFICATION_DEPLOYMENT.md)

### Video Streaming Features
- **Real-time Video Streaming**: RTSP camera integration with 1-second latency
- **HLS Streaming**: HTTP Live Streaming with FFmpeg processing
- **Camera Management**: Add, edit, and manage multiple IP cameras
- **Video Recording**: On-demand and automatic video recording
- **Multi-camera Support**: Simultaneous streaming from multiple cameras
- **Browser Compatibility**: hls.js integration for universal browser support

## Contributing

This project follows constitution-based development principles. All changes must align with the project constitution and maintain consistency across templates and documentation.

## License

[License information to be added]
