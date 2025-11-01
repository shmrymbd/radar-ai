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

## Phase 2: Extract Configuration ✅ COMPLETE

- [x] **Move environment configuration**
  - ✅ Created server/src/config/env.ts with zod validation
  - ✅ Created server/src/config/redis.ts with singleton pattern + reconnection
  - ✅ Created server/src/config/mongodb.ts with connection pooling + retry logic
  - ✅ Added complete environment variable validation

- [x] **Add logging infrastructure**
  - ✅ Created server/src/utils/logger.ts with Winston
  - ✅ Configured log levels (error, warn, info, debug)
  - ✅ Added console format for development, JSON for production
  - ✅ Added daily log rotation for production

## Phase 3: Extract Services ✅ COMPLETE

- [x] **Move Redis services**
  - ✅ redis.ts → server/src/config/redis.ts (completed in Phase 2)
  - ✅ redis-storage.ts → server/src/services/redis/storage.ts
  - ✅ redis-pubsub-service.ts → server/src/services/redis/pubsub.ts
  - ✅ Fixed imports and replaced console.log with Winston logger

- [x] **Move MongoDB services**
  - ✅ mongodb.ts → server/src/config/mongodb.ts (completed in Phase 2)
  - ✅ passdata-mongodb-service.ts → server/src/services/mongodb/passdata.ts
  - ✅ Fixed imports and replaced console.log with Winston logger

- [x] **Move tracking services**
  - ✅ vehicle-tracker.ts → server/src/services/tracking/vehicle-tracker.ts
  - ✅ vehicle-tracking-redis.ts → server/src/services/tracking/tracking-redis.ts
  - ✅ Fixed imports and replaced console.log with Winston logger

- [x] **Move classification services**
  - ✅ Skipped - classification-processor.ts is deprecated (replaced by MongoDB queries)
  - ✅ Classification functionality handled by PassDataMongoDBService

- [x] **Move shared types**
  - ✅ types/radar.ts → server/src/types/radar.ts (including Processed* types)
  - ✅ types/tracking.ts → server/src/types/tracking.ts
  - ✅ types/classification.ts → server/src/types/classification.ts

## Phase 4: Extract WebSocket Servers ✅ COMPLETE

- [x] **Create WebSocket server structure**
  - ✅ server/src/websocket/server.ts (main server with clean architecture)
  - ✅ server/src/websocket/handlers/ directory
  - ✅ server/src/websocket/middleware/ directory
  - ✅ server/src/index.ts (server entry point)

- [x] **Move WebSocket handlers**
  - ✅ unified-websocket-server.ts → server/src/websocket/server.ts (refactored)
  - ✅ Extracted tracking logic → server/src/websocket/handlers/tracking.ts
  - ✅ Extracted classification logic → server/src/websocket/handlers/classification.ts
  - ✅ Extracted dashboard logic → server/src/websocket/handlers/dashboard.ts
  - ✅ Clean separation with dependency injection and callbacks

- [x] **Add WebSocket middleware**
  - ✅ Rate limiting middleware (100 messages/minute per client)
  - ✅ Error handling middleware (centralized error responses)
  - ✅ Message validation with Zod schemas (server/src/websocket/message-schemas.ts)
  - ✅ Logging integrated via Winston in all components

## Phase 5: Fix Imports and Build ✅ COMPLETE

- [x] **Update import paths**
  - ✅ Fixed all relative imports
  - ✅ Removed Next.js dependencies
  - ✅ Path aliases configured (@/ for src/)

- [x] **Fix circular dependencies**
  - ✅ No circular dependencies found
  - ✅ All imports verified

- [x] **Build and verify**
  - ✅ Ran TypeScript compiler
  - ✅ Fixed Redis client type inference issue
  - ✅ All files build correctly (0 errors)

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
