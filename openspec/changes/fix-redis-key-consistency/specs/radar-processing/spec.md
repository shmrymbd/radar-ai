# Redis Pub/Sub Key Consistency Specification

## MODIFIED Requirements

### Requirement: Real-time Data Storage
The system SHALL store radar data in Redis with appropriate data structures and TTL values using consistent key patterns.

#### Scenario: Redis data storage
- **WHEN** radar data is processed
- **THEN** data is stored in Redis at 192.168.6.22:6379
- **AND** uses consistent key patterns: `deviceId/passdata` (lowercase, slash separator)
- **AND** pub/sub channels use pattern: `deviceId/passdata:new`
- **AND** keyspace notifications use pattern: `__keyspace@0__:deviceId/passdata`
- **AND** stream keys use pattern: `deviceId/passdata:stream`

