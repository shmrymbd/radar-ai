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

### Backend ✅ **EXTRACTED & STANDALONE**
- **Backend Server**: Standalone Node.js server (see `/server` directory)
  - **WebSocket Server**: Port 8080 for real-time updates
  - **Health/Metrics**: Port 8081 for monitoring
  - **Status**: ✅ 11/11 tests passing, production-ready with critical fixes needed
- **Frontend**: Next.js 15.1.8 with App Router and Server Components (see `/dashboard` directory)
- **Database**: Redis 5.9.0 (192.168.6.22:6379) with consistent key patterns
- **Historical Storage**: MongoDB 6.20.0 (192.168.6.22:27017)
- **Real-time**: Unified WebSocket server (port 8080) for live data updates
- **Language**: TypeScript 5.x with strict typing
- **Runtime**: Node.js 18+ with @types/node ^24

**Architecture Update (2025-11-01)**: Backend services extracted from dashboard into standalone `/server` directory for independent deployment and scaling. See `/server/README.md` for details.

### Redis Key Patterns ✅ CONSISTENT
- **Standardized Pattern**: `deviceId/passdata` (lowercase, slash separator)
- **Redis List**: `deviceId/passdata` for PassData storage
- **Pub/Sub Channels**: `deviceId/passdata:new` for notifications
- **Keyspace Notifications**: `__keyspace@0__:deviceId/passdata` for Redis events
- **Redis Streams**: `deviceId/passdata:stream` for stream processing
- **All Services**: Use consistent patterns for reliable pub/sub data flow

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
- **Live Vehicle Tracking**: Interactive visualization with heat maps, coordinate systems, and trail-based road lane detection
- **Video Streaming**: Multi-camera HLS streaming with 1-second latency and recording capabilities
- **Historical Analytics**: Time-based traffic patterns, peak hour analysis, and performance metrics
- **Interactive Charts**: Dynamic visualizations for vehicle distribution, speed analysis, and lane utilization
- **Trail-Based Road Visualization**: Automatic lane detection and road topology inference from vehicle movement patterns
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

### Quick Start (Automated Setup)

For new developers, use the automated setup script:

```bash
# Clone repository
git clone <repository-url>
cd radar-ai

# Run setup script
./setup.sh

# Start development server
cd dashboard
npm run dev:full
```

The setup script will:
- ✅ Verify prerequisites (Node.js, npm)
- ✅ Configure Redis and MongoDB connections
- ✅ Create environment file
- ✅ Install dependencies
- ✅ Set up database indexes
- ✅ Verify connections

📚 **For detailed setup instructions**, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)

### Prerequisites
- Node.js 18+
- Redis server access (192.168.6.22:6379) ✅ **VERIFIED & ACTIVE**
- MongoDB server access (192.168.6.22:27017) ✅ **VERIFIED & ACTIVE**
- ClairWav-T80 radar system integration ✅ **ACTIVE DATA STREAMING**

### Manual Installation

If you prefer manual setup:

```bash
# Install dependencies
cd dashboard
npm install

# Create .env.local (see ENVIRONMENT_SETUP.md for details)
# Then start development server
npm run dev:full
```

### Environment Variables
```env
# Redis Configuration
REDIS_HOST=192.168.6.22
REDIS_PORT=6379

# MongoDB Configuration
MONGODB_HOST=192.168.6.22
MONGODB_PORT=27017
MONGODB_USERNAME=admin
MONGODB_PASSWORD=admin123
MONGODB_AUTH_DATABASE=admin
MONGODB_DASHBOARD_DATABASE=traffic_signal_dashboard

# Radar Configuration
RADAR_PROTOCOL_VERSION=2.1
RADAR_DEVICE_ID=P1-center

# Dashboard Configuration
DASHBOARD_REFRESH_INTERVAL=1000
QUEUE_THRESHOLD=50
SPEED_LIMIT=60
LANES=11,12,13,485

# Development Settings
DISABLE_RATE_LIMITING=true
```

### Redis Connection Status ✅ **VERIFIED & ACTIVE**
- **Server**: 192.168.6.22:6379 (Redis 7.4.6)
- **Status**: Production-ready with multi-device support
- **Data Volume**: 3.3M+ Object Data entries, 413K+ Lane Status entries
- **Performance**: Sub-second access times, active pub/sub connections
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
- **Vehicle Type Classification**: Automatic classification using official ClairWav Communication Protocol V2.1 mapping
- **Supported Vehicle Types**: Cars, SUVs, trucks, motorcycles, vans, bicycles, buses, pedestrians, and specialized vehicles
- **Speed Analysis**: Statistical analysis of speeds by vehicle type with violation detection
- **Lane Utilization**: Traffic density analysis across intersection lanes
- **Time-based Aggregation**: Multi-level time analysis (1min, 15min, 1hour, daily)
- **Peak Hour Analysis**: Identification of busiest traffic periods
- **Traffic Composition**: Analysis of vehicle type distribution and trends
- **Accurate Mapping**: Fixed vehicle type classification using official radar protocol codes

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
- **Environment Setup**: [Complete Setup Guide](./ENVIRONMENT_SETUP.md) - **START HERE for new developers**
- **Backend Server**: [Server Documentation](./server/README.md) - Standalone backend server guide
  - [Architecture](./server/docs/ARCHITECTURE.md) - System design and component details
  - [API Reference](./server/docs/API.md) - Complete WebSocket API documentation
  - [Deployment Guide](./server/docs/DEPLOYMENT.md) - PM2, Docker, and Kubernetes deployment
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

### Live Tracking Features
- [Trail-Based Road Visualization](./TRAIL_BASED_ROAD_VISUALIZATION.md) - Automatic lane detection from vehicle movement patterns

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
