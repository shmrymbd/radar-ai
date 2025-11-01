# Architecture Documentation

This document describes the architecture and design decisions of the Radar AI backend server.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Design](#component-design)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)
- [Technology Stack](#technology-stack)
- [Scalability](#scalability)
- [Security](#security)

## Overview

The Radar AI backend server is a standalone Node.js application that handles real-time vehicle tracking and classification data from ClairWav-T80 radar devices. It provides a WebSocket API for dashboard clients and manages data persistence in Redis and MongoDB.

### Key Objectives

1. **Real-time Performance**: Sub-10ms latency for WebSocket updates
2. **Reliability**: Automatic reconnection and error recovery
3. **Scalability**: Support 50+ concurrent WebSocket connections
4. **Maintainability**: Clean separation of concerns, TypeScript type safety
5. **Observability**: Comprehensive logging and health monitoring

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Clients                         │
│              (React App - Next.js Frontend)                  │
└───────────────────┬─────────────────────────────────────────┘
                    │ WebSocket (port 8080)
                    │ HTTP Health Checks (port 8081)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend Server (Node.js)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            WebSocket Server (port 8080)                │  │
│  │  - Connection Management                               │  │
│  │  - Message Routing                                     │  │
│  │  - Rate Limiting                                       │  │
│  └────────┬──────────────────────────┬────────────────────┘  │
│           │                          │                        │
│  ┌────────▼────────┐       ┌────────▼────────┐              │
│  │   Tracking      │       │ Classification  │              │
│  │   Handler       │       │    Handler      │              │
│  └────────┬────────┘       └────────┬────────┘              │
│           │                          │                        │
│  ┌────────▼──────────────────────────▼────────┐              │
│  │          Dashboard Handler                 │              │
│  └────────────────────────────────────────────┘              │
│                                                                │
│  ┌────────────────────────────────────────────┐              │
│  │       Health Check Server (port 8081)       │              │
│  └────────────────────────────────────────────┘              │
└────────┬──────────────────────────┬────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌──────────────────┐
│  Redis Server   │      │ MongoDB Server   │
│                 │      │                  │
│  - ObjectData   │      │  - PassData      │
│  - PassData     │      │  - Historical    │
│  - Pub/Sub      │      │    Analytics     │
└─────────────────┘      └──────────────────┘
         ▲                          ▲
         │                          │
         │                          │
┌────────┴──────────────────────────┴────────┐
│      ClairWav-T80 Radar Devices             │
│         (P1-center, P3, P1-o/h)             │
└─────────────────────────────────────────────┘
```

## Component Design

### 1. WebSocket Server (`src/websocket/server.ts`)

**Responsibilities**:
- Manage WebSocket connections
- Route messages to appropriate handlers
- Broadcast updates to subscribed clients
- Handle client subscriptions (channels and devices)

**Key Features**:
- Singleton pattern ensures single server instance
- Client subscription management (channels: tracking, classification, dashboard)
- Device-specific client tracking
- Graceful shutdown support

**Architecture**:
```typescript
class UnifiedWebSocketServer {
  private clients: Map<WebSocket, ClientSubscription>
  private deviceClients: Map<string, Set<WebSocket>>

  // Handlers
  private trackingHandler: TrackingHandler
  private classificationHandler: ClassificationHandler
  private dashboardHandler: DashboardHandler

  // Services
  private redisPubSub: RedisPubSubService
}
```

### 2. Handlers (`src/websocket/handlers/`)

#### Tracking Handler

**Purpose**: Manage vehicle tracking data and real-time updates

**Components**:
- `VehicleTracker`: Maintains vehicle state, TTL management
- `RedisPubSub`: Subscribes to ObjectData keyspace events

**Data Flow**:
```
Redis LPUSH ObjectData
  → Keyspace Notification
  → RedisPubSub Handler
  → VehicleTracker.processObjectData()
  → Callback to WebSocket Server
  → Broadcast to 'tracking' channel subscribers
```

#### Classification Handler

**Purpose**: Process vehicle classification data

**Components**:
- `PassDataMongoDBService`: MongoDB queries and aggregations
- `RedisPubSub`: Subscribes to PassData keyspace events

**Data Flow**:
```
Redis LPUSH PassData
  → Keyspace Notification
  → RedisPubSub Handler
  → PassDataMongoDBService.savePassData()
  → Callback to WebSocket Server
  → Broadcast to 'classification' channel subscribers
```

#### Dashboard Handler

**Purpose**: Aggregate and deliver dashboard summary data

**Components**:
- `RedisStorage`: Query latest metrics from Redis
- Periodic update mechanism (1 Hz)

**Data Flow**:
```
Timer (1000ms interval)
  → RedisStorage.getDashboardSummary()
  → Callback to WebSocket Server
  → Broadcast to device subscribers
```

### 3. Middleware (`src/websocket/middleware/`)

#### Rate Limiter

**Purpose**: Prevent client abuse and DoS attacks

**Algorithm**:
- Sliding window counter
- 100 messages per minute per client
- Automatic window reset

**Implementation**:
```typescript
class RateLimiter {
  private limits: Map<WebSocket, RateLimitInfo>
  private readonly maxMessagesPerMinute = 100

  checkLimit(ws: WebSocket): boolean {
    // Check and increment message count
    // Reset window if expired
  }
}
```

#### Error Handler

**Purpose**: Centralized error handling and client communication

**Error Types**:
- Parse errors (invalid JSON)
- Validation errors (schema mismatch)
- Rate limit errors
- Processing errors

### 4. Services

#### Redis Services (`src/services/redis/`)

**RedisStorage**:
- Device-scoped key management
- Dashboard summary aggregation
- ObjectData/PassData queries

**RedisPubSubService**:
- Keyspace notification subscriptions
- Event-driven architecture
- Multiple device support

**Key Pattern**:
```
{deviceId}/objectdata  - Latest ObjectData
{deviceId}/passdata    - Latest PassData
```

#### MongoDB Services (`src/services/mongodb/`)

**PassDataMongoDBService**:
- PassData persistence
- Classification metrics aggregation
- Historical queries

**Schema**:
```javascript
{
  deviceId: "P1-center",
  timestamp: ISODate("2025-11-01T12:00:00Z"),
  passData: { /* radar data */ },
  // ... indexed fields
}
```

#### Tracking Services (`src/services/tracking/`)

**VehicleTracker**:
- In-memory vehicle state
- TTL-based cleanup (60 seconds)
- Trajectory tracking

**Data Structure**:
```typescript
Map<targetId, {
  targetId: number
  position: { x, y }
  velocity: { vx, vy }
  classification: string
  firstSeen: Date
  lastSeen: Date
  trajectory: Position[]
}>
```

### 5. Health Check System (`src/services/health/`)

**HealthCheckService**:
- Redis connection monitoring
- MongoDB connection monitoring
- Service health aggregation

**HealthServer**:
- HTTP server on port 8081
- `/health` - Comprehensive status
- `/ready` - Readiness probe
- `/alive` - Liveness probe
- `/metrics` - Prometheus format

## Data Flow

### ObjectData Flow (Vehicle Tracking)

```
1. Radar Device → Redis LPUSH P1-center/objectdata
2. Redis → Keyspace Notification __keyspace@0__:P1-center/objectdata lpush
3. RedisPubSubService → Subscribes and receives notification
4. TrackingHandler → processObjectData()
5. VehicleTracker → Update vehicle state
6. TrackingHandler → Callback with updates
7. WebSocketServer → Broadcast to 'tracking' channel
8. Dashboard Clients → Receive tracking_update message
```

### PassData Flow (Classification)

```
1. Radar Device → Redis LPUSH P1-center/passdata
2. Redis → Keyspace Notification
3. RedisPubSubService → Receives notification
4. RedisPubSubService → LRANGE to get latest PassData
5. ClassificationHandler → Callback
6. PassDataMongoDBService → savePassData() to MongoDB
7. ClassificationHandler → Query metrics from MongoDB
8. WebSocketServer → Broadcast classification_update
9. Dashboard Clients → Receive update
```

### Dashboard Summary Flow

```
1. Timer (every 1000ms)
2. DashboardHandler → getLatestDashboardData()
3. RedisStorage → getDashboardSummary()
4. Redis → MGET multiple keys
5. DashboardHandler → Callback with summary
6. WebSocketServer → Broadcast to device subscribers
7. Dashboard Clients → Receive dashboard_update
```

## Design Patterns

### 1. Singleton Pattern

**Used in**:
- `UnifiedWebSocketServer`
- `RedisPubSubService`
- `HealthCheckService`
- `HealthServer`

**Rationale**: Ensure single instance of critical services, prevent resource conflicts

### 2. Observer Pattern

**Used in**:
- Redis Pub/Sub subscriptions
- WebSocket message broadcasting
- Handler callbacks

**Rationale**: Decouple event producers from consumers, enable real-time updates

### 3. Dependency Injection

**Used in**:
- Handlers receive callback functions
- Services passed to constructors

**Rationale**: Improve testability, reduce coupling

### 4. Strategy Pattern

**Used in**:
- Message routing based on type
- Handler selection

**Rationale**: Flexible message handling, easy to extend

### 5. Factory Pattern

**Used in**:
- Logger creation (`createLogger`)
- Client connection management

**Rationale**: Centralize object creation, consistent initialization

## Technology Stack

### Runtime & Language

- **Node.js**: 18+ (async/await, native modules)
- **TypeScript**: 5.x (type safety, developer experience)

### Core Dependencies

- **ws**: WebSocket server implementation
- **redis**: Redis client with keyspace notification support
- **mongodb**: MongoDB native driver
- **winston**: Structured logging
- **zod**: Runtime type validation

### Development Tools

- **ts-node-dev**: Hot reload during development
- **jest**: Testing framework
- **eslint**: Code linting
- **prettier**: Code formatting

### Why TypeScript?

1. **Type Safety**: Catch errors at compile time
2. **IntelliSense**: Better IDE support
3. **Refactoring**: Safer code changes
4. **Documentation**: Types serve as inline docs

### Why WebSocket (ws)?

1. **Mature**: Battle-tested library
2. **Performance**: Low overhead
3. **Standards**: RFC 6455 compliant
4. **Compatibility**: Works with all browsers

### Why Winston?

1. **Structured Logging**: JSON format for production
2. **Multiple Transports**: File, console, remote
3. **Log Levels**: debug, info, warn, error
4. **Production Ready**: Log rotation, error handling

## Scalability

### Horizontal Scaling

**Current Limitations**:
- Singleton WebSocket server (not cluster-friendly)
- In-memory vehicle tracking state

**Solutions for Scaling**:

1. **Stateless Architecture**:
   - Move vehicle state to Redis
   - Use Redis Cluster for pub/sub

2. **Load Balancer with Sticky Sessions**:
   ```nginx
   upstream backends {
     ip_hash;  # Sticky sessions
     server backend1:8080;
     server backend2:8080;
   }
   ```

3. **Redis Pub/Sub for Cross-Server Communication**:
   - Server A receives update → Publish to Redis
   - Server B subscribes → Forwards to its clients

4. **Kubernetes Horizontal Pod Autoscaler**:
   ```yaml
   apiVersion: autoscaling/v2
   kind: HorizontalPodAutoscaler
   spec:
     minReplicas: 2
     maxReplicas: 10
     metrics:
     - type: Resource
       resource:
         name: cpu
         target:
           type: Utilization
           averageUtilization: 70
   ```

### Vertical Scaling

**Recommendations**:
- 2 CPU cores minimum
- 2GB RAM for moderate load (50 connections)
- 4GB RAM for high load (200+ connections)

### Performance Optimizations

1. **Connection Pooling**:
   - MongoDB: 10 max, 2 min
   - Redis: Single connection (pipelined)

2. **Message Batching**:
   - Group updates before broadcasting
   - Reduce network overhead

3. **Efficient Data Structures**:
   - Maps for O(1) lookups
   - Set for O(1) membership checks

## Security

### Authentication & Authorization

**Current State**: Open WebSocket connections

**Recommendations for Production**:
1. **Token-based auth**: JWT tokens in connection query params
2. **API Keys**: For server-to-server communication
3. **TLS/SSL**: HTTPS and WSS in production

### Rate Limiting

**Current Implementation**:
- 100 messages/minute per client
- Sliding window algorithm

**Future Enhancements**:
- IP-based rate limiting
- Tiered limits (free vs. premium)
- DDoS protection

### Input Validation

**Current Implementation**:
- Zod schema validation for all messages
- Type-safe message handling

**Security Features**:
- No SQL injection (parameterized queries)
- No XSS (server-side only)
- No command injection (no shell execution)

### Data Protection

**In Transit**:
- Use WSS (WebSocket Secure) in production
- TLS 1.3 for Redis and MongoDB connections

**At Rest**:
- MongoDB encryption at rest
- Redis protected mode
- Secure credential storage

### Monitoring

**Security Logging**:
- Failed connection attempts
- Rate limit violations
- Invalid message formats
- Unusual activity patterns

**Recommended Tools**:
- **Fail2Ban**: Auto-ban malicious IPs
- **WAF**: Web Application Firewall
- **IDS**: Intrusion Detection System

## Future Enhancements

### Short Term

1. **Authentication System**: JWT-based auth
2. **Message Compression**: Reduce bandwidth
3. **Better Error Recovery**: Exponential backoff
4. **Metrics Dashboard**: Grafana integration

### Long Term

1. **gRPC Support**: Alternative to WebSocket
2. **GraphQL Subscriptions**: Flexible queries
3. **Event Sourcing**: Full audit trail
4. **Machine Learning**: Predictive analytics
5. **Multi-Region**: Geographic distribution

## References

- [WebSocket RFC 6455](https://tools.ietf.org/html/rfc6455)
- [Redis Pub/Sub](https://redis.io/topics/pubsub)
- [MongoDB Aggregation](https://docs.mongodb.com/manual/aggregation/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
