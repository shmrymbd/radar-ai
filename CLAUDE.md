# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start for New Claude Instances

**What is this?** Traffic signal control dashboard processing ClairWav-T80 radar data for traffic optimization.

**First steps:**
1. Create `dashboard/.env.local` with required environment variables (see Environment Setup below)
2. Run `openspec list --specs` to see what's built
3. Check active changes: `openspec list`
4. For new features, create OpenSpec proposal BEFORE coding
5. Verify environment: Check Redis and MongoDB connections before starting work

**Key patterns to understand:**
- Multi-device architecture: ALL data scoped by `deviceId`
- Redis connection: ONLY via `getRedisClient()` from `src/lib/redis.ts`
- Device switching: Use DeviceContext + DeviceSyncService
- Hydration safety: Never use `Math.random()` or `localStorage` during initial render
- OpenSpec workflow: Proposal → Implementation → Archive

## Critical Environment Setup

Create `dashboard/.env.local` with:
```bash
# Redis Configuration
REDIS_HOST=192.168.6.22
REDIS_PORT=6379

# MongoDB Configuration
MONGODB_HOST=192.168.6.22
MONGODB_PORT=27017
MONGODB_USERNAME=admin
MONGODB_PASSWORD=admin123
MONGODB_AUTH_DATABASE=admin
MONGODB_DASHBOARD_DATABASE=traffic_signal_dashboard

# Radar Configuration
RADAR_PROTOCOL_VERSION=2.1
RADAR_DEVICE_ID=P1-center       # Default device ID

# Dashboard Configuration
DASHBOARD_REFRESH_INTERVAL=1000  # Milliseconds
QUEUE_THRESHOLD=50
SPEED_LIMIT=60
LANES=11,12,13,485            # Valid lane numbers

# Development Settings
DISABLE_RATE_LIMITING=true     # Set to 'true' to disable rate limiting in development
```

**Note:** `REDIS_KEY_PREFIX` is deprecated and no longer needed (removed 2025-10-28). Device-specific keys use format `{deviceId}/passdata` directly.

## Essential Commands

### Development
```bash
cd dashboard
npm run dev:full         # Start Next.js + WebSocket (recommended)
npm run dev             # Start Next.js dev server (port 3000)
npm run websocket       # Start unified WebSocket server only (8080)
npm run lint           # Run ESLint checks
npm run build          # Test production build locally
```

### Database Management
```bash
npm run db:indexes     # Create/update MongoDB indexes for optimal performance
```

### Testing & Verification
```bash
# Quick Tests
redis-cli -h 192.168.1.71 -p 6379 ping     # Verify Redis connectivity
curl "http://localhost:3000/api/simple-redis?device=P1-center"  # Test API

# Data Verification
node dashboard/verify-data-sources.js       # Verify Redis and MongoDB data
node dashboard/check-mongodb-latest.js      # Check latest MongoDB entries
```

## MongoDB-First Architecture

As of 2025-10-27, the classification system uses a **MongoDB-first architecture** with NO in-memory caching or polling:

- MongoDB is the single source of truth
- Direct MongoDB queries with aggregation pipelines
- NO Redis polling or in-memory caching
- ClassificationProcessor is now a minimal shell (187 lines)
- Data flow: Redis → PassDataSubscriber → MongoDB → API Routes

**PassData Timestamp Change (2025-10-28)**: MongoDB now stores **frame processing timestamps** (`passData.timestamp`) instead of vehicle passing times (`entry.passing.time`) for real-time appearance in the dashboard. This reduces displayed timestamp delays from 4+ minutes to seconds. See `dashboard/PASSDATA_TIMESTAMP_CHANGE.md` for full details.

**Breaking Changes:**
- All ClassificationProcessor instance methods are deprecated
- NO Redis polling or in-memory Maps
- API routes query MongoDB directly
- Historical data accessed via MongoDB time-range queries

## Redis Key Patterns

**Critical:** All Redis keys MUST use lowercase and proper device IDs:

✅ Correct patterns:
- `P1-center/passdata`
- `P3/passdata`
- `P1-o/h/passdata`

❌ Wrong patterns:
- `P1-center/PassData` (uppercase)
- `test/passdata` (invalid device)
- `P1-center/pass-data` (wrong format)

Valid device IDs:
- `P1-center` (primary, most active)
- `P3` (secondary)
- `P1-o/h` (overhead position)

## Critical Implementation Rules

### Redis Connection
- ALWAYS use `getRedisClient()` from `src/lib/redis.ts`
- NEVER create direct Redis clients in API routes
- Connection includes retry logic (3 attempts with exponential backoff)
- Handle connection errors gracefully with fallback data

### Redis Pub/Sub and Keyspace Notifications
**CRITICAL:** The radar system uses LPUSH/RPUSH operations which trigger Redis keyspace notifications (NOT explicit PUBLISH).

**Implementation Pattern:**
```typescript
// CORRECT - Keyspace notifications
await subscriber.pSubscribe(`__keyspace@0__:${deviceId}/passdata`, async (message, channel) => {
  if (message === 'lpush' || message === 'rpush') {
    const redis = await getRedisClient();
    const latestData = await redis.lRange(`${deviceId}/passdata`, -1, -1);
    // Process data...
  }
});
```

### Multi-Device Data Isolation
- ALWAYS scope data by `deviceId` parameter
- Redis keys are device-specific: `P1-center/objectdata`, `P3/passdata`, etc. (ALWAYS lowercase)
- MongoDB queries MUST filter by `deviceId` field
- NEVER hardcode device IDs in Redis key access - always use template strings with `${deviceId}`

### Next.js/React
- NEVER use Math.random()/Date.now() during initial render
- Use isClient pattern for client-side operations:
```typescript
const [isClient, setIsClient] = useState(false);
useEffect(() => { setIsClient(true); }, []);
// Only access localStorage/random values when isClient === true
```

### React Performance Patterns
- **Wrap data fetching in `useCallback`** to prevent recreation on every render
- **Add debouncing** to prevent excessive API calls (minimum 2 seconds for real-time updates)
- **Include all dependencies** in useEffect dependency arrays to prevent stale closures
- **Use refs for timing checks** (`useRef<number>`) to track last fetch times without triggering re-renders
- Example from ClassificationDashboard.tsx:
```typescript
const lastFetchTimeRef = useRef<number>(0);
const FETCH_DEBOUNCE_MS = 2000;

const fetchData = useCallback(async () => {
  const now = Date.now();
  if (now - lastFetchTimeRef.current < FETCH_DEBOUNCE_MS) {
    return; // Skip if called too soon
  }
  lastFetchTimeRef.current = now;
  // ... fetch logic
}, [dependencies]);
```

## Common Gotchas

1. **IP Addresses**: Redis/MongoDB are at 192.168.1.71 (updated 2025-10-28)
2. **Redis key case sensitivity** (must be lowercase)
3. **Device selection** requires full WebSocket reconnect
4. **ClassificationProcessor methods** are deprecated
5. **WebSocket port conflicts** (3000 vs 8080)
6. **MongoDB database name** is traffic_signal_dashboard
7. **Never hardcode device IDs** in Redis key access
8. **Hydration mismatches** with localStorage/random
9. **~~REDIS_KEY_PREFIX~~**: DEPRECATED - removed 2025-10-28, not needed
10. **Lane Configuration**: Default lanes are 11,12,13,485 (from LANES env var)
11. **Rate Limiting**: Disabled by default in development (DISABLE_RATE_LIMITING=true)
12. **Dynamic ports**: API routes use dynamic port detection, never hardcode localhost:3000
13. **Classification tab refresh**: Use `useCallback` + debouncing (2s minimum) to prevent excessive API calls (fixed 2025-10-28)

## OpenSpec Changes

When introducing:
1. New features/capabilities
2. Breaking changes
3. Architecture shifts
4. Performance/security work

Follow:
1. Check existing: `openspec list --specs`
2. Create proposal with:
   - proposal.md (why/what)
   - tasks.md (checklist)
   - design.md (if complex)
   - spec deltas
3. Validate: `openspec validate --strict`
4. Implement after approval
5. Archive when deployed

Skip proposal for bug fixes and non-breaking changes.

## Security Notes

1. API Authentication:
   - Required in production via x-api-key header
   - Rate limited: 100/min general, 10/min export

2. Database Security:
   - MongoDB: Connection pooling + retry logic
   - Redis: Singleton pattern + reconnection
   - Always use HTTPS in production
- redis and mongodb ip change to 192.168.1.71