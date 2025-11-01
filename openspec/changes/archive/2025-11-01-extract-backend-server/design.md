# Design: Extract Backend Server from Dashboard

## Current Architecture Analysis

### Current State

```
dashboard/src/lib/
├── websocket servers (3 files, ~1500 lines)
├── data processors (2 files, ~800 lines)
├── Redis services (5 files, ~1200 lines)
├── MongoDB services (3 files, ~900 lines)
├── shared utilities (30+ files)
└── frontend helpers
```

**Problems:**
- 40+ files in `/lib` with no clear separation
- Backend services import Next.js-specific packages
- Cannot run backend without Next.js
- Circular dependencies between services
- Deployment requires entire Next.js build

### Target Architecture

```
server/
├── src/
│   ├── index.ts                 # Entry point
│   ├── websocket/
│   │   ├── server.ts           # Main WebSocket server
│   │   ├── handlers/
│   │   │   ├── tracking.ts     # Tracking message handler
│   │   │   ├── classification.ts
│   │   │   └── control.ts
│   │   └── middleware/
│   │       ├── auth.ts         # Future: Authentication
│   │       └── rate-limit.ts   # Rate limiting
│   ├── services/
│   │   ├── redis/
│   │   │   ├── client.ts       # Redis connection
│   │   │   ├── pubsub.ts       # Pub/sub service
│   │   │   └── storage.ts      # Redis storage
│   │   ├── mongodb/
│   │   │   ├── client.ts       # MongoDB connection
│   │   │   └── services/
│   │   │       ├── passdata.ts
│   │   │       └── classification.ts
│   │   ├── tracking/
│   │   │   ├── vehicle-tracker.ts
│   │   │   └── tracking-redis.ts
│   │   └── classification/
│   │       └── processor.ts
│   ├── config/
│   │   ├── env.ts              # Environment config
│   │   ├── redis.ts            # Redis config
│   │   └── mongodb.ts          # MongoDB config
│   ├── types/
│   │   ├── radar.ts            # Radar data types
│   │   ├── tracking.ts         # Tracking types
│   │   └── classification.ts   # Classification types
│   └── utils/
│       └── logger.ts           # Structured logging
└── tests/
    ├── unit/
    └── integration/
```

## Design Decisions

### 1. Monorepo vs Separate Repos

**Decision: Monorepo** (keep `/server` and `/dashboard` in same repo)

**Reasoning:**
- ✅ Easier coordination during initial extraction
- ✅ Shared types can reference each other
- ✅ Single CI/CD pipeline
- ✅ Atomic commits across frontend and backend
- ❌ Future: Can split into separate repos if needed

### 2. Package Manager

**Decision: Continue with npm** (for now)

**Future:** Consider pnpm workspaces for better monorepo support

### 3. TypeScript Configuration

**Decision: Separate `tsconfig.json` for server**

**server/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 4. Dependency Management

**Server dependencies** (new):
- `ws` - WebSocket server
- `redis` - Redis client
- `mongodb` - MongoDB driver
- `dotenv` - Environment config
- `zod` - Runtime validation (new)
- `winston` - Structured logging (new)

**Removed from dashboard:**
- WebSocket server dependencies
- Direct Redis/MongoDB clients (API routes can still use them)

### 5. Environment Configuration

**server/.env.example:**
```bash
# Server
NODE_ENV=development
PORT=8080
LOG_LEVEL=info

# Redis
REDIS_HOST=192.168.6.22
REDIS_PORT=6379

# MongoDB
MONGODB_HOST=192.168.6.22
MONGODB_PORT=27017
MONGODB_USERNAME=admin
MONGODB_PASSWORD=admin123
MONGODB_AUTH_DATABASE=admin
MONGODB_DASHBOARD_DATABASE=traffic_signal_dashboard

# Radar
RADAR_PROTOCOL_VERSION=2.1
RADAR_DEVICE_ID=P1-center

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
```

### 6. WebSocket Protocol

**Decision: Keep existing protocol unchanged**

**Message format:**
```typescript
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'tracking_update' | 'classification_update';
  channel?: string;
  deviceId?: string;
  data?: any;
}
```

**Backward compatibility:** Dashboard clients continue working without changes

### 7. Logging Strategy

**Decision: Structured logging with Winston**

**Why:**
- JSON output for easy parsing
- Log levels (debug, info, warn, error)
- Separate log files for different concerns
- Production-ready

**Example:**
```typescript
import { logger } from './utils/logger';

logger.info('WebSocket server started', { port: 8080 });
logger.error('Redis connection failed', { error: err.message });
```

### 8. Error Handling

**Centralized error handling:**
```typescript
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
  }
}

// Usage
throw new AppError('Invalid device ID', 400);
```

### 9. Health Checks

**Add health check endpoints:**
```typescript
// GET /health
{
  status: 'healthy',
  services: {
    redis: 'connected',
    mongodb: 'connected',
    websocket: 'running'
  },
  uptime: 3600
}
```

### 10. Metrics (Future)

**Prometheus-compatible metrics endpoint:**
```typescript
// GET /metrics
websocket_connections_total 45
redis_operations_total 12345
mongodb_queries_total 6789
```

## Migration Strategy

### Phase 1: Setup (Day 1)

1. Create `/server` directory structure
2. Copy `package.json` template
3. Install dependencies
4. Create `tsconfig.json`
5. Setup build scripts

### Phase 2: Copy Services (Day 2-3)

1. Copy WebSocket servers to `/server/src/websocket/`
2. Copy Redis services to `/server/src/services/redis/`
3. Copy MongoDB services to `/server/src/services/mongodb/`
4. Copy tracking logic to `/server/src/services/tracking/`
5. Copy classification logic to `/server/src/services/classification/`
6. Copy shared types to `/server/src/types/`

### Phase 3: Fix Imports (Day 3-4)

1. Update all import paths
2. Remove Next.js dependencies
3. Fix circular dependencies
4. Add environment config
5. Build and verify TypeScript compilation

### Phase 4: Testing (Day 4-5)

1. Add unit tests for services
2. Add integration tests for WebSocket
3. Test Redis pub/sub independently
4. Test MongoDB writes independently
5. Verify all functionality works

### Phase 5: Dashboard Integration (Day 5-6)

1. Update dashboard to connect to separate backend
2. Test WebSocket connections
3. Test all dashboard features
4. Verify no regressions

### Phase 6: Deployment (Day 6-7)

1. Create Docker Compose for server
2. Update deployment documentation
3. Create systemd service (if applicable)
4. Update CI/CD pipeline
5. Deploy to staging and test

### Phase 7: Cleanup (Day 7)

1. Remove old backend files from dashboard
2. Update README
3. Archive old code
4. Final testing

## Rollback Plan

If extraction fails:
1. Keep old code in dashboard until new server is proven stable
2. Feature flag to switch between embedded and separate server
3. Can revert by updating WebSocket connection URL

## Performance Considerations

### Before (Embedded)

- Single process running Next.js + WebSocket server
- Shared memory for Next.js and backend
- Cannot scale independently

### After (Separated)

- **Backend**: Dedicated process, can run on optimized hardware
- **Frontend**: Next.js runs separately, can use CDN
- **Scaling**: Can run multiple backend instances behind load balancer
- **Memory**: Better isolation, easier to optimize

### Expected Improvements

- **Startup time**: Backend starts faster (no Next.js overhead)
- **Memory**: Better memory management (separate heaps)
- **CPU**: Can allocate CPU cores independently
- **Network**: Reduced internal traffic

## Security Considerations

### Current Risks (Embedded)

- Backend services exposed through Next.js
- No authentication on WebSocket (anyone can connect)
- Credentials in code (should be in environment)

### Improvements (Separated)

- ✅ Backend runs on internal network
- ✅ Can add authentication middleware
- ✅ Rate limiting per client
- ✅ Proper secret management
- ✅ Network isolation between frontend and backend

### Future Enhancements

1. **JWT Authentication**: Require token for WebSocket connections
2. **Rate Limiting**: Per-IP and per-user limits
3. **TLS/SSL**: Secure WebSocket (wss://)
4. **CORS**: Proper CORS configuration
5. **API Gateway**: Add Kong or Nginx in front

## Testing Strategy

### Unit Tests

```typescript
// Example: services/tracking/vehicle-tracker.test.ts
describe('VehicleTracker', () => {
  it('should track vehicle position', () => {
    const tracker = new VehicleTracker();
    tracker.processObjectData(mockData);
    expect(tracker.getVehicle('v1')).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// Example: websocket/server.integration.test.ts
describe('WebSocket Server', () => {
  it('should broadcast tracking updates', async () => {
    const client = new WebSocket('ws://localhost:8080');
    await waitForConnection(client);
    // Send subscribe message
    // Verify broadcast received
  });
});
```

### E2E Tests

- Dashboard connects to server
- Receives real-time updates
- All features work end-to-end

## Monitoring & Observability

### Logging

- Structured JSON logs
- Log rotation (daily)
- Log aggregation (e.g., ELK stack)

### Metrics

- WebSocket connection count
- Message throughput
- Redis operation latency
- MongoDB query performance

### Alerts

- WebSocket server down
- Redis connection lost
- MongoDB connection lost
- High error rate

## Documentation

### Developer Documentation

- `/server/README.md` - Getting started
- `/server/docs/ARCHITECTURE.md` - Architecture overview
- `/server/docs/API.md` - WebSocket API documentation
- `/server/docs/DEPLOYMENT.md` - Deployment guide

### API Documentation

- WebSocket message schemas
- Error codes
- Rate limits
- Authentication (future)

## Success Criteria

✅ Server runs independently
✅ All TypeScript compiles without errors
✅ All tests pass
✅ Dashboard connects successfully
✅ All real-time features work
✅ Performance is equal or better
✅ No memory leaks
✅ Deployment documentation complete
✅ Team can deploy independently
