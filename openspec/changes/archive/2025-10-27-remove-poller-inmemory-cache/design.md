# Design: Remove Poller Methods and In-Memory Cache

## Architecture Overview

### Current Architecture (To Be Removed)
```
Radar → Redis → ClassificationRedisPoller → ClassificationProcessor (in-memory) → Frontend
                    ↓
                MongoDB (15-min intervals)
```

### New Architecture (Target)
```
Radar → Redis → Redis Pub/Sub → Redis Cache → API Routes → Frontend
         ↓              ↓              ↓
    Keyspace Notifications → WebSocket Broadcasting → MongoDB (persistence)
```

## Technical Decisions

### 1. Redis Keyspace Notifications
**Decision**: Use Redis keyspace notifications instead of polling
**Rationale**: 
- Eliminates polling overhead and reduces Redis load
- Provides true real-time updates when data changes
- Scales better for multiple devices
- Aligns with radar system behavior (uses LPUSH/RPUSH, not PUBLISH)

**Implementation**:
- Subscribe to `__keyspace@0__:${deviceId}/passdata` patterns
- Listen for `lpush` and `rpush` operations
- Fetch latest data from Redis when notifications received
- Broadcast updates via WebSocket to frontend clients

### 2. Redis as Cache Layer
**Decision**: Use Redis as the primary cache for processed classification data
**Rationale**:
- Eliminates in-memory cache duplication and memory waste
- Provides fast access to processed classification data
- Supports TTL-based cache expiration for data freshness
- Enables shared cache across multiple application instances
- Reduces MongoDB query load for frequently accessed data

**Implementation**:
- Store processed classification data in Redis with appropriate TTL
- Use Redis cache keys for real-time classification metrics
- Implement cache invalidation on data updates
- Use Redis cache for API responses to reduce MongoDB queries

### 4. Redis Cache API Queries
**Decision**: API routes query Redis cache for real-time data, MongoDB for historical data
**Rationale**:
- Eliminates in-memory cache synchronization issues
- Provides fast access to real-time classification data
- Reduces MongoDB query load for frequently accessed data
- Simplifies data access patterns

**Implementation**:
- Update all classification API routes to query Redis cache for real-time data
- Use MongoDB for historical data queries and aggregations
- Implement cache fallback to MongoDB when Redis cache misses
- Remove in-memory data access patterns

### 5. WebSocket Broadcasting
**Decision**: Use existing WebSocket server for real-time updates
**Rationale**:
- Maintains real-time user experience
- Leverages existing WebSocket infrastructure
- Provides efficient data broadcasting
- Supports multiple client connections

**Implementation**:
- Redis keyspace notifications trigger WebSocket broadcasts
- Broadcast classification updates to subscribed clients
- Maintain device-specific subscriptions
- Handle connection management and reconnection

## Data Flow Design

### Real-time Data Processing
1. **Radar Data**: ClairWav-T80 radar sends PassData to Redis
2. **Redis Storage**: Data stored in Redis with keyspace notifications enabled
3. **Pub/Sub Trigger**: Keyspace notification triggers processing
4. **Redis Cache Update**: Processed data written to Redis cache with TTL
5. **MongoDB Persistence**: Processed data written to MongoDB for persistence
6. **WebSocket Broadcast**: Update broadcast to frontend clients
7. **Frontend Update**: Real-time UI updates via WebSocket

### Historical Data Access
1. **API Request**: Frontend requests historical data
2. **MongoDB Query**: API route queries MongoDB with time filters
3. **Data Processing**: MongoDB aggregations for summary statistics
4. **Response**: Processed data returned to frontend
5. **UI Update**: Charts and metrics updated with historical data

### Real-time Data Access
1. **API Request**: Frontend requests real-time classification data
2. **Redis Cache Query**: API route queries Redis cache for current data
3. **Cache Miss Fallback**: If cache miss, query MongoDB and update Redis cache
4. **Response**: Real-time data returned to frontend
5. **UI Update**: Real-time metrics updated with cached data

## Performance Considerations

### Memory Usage Reduction
- **Before**: In-memory Maps + Redis + MongoDB (triple storage)
- **After**: Redis Cache + MongoDB (double storage, optimized)
- **Savings**: ~50% reduction in memory usage for classification data

### CPU Usage Reduction
- **Before**: Continuous polling every 30 seconds + in-memory processing
- **After**: Event-driven processing only when data changes
- **Savings**: ~90% reduction in CPU usage for classification processing

### Network Efficiency
- **Before**: Polling creates unnecessary network traffic + in-memory cache management
- **After**: Only processes data when it actually changes + Redis cache reduces MongoDB queries
- **Savings**: Significant reduction in Redis network load and MongoDB query load

## Error Handling and Resilience

### Redis Connection Failures
- Implement retry logic for Redis pub/sub connections
- Graceful degradation when Redis is unavailable
- Fallback to periodic MongoDB queries if needed

### MongoDB Connection Issues
- Connection pooling and retry logic
- Graceful error handling in API routes
- Fallback to cached data if MongoDB is unavailable

### WebSocket Connection Management
- Automatic reconnection on connection loss
- Client subscription management
- Connection health monitoring

## Migration Strategy

### Phase 1: Parallel Implementation
- Implement new architecture alongside existing system
- Test new data flow without removing old system
- Verify data consistency between both approaches

### Phase 2: Gradual Migration
- Update API routes one by one to use MongoDB
- Test each route individually
- Monitor performance and data consistency

### Phase 3: Service Removal
- Remove polling services after all APIs migrated
- Remove in-memory cache implementations
- Clean up unused code and dependencies

### Phase 4: Validation
- Comprehensive testing of new architecture
- Performance benchmarking
- Data consistency verification
- User acceptance testing

## Monitoring and Observability

### Key Metrics
- Redis pub/sub message processing rate
- MongoDB query performance
- WebSocket connection count and health
- API response times
- Memory usage reduction

### Logging
- Redis keyspace notification events
- MongoDB write operations
- WebSocket broadcast events
- API query performance
- Error rates and types

### Alerts
- Redis pub/sub connection failures
- MongoDB connection issues
- WebSocket connection drops
- API response time degradation
- Data consistency issues
