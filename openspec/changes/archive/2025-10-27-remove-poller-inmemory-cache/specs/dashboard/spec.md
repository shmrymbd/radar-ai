# dashboard Specification Updates

## MODIFIED Requirements

### Requirement: Real-time Classification Updates
The system SHALL provide real-time updates for vehicle classification data using Redis keyspace notifications and MongoDB as the single source of truth.

#### Scenario: MongoDB-based data flow
- **WHEN** new PassData (0x05) packets are received in Redis
- **THEN** Redis keyspace notifications trigger immediate processing via PassDataSubscriber
- **AND** processed data is written directly to MongoDB for persistence
- **AND** WebSocket clients receive real-time updates from MongoDB queries
- **AND** no in-memory caching is used for classification data
- **AND** no polling mechanisms are used for data retrieval

#### Scenario: MongoDB-based classification data access
- **WHEN** frontend requests classification data
- **THEN** API routes query MongoDB directly for both real-time and historical data
- **AND** MongoDB aggregations provide summary statistics and metrics
- **AND** MongoDB provides fast access via indexed queries
- **AND** ClassificationProcessor serves as minimal shell for backward compatibility

#### Scenario: WebSocket Connection Management
- **WHEN** WebSocket connections are established for classification data
- **THEN** the system maintains stable connections with automatic reconnection
- **AND** handles connection failures gracefully
- **AND** provides connection status indicators
- **AND** broadcasts updates triggered by Redis keyspace notifications

### Requirement: Historical Classification Charts
The system SHALL provide historical vehicle classification charts with time-based filtering and advanced visualization capabilities using MongoDB as the data source.

#### Scenario: MongoDB-based historical data retrieval
- **WHEN** traffic engineers access historical classification data
- **THEN** the system queries MongoDB directly for historical data
- **AND** data is retrieved with optimized MongoDB queries and indexing
- **AND** charts render efficiently with large historical datasets
- **AND** MongoDB is the single source of truth for all classification data

#### Scenario: Real-time chart updates
- **WHEN** new PassData is processed via Redis keyspace notifications
- **THEN** processed data is written to MongoDB immediately by PassDataSubscriber
- **AND** WebSocket clients receive real-time chart updates from MongoDB queries
- **AND** charts update without polling or in-memory dependencies

## ADDED Requirements

### Requirement: MongoDB-First Classification Architecture
The system SHALL use MongoDB as the primary data store for all classification data, eliminating in-memory caching and polling mechanisms.

#### Scenario: Simplified ClassificationProcessor
- **WHEN** the classification processor is initialized
- **THEN** it SHALL NOT maintain in-memory Maps for classification data
- **AND** it SHALL NOT run aggregation timers for data persistence
- **AND** it SHALL serve as a minimal shell providing backward-compatible deprecated methods
- **AND** all real classification logic SHALL be handled by MongoDB queries in API routes

#### Scenario: Direct MongoDB queries in API routes
- **WHEN** API routes need classification data
- **THEN** they query MongoDB passdata collection directly
- **AND** calculate metrics from MongoDB query results
- **AND** eliminate dependency on ClassificationProcessor's in-memory cache
- **AND** use MongoDB indexes for optimal query performance

### Requirement: PassDataSubscriber MongoDB Persistence
The system SHALL use PassDataSubscriber to handle real-time data persistence from Redis to MongoDB without intermediate in-memory caching.

#### Scenario: Redis keyspace notification to MongoDB
- **WHEN** Redis keyspace notifications are received for PassData
- **THEN** PassDataSubscriber fetches latest data from Redis
- **AND** writes processed data directly to MongoDB passdata collection
- **AND** no in-memory storage is used as intermediate cache
- **AND** MongoDB serves as the single source of truth for classification data
