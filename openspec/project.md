# Project Context

## Purpose
**Radar Traffic Signal Control Dashboard** - A real-time traffic signal control dashboard for traffic engineers using ClairWav-T80 radar systems. The dashboard analyzes vehicle detection data to optimize traffic light timing and improve intersection performance through real-time radar data processing and intelligent signal control algorithms.

**Key Goals:**
- Real-time queue detection and monitoring with 0.1m resolution
- Traffic flow optimization analysis and signal timing recommendations
- Multi-lane analysis for lanes 11, 12, 13, and 485
- Vehicle classification processing (car, van, SUV, truck)
- Congestion monitoring and performance metrics reporting

## Tech Stack

### Frontend & Backend
- **Framework**: Next.js 15 with App Router and Server Components
- **Language**: TypeScript with strict typing
- **Real-time**: WebSocket connections for live data updates
- **Runtime**: Node.js 18+ with edge runtime optimizations

### Database & Storage
- **Primary Database**: Redis 192.168.6.22:6379
- **Key Pattern**: Radar04/* for all radar data
- **Data Types**: Real-time radar packets with TTL-based caching
- **Backup**: MongoDB for historical data and reporting

### Data Processing
- **Radar Integration**: ClairWav-T80 radar system (Protocol V2.1)
- **Packet Types**: 5 data packet types (Object, Lane Status, Pass, Traffic, Region)
- **Processing**: Real-time with sub-second latency requirements
- **Validation**: Comprehensive parameter range validation

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier for code consistency
- **Testing**: Jest for unit tests, Playwright for E2E testing
- **Debugging**: Browser MCP for real-time debugging

## Project Conventions

### Code Style
- **TypeScript**: Strict mode enabled with comprehensive type definitions
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **File Structure**: Feature-based organization with co-located components
- **Imports**: Absolute imports using `@/` prefix for project root
- **Comments**: JSDoc for functions, inline comments for complex logic
- **Formatting**: 2-space indentation, trailing commas, semicolons required

### Architecture Patterns
- **Real-time Processing**: Event-driven architecture with Redis pub/sub
- **Data Flow**: Radar → Redis → WebSocket → Dashboard
- **Component Pattern**: Server Components for data fetching, Client Components for interactivity
- **State Management**: React hooks with Redis as single source of truth
- **Error Handling**: Comprehensive error boundaries and validation
- **Performance**: Streaming, caching, and edge runtime optimizations

### Testing Strategy
- **Unit Tests**: Jest for all traffic calculation functions and utilities
- **Integration Tests**: Redis data processing and radar packet handling
- **Performance Tests**: Real-time data handling with sub-second latency validation
- **E2E Tests**: Playwright for complete signal timing workflows
- **Traffic Engineering Tests**: Validation of calculation accuracy against known scenarios
- **Coverage**: Minimum 80% code coverage for critical traffic functions

### Git Workflow
- **Branching**: Feature branches from `main` with descriptive names
- **Commits**: Conventional commits with type prefixes (feat:, fix:, docs:, etc.)
- **Pull Requests**: Required for all changes with traffic engineering review
- **Constitution Compliance**: All changes must align with project constitution
- **Versioning**: Semantic versioning (MAJOR.MINOR.PATCH) for releases

## Domain Context

### Traffic Engineering Knowledge
- **Queue Analysis**: Real-time queue length monitoring with 0.1m resolution
- **Vehicle Classification**: Car, van, SUV, truck with size-based analysis
- **Speed Analysis**: Average speeds, 85th percentile, violation detection
- **Occupancy Rates**: Space and time occupancy calculations for traffic density
- **Turn Movements**: Left, straight, right turn percentages for signal optimization
- **Signal Timing**: Adaptive signal control based on real-time traffic conditions

### Radar Data Processing
- **Object Data (0x01)**: 65 bytes/vehicle for individual vehicle tracking
- **Lane Status (0x04)**: 32 bytes/lane for queue analysis and performance metrics
- **Pass Data (0x05)**: 23 bytes/event for vehicle crossing events
- **Traffic Data (0x03)**: 50 bytes/entry for statistical analysis
- **Region Data (0x02)**: 12 bytes/region for turn movement statistics

### Performance Requirements
- **Latency**: Sub-second data processing for real-time control
- **Resolution**: 0.1m accuracy for queue length measurements
- **Throughput**: Handle multiple radar systems simultaneously
- **Reliability**: 99.9% uptime for traffic control operations
- **Accuracy**: Traffic engineering calculation precision requirements

## Important Constraints

### Technical Constraints
- **Real-time Processing**: MANDATORY sub-second latency for all radar data
- **Redis Architecture**: MUST use existing Redis server at 192.168.6.22:6379
- **Next.js 15**: MANDATORY use of App Router and Server Components
- **TypeScript**: Strict typing required for all traffic calculations
- **Data Validation**: All radar inputs must be validated against parameter ranges

### Business Constraints
- **Traffic Control Safety**: Signal timing changes must be validated by traffic engineers
- **System Reliability**: Traffic control systems require 99.9% uptime
- **Data Accuracy**: Traffic engineering calculations must meet engineering standards
- **Performance**: Real-time dashboard updates for traffic engineers
- **Compliance**: Must follow traffic engineering best practices and standards

### Regulatory Constraints
- **Traffic Safety**: All signal timing changes must be auditable and reversible
- **Data Privacy**: Vehicle tracking data must comply with privacy regulations
- **System Security**: Traffic control systems require secure access controls
- **Documentation**: Complete audit trail for all signal timing modifications
- **Testing**: Comprehensive testing required before production deployment

## External Dependencies

### Radar Systems
- **ClairWav-T80**: Primary radar system with camera integration
- **Protocol Version**: Communication Protocol V2.1
- **Data Format**: Binary packet format with specific byte structures
- **Integration**: Real-time data streaming via network connection

### Infrastructure
- **Redis Server**: 192.168.6.22:6379 for real-time data storage ✅ **CONNECTED & ACTIVE**
  - **Status**: Production-ready with 6+ days uptime
  - **Version**: Redis 7.4.6 (latest stable)
  - **Data Volume**: 3.3M+ Object Data entries, 413K+ Lane Status entries
  - **Performance**: Sub-second access times, 14 active clients
- **MongoDB**: Historical data storage and reporting ✅ **CONNECTED & ACTIVE**
  - **Status**: Production-ready MongoDB 4.4.29
  - **Databases**: traffic_analysis (3.4GB), trafficlair (7.2GB)
  - **Data Volume**: 27.6M+ traffic records, 16M+ radar records
  - **Collections**: vehicle_detections, lane_status, pass_events, metrics_15min
- **Network**: Reliable network connection for radar data streaming ✅ **VERIFIED**
- **Hardware**: Sufficient processing power for real-time calculations

### Development Environment
- **Node.js**: Version 18+ required for Next.js 15 compatibility
- **Redis Access**: Network access to Redis server for development ✅ **VERIFIED**
  - **Connection**: Successfully tested with `redis-cli -h 192.168.6.22 -p 6379`
  - **Data Access**: Live radar data available for development and testing
  - **Key Pattern**: Radar04/* keys confirmed with active data streams
- **Radar System**: Access to ClairWav-T80 radar for testing ✅ **ACTIVE**
  - **Data Streaming**: Real-time radar data collection in progress
  - **Packet Types**: All 5 data types (Object, Lane Status, Pass, Traffic, Region) available
  - **Data Quality**: High-quality data with proper validation and formatting
- **Browser MCP**: For real-time debugging and development

### Third-Party Services
- **Traffic Signal Controllers**: Integration with existing signal control systems
- **Monitoring Systems**: Performance monitoring and alerting services
- **Reporting Tools**: Data export and reporting capabilities
- **Backup Systems**: Data backup and disaster recovery services
