## Context
Traffic engineers need real-time visibility into traffic conditions to optimize signal timing and reduce congestion. The ClairWav-T80 radar system provides comprehensive traffic data through 5 packet types, but current systems lack real-time processing and visualization capabilities.

## Goals / Non-Goals
- **Goals**: 
  - Real-time traffic signal control dashboard
  - Sub-second latency for radar data processing
  - Multi-lane analysis for traffic optimization
  - Signal timing recommendations based on queue data
  - Performance metrics and congestion monitoring
- **Non-Goals**: 
  - Historical data analysis (focus on real-time)
  - Mobile app development (desktop dashboard only)
  - Integration with other radar systems (ClairWav-T80 only)

## Decisions
- **Decision**: Use Next.js 15 with App Router for full-stack development
  - **Alternatives considered**: Separate React frontend + Express backend
  - **Rationale**: Next.js 15 provides better performance, Server Components for data fetching, and unified development experience
- **Decision**: Redis as primary data store with Radar04/* key pattern
  - **Alternatives considered**: PostgreSQL, MongoDB for real-time data
  - **Rationale**: Redis provides sub-second latency required for real-time traffic control decisions
- **Decision**: WebSocket connections for real-time updates
  - **Alternatives considered**: Server-Sent Events, polling
  - **Rationale**: WebSockets provide bidirectional communication and lower latency for real-time dashboard updates

## Risks / Trade-offs
- **Risk**: Redis server failure could disrupt traffic control
  - **Mitigation**: Implement Redis clustering and fallback mechanisms
- **Risk**: Radar data loss could affect signal timing accuracy
  - **Mitigation**: Implement data validation and quality monitoring
- **Risk**: High-frequency data processing could impact performance
  - **Mitigation**: Implement efficient data structures and caching strategies

## Migration Plan
1. **Phase 1**: Set up Next.js 15 project with Redis integration
2. **Phase 2**: Implement radar data processing for all 5 packet types
3. **Phase 3**: Create real-time dashboard components
4. **Phase 4**: Implement signal control algorithms
5. **Phase 5**: Testing and validation with traffic engineers
6. **Phase 6**: Production deployment and monitoring

## Open Questions
- What is the expected data volume per minute from the radar system?
- Are there specific traffic engineering standards that must be followed?
- What are the security requirements for traffic control system access?
- How should signal timing changes be validated before implementation?
