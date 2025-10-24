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
- **Framework**: Next.js 15 with App Router and Server Components
- **Database**: Redis 192.168.6.22:6379 with Radar04/* key pattern
- **Real-time**: WebSocket connections for live data updates
- **Language**: TypeScript with strict typing

### Data Sources
The system processes five types of radar data packets:
- **Object Data (0x01)**: Individual vehicle tracking (65 bytes/vehicle)
- **Lane Status (0x04)**: Lane performance metrics (32 bytes/lane)
- **Pass Data (0x05)**: Vehicle passing events (23 bytes/event)
- **Traffic Data (0x03)**: Statistical analysis (50 bytes/entry)
- **Region Data (0x02)**: Turn movement statistics (12 bytes/region)

### Key Features
- Real-time queue length monitoring (0.1m resolution)
- Multi-lane analysis for lanes 11, 12, 13, and 485
- Vehicle classification (car, van, SUV, truck)
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

### Key Calculations
- Queue length and vehicle counts
- Average speeds and headway times
- Space and time occupancy rates
- Turn movement percentages
- Traffic density and flow rates

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

- **Radar Parameters**: Complete reference guide for all data types
- **API Documentation**: Endpoint specifications and data structures
- **Traffic Engineering**: Calculation methods and algorithms
- **System Architecture**: Technical diagrams and workflows
- **User Guide**: Traffic engineer interface documentation

## Contributing

This project follows constitution-based development principles. All changes must align with the project constitution and maintain consistency across templates and documentation.

## License

[License information to be added]
