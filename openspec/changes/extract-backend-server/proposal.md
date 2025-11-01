# Extract Backend Server from Dashboard

**Change ID**: `extract-backend-server`
**Date**: November 1, 2025
**Status**: Proposed
**Priority**: High

## Why

The current architecture embeds WebSocket servers, Redis services, and data processing logic inside the Next.js `dashboard/` folder. This creates several problems:

1. **Architectural Confusion**: Backend services (WebSocket servers, Redis pub/sub, data processors) are mixed with frontend code
2. **Deployment Complexity**: Cannot deploy backend services independently from the Next.js frontend
3. **Scalability Issues**: Cannot scale WebSocket servers separately from the web dashboard
4. **Development Overhead**: Backend changes require full Next.js rebuild
5. **Testing Difficulty**: Backend logic is tightly coupled to Next.js runtime
6. **Code Organization**: `dashboard/src/lib/` contains 40+ files mixing frontend utilities with backend services

### Current Problems

**Files that should be backend services:**
- `unified-websocket-server.ts` - WebSocket server for real-time updates
- `tracking-websocket-server.ts` - Vehicle tracking WebSocket
- `classification-websocket-server.ts` - Classification WebSocket
- `redis-pubsub-service.ts` - Redis pub/sub handling
- `passdata-subscriber.ts` - PassData MongoDB writer
- `vehicle-tracker.ts` - Vehicle tracking logic
- `classification-processor.ts` - Classification processing

**Current directory structure:**
```
radar-ai/
└── dashboard/           # Next.js app
    └── src/
        ├── app/        # Next.js pages
        ├── components/ # React components
        └── lib/        # ❌ MIXED: Frontend utils + Backend services
```

## What Changes

**Extract backend services into a dedicated `/server` directory with proper TypeScript structure and independent deployment.**

### New Architecture

```
radar-ai/
├── server/              # ✨ NEW: Standalone backend
│   ├── src/
│   │   ├── websocket/
│   │   │   ├── unified-server.ts
│   │   │   ├── tracking-handler.ts
│   │   │   └── classification-handler.ts
│   │   ├── services/
│   │   │   ├── redis-pubsub.ts
│   │   │   ├── vehicle-tracker.ts
│   │   │   ├── classification-processor.ts
│   │   │   └── passdata-subscriber.ts
│   │   ├── config/
│   │   │   ├── redis.ts
│   │   │   ├── mongodb.ts
│   │   │   └── env.ts
│   │   ├── types/
│   │   │   └── (shared types)
│   │   └── index.ts
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── dashboard/           # Next.js frontend only
    ├── src/
    │   ├── app/
    │   ├── components/
    │   └── lib/         # ✅ Frontend utilities only
    └── package.json
```

### Key Changes

1. **Create `/server` Directory**
   - Independent Node.js/TypeScript project
   - Own `package.json`, `tsconfig.json`, and dependencies
   - Can be deployed separately to different infrastructure

2. **Move Backend Services**
   - WebSocket servers → `/server/src/websocket/`
   - Redis/MongoDB services → `/server/src/services/`
   - Configuration → `/server/src/config/`
   - Shared types → `/server/src/types/`

3. **Keep Frontend Clean**
   - Dashboard only contains Next.js pages, components, and frontend utilities
   - Communicates with backend via WebSocket and REST APIs
   - No direct Redis/MongoDB access from frontend

4. **Shared Types Package** (Future)
   - Common types can be extracted to `@radar-ai/types` package
   - Shared between server and dashboard
   - Versioned independently

## Modified Files

**New files:**
- `server/package.json`
- `server/tsconfig.json`
- `server/src/index.ts`
- `server/src/websocket/*`
- `server/src/services/*`
- `server/src/config/*`
- `server/.env.example`
- `server/README.md`

**Moved files** (from `dashboard/src/lib/` to `server/src/`):
- `unified-websocket-server.ts` → `websocket/unified-server.ts`
- `tracking-websocket-server.ts` → `websocket/tracking-handler.ts`
- `classification-websocket-server.ts` → `websocket/classification-handler.ts`
- `redis-pubsub-service.ts` → `services/redis-pubsub.ts`
- `vehicle-tracker.ts` → `services/vehicle-tracker.ts`
- `classification-processor.ts` → `services/classification-processor.ts`
- `passdata-subscriber.ts` → `services/passdata-subscriber.ts`
- `redis.ts` → `config/redis.ts`
- `mongodb.ts` → `config/mongodb.ts`

**Updated files:**
- `dashboard/package.json` - Remove backend dependencies
- `dashboard/src/lib/` - Remove backend service files
- Root `README.md` - Update architecture documentation

## Impact

- **Affected Specs**: `dashboard`, `live-tracking`, `radar-processing`
- **Affected Code**: Backend services, WebSocket servers, configuration
- **User Impact**: No visible changes (internal restructure only)
- **Breaking Changes**: None (maintains same WebSocket protocol and APIs)
- **Deployment**: Requires updating deployment scripts to run `/server` separately

## Benefits

1. **Clear Separation of Concerns**: Frontend and backend are distinct projects
2. **Independent Deployment**: Can deploy backend and frontend separately
3. **Better Scalability**: Can scale WebSocket servers independently
4. **Faster Development**: Backend changes don't require Next.js rebuild
5. **Easier Testing**: Backend services can be tested in isolation
6. **Better Code Organization**: Clear directory structure for backend vs frontend
7. **Future-Proof**: Easier to add more backend services or microservices

## Migration Path

1. **Phase 1**: Create `/server` structure with copied files
2. **Phase 2**: Update imports and fix TypeScript errors
3. **Phase 3**: Test backend server independently
4. **Phase 4**: Update dashboard to connect to separate backend
5. **Phase 5**: Remove old backend files from dashboard
6. **Phase 6**: Update deployment documentation and scripts
