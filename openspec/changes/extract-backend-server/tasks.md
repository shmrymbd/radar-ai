# Tasks: Extract Backend Server from Dashboard

## Phase 1: Setup Server Structure ✅ COMPLETE

- [x] **Create `/server` directory structure**
  - ✅ Created server/src/, server/tests/, server/docs/
  - ✅ Created subdirectories: websocket/, services/, config/, types/, utils/

- [x] **Initialize server package**
  - ✅ Created server/package.json with dependencies (ws, redis, mongodb, winston, zod)
  - ✅ Created server/tsconfig.json with path aliases
  - ✅ Created server/.env.example with all configuration
  - ✅ Created server/.gitignore
  - ✅ Created server/README.md with comprehensive documentation

- [x] **Setup build tooling**
  - ✅ Added build scripts (tsc, dev mode with ts-node-dev)
  - ✅ Added test scripts (Jest configuration)
  - ✅ Added linting (ESLint + TypeScript rules)

## Phase 2: Extract Configuration

- [ ] **Move environment configuration**
  - Create server/src/config/env.ts
  - Move Redis config to server/src/config/redis.ts
  - Move MongoDB config to server/src/config/mongodb.ts
  - Add validation using zod

- [ ] **Add logging infrastructure**
  - Create server/src/utils/logger.ts (Winston)
  - Configure log levels and formats
  - Add log rotation

## Phase 3: Extract Services

- [ ] **Move Redis services**
  - Copy redis.ts → server/src/config/redis.ts
  - Copy redis-storage.ts → server/src/services/redis/storage.ts
  - Copy redis-pubsub-service.ts → server/src/services/redis/pubsub.ts
  - Fix imports and test

- [ ] **Move MongoDB services**
  - Copy mongodb.ts → server/src/config/mongodb.ts
  - Copy passdata-mongodb-service.ts → server/src/services/mongodb/passdata.ts
  - Fix imports and test

- [ ] **Move tracking services**
  - Copy vehicle-tracker.ts → server/src/services/tracking/vehicle-tracker.ts
  - Copy vehicle-tracking-redis.ts → server/src/services/tracking/tracking-redis.ts
  - Fix imports and test

- [ ] **Move classification services**
  - Copy classification-processor.ts → server/src/services/classification/processor.ts
  - Fix imports and test

- [ ] **Move shared types**
  - Copy types/radar.ts → server/src/types/radar.ts
  - Copy types/tracking.ts → server/src/types/tracking.ts
  - Copy types/classification.ts → server/src/types/classification.ts

## Phase 4: Extract WebSocket Servers

- [ ] **Create WebSocket server structure**
  - Create server/src/websocket/server.ts (main server)
  - Create server/src/websocket/handlers/ directory
  - Create server/src/websocket/middleware/ directory

- [ ] **Move WebSocket handlers**
  - Copy unified-websocket-server.ts → server/src/websocket/server.ts
  - Extract tracking logic → server/src/websocket/handlers/tracking.ts
  - Extract classification logic → server/src/websocket/handlers/classification.ts
  - Refactor for clean separation

- [ ] **Add WebSocket middleware**
  - Create rate limiting middleware
  - Create error handling middleware
  - Create logging middleware

## Phase 5: Fix Imports and Build

- [ ] **Update import paths**
  - Fix all relative imports
  - Remove Next.js dependencies
  - Add path aliases (@/ for src/)

- [ ] **Fix circular dependencies**
  - Identify and break circular imports
  - Refactor if needed

- [ ] **Build and verify**
  - Run TypeScript compiler
  - Fix all compilation errors
  - Verify all files build correctly

## Phase 6: Add Health Checks

- [ ] **Create health check endpoint**
  - Add /health endpoint
  - Check Redis connection
  - Check MongoDB connection
  - Return service status

- [ ] **Add metrics endpoint** (optional)
  - Add /metrics endpoint (Prometheus format)
  - Track WebSocket connections
  - Track Redis operations
  - Track MongoDB queries

## Phase 7: Testing

- [ ] **Write unit tests**
  - Test vehicle tracker
  - Test classification processor
  - Test Redis services
  - Test MongoDB services

- [ ] **Write integration tests**
  - Test WebSocket server
  - Test Redis pub/sub
  - Test end-to-end message flow

- [ ] **Test server independently**
  - Run server standalone
  - Connect with WebSocket client
  - Verify all functionality

## Phase 8: Dashboard Integration

- [ ] **Update dashboard configuration**
  - Update WebSocket connection URL
  - Point to separate backend server
  - Add environment variable for backend URL

- [ ] **Test dashboard integration**
  - Start both server and dashboard
  - Verify WebSocket connections
  - Test all real-time features
  - Verify no regressions

- [ ] **Update dashboard package.json**
  - Remove backend dependencies
  - Keep only frontend dependencies

## Phase 9: Documentation

- [ ] **Write server documentation**
  - Create server/README.md (getting started)
  - Create server/docs/ARCHITECTURE.md
  - Create server/docs/API.md (WebSocket protocol)
  - Create server/docs/DEPLOYMENT.md

- [ ] **Update root README**
  - Document new architecture
  - Add instructions for running server
  - Update deployment section

- [ ] **Update OpenSpec specs**
  - Update dashboard spec
  - Add server infrastructure spec (new)
  - Update deployment documentation

## Phase 10: Deployment

- [ ] **Create Docker configuration**
  - Create server/Dockerfile
  - Update docker-compose.yml
  - Add production configuration

- [ ] **Create deployment scripts**
  - Add systemd service file (if applicable)
  - Add PM2 configuration
  - Document deployment process

- [ ] **Update CI/CD**
  - Add server build to CI pipeline
  - Add server tests to CI
  - Update deployment workflows

## Phase 11: Cleanup

- [ ] **Remove old backend files from dashboard**
  - Delete WebSocket server files
  - Delete moved service files
  - Keep only frontend utilities in lib/

- [ ] **Final verification**
  - Run all tests (dashboard + server)
  - Test deployment process
  - Verify production build

- [ ] **Archive old code** (optional)
  - Create git tag before cleanup
  - Document migration in CHANGELOG

## Validation Tasks

- [ ] **Performance testing**
  - Benchmark WebSocket throughput
  - Test with 50+ concurrent connections
  - Verify no performance regression

- [ ] **Load testing**
  - Test with realistic traffic
  - Monitor memory usage
  - Monitor CPU usage

- [ ] **Security review**
  - Review exposed endpoints
  - Check for credential leaks
  - Verify rate limiting works

## Success Criteria

- ✅ Server runs independently on port 8080
- ✅ All TypeScript compiles without errors
- ✅ All tests pass (unit + integration)
- ✅ Dashboard connects successfully
- ✅ All real-time features work
- ✅ Performance is equal or better
- ✅ No memory leaks over 24 hours
- ✅ Deployment documentation complete
- ✅ CI/CD pipeline updated
