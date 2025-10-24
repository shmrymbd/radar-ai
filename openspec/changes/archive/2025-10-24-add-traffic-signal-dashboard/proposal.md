## Why
Traffic engineers need a real-time dashboard to monitor and optimize traffic signal timing using radar data from ClairWav-T80 systems. Current traffic control systems lack real-time visibility into queue lengths, vehicle speeds, and turn movements, leading to suboptimal signal timing and increased congestion.

## What Changes
- **NEW**: Real-time traffic signal control dashboard for traffic engineers
- **NEW**: Radar data processing system for 5 packet types (Object, Lane Status, Pass, Traffic, Region)
- **NEW**: Redis-based real-time data storage with Radar04/* key pattern
- **NEW**: WebSocket connections for live dashboard updates
- **NEW**: Traffic engineering calculations for queue analysis, speed monitoring, and signal optimization
- **NEW**: Multi-lane analysis capabilities for lanes 11, 12, 13, and 485
- **NEW**: Vehicle classification and turn movement statistics
- **NEW**: Performance metrics and congestion monitoring

## Impact
- **Affected specs**: New dashboard capability, radar processing system, signal control algorithms
- **Affected code**: New Next.js 15 application with Redis integration, real-time data processing
- **Infrastructure**: Redis server at 192.168.6.22:6379, ClairWav-T80 radar integration
- **Performance**: Sub-second latency requirements for real-time traffic control
- **Users**: Traffic engineers will have real-time visibility and control over signal timing
