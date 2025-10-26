<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start for New Claude Instances

**What is this?** Traffic signal control dashboard processing ClairWav-T80 radar data for traffic optimization.

**First steps:**
1. Read this file completely (especially Critical Implementation Rules and Common Gotchas)
2. Check `openspec/project.md` for conventions
3. Run `openspec list --specs` to see what's built
4. Check active changes: `openspec list`
5. For new features, create OpenSpec proposal BEFORE coding

**Key patterns to understand:**
- Multi-device architecture: ALL data scoped by `deviceId`
- Redis connection: ONLY via `getRedisClient()` from `src/lib/redis.ts`
- Device switching: Use DeviceContext + DeviceSyncService
- Hydration safety: Never use `Math.random()` or `localStorage` during initial render
- OpenSpec workflow: Proposal → Implementation → Archive (see section below)

## Project Overview

This is a **traffic signal control dashboard** for traffic engineers using ClairWav-T80 radar systems. It processes real-time radar data to optimize traffic light timing, monitor queue lengths, classify vehicles, and provide video surveillance capabilities.

**Tech Stack:**
- Next.js 15.1.8 (App Router + Server Components) - latest stable version
- TypeScript 5.x (strict mode)
- React 19.2.0 - latest stable version
- Node.js 18+ with @types/node ^24 - latest type definitions
- Redis 5.9.0 (192.168.6.22:6379) - primary data source
- MongoDB 6.20.0 (192.168.6.22:27017) - historical data storage
- WebSocket (ws ^8.18.3) - real-time updates via unified server
- Tailwind CSS v4 - latest styling framework
- FFmpeg - HLS video streaming with 1-second latency
- HLS.js ^1.6.13 - client-side video streaming

## Essential Commands

### Development
```bash
cd dashboard
npm run dev              # Start Next.js dev server (port 3000)
npm run dev:full         # Start dev + unified WebSocket server
npm run websocket        # Start unified WebSocket server only (all real-time data)
npm run lint             # Run ESLint checks
```

### Build & Deployment
```bash
npm run build           # Production build
npm run start           # Production server
npm run lint            # ESLint check
```

### Video Streaming
```bash
./start-1sec-latency.sh           # Start FFmpeg with 1-second latency
./start-live-streams.sh           # Start HLS streaming
./stop-live-streams.sh            # Stop all streams
./start-video-streaming.sh        # Start complete video streaming service
./test-video-service.sh           # Test video service functionality
```

### Testing Classification
```bash
node test-classification.js       # Test vehicle classification
node test-mongodb.js              # Test MongoDB connection
```

## System Architecture

### Data Flow: Radar → Redis → Next.js API → WebSocket → React UI

1. **ClairWav-T80 Radar** streams 5 packet types to Redis:
   - `0x01` Object Data - individual vehicle tracking (65 bytes/vehicle)
   - `0x04` Lane Status - queue/occupancy metrics (32 bytes/lane)
   - `0x05` Pass Data - vehicle crossing events for classification (23 bytes/event)
   - `0x03` Traffic Data - statistical analysis (50 bytes/entry)
   - `0x02` Region Data - turn movement percentages (12 bytes/region)

2. **Redis Keys Pattern**: `Radar04/ObjectData`, `Radar04/LaneStatus`, `Radar04/PassData`, etc.
   - IMPORTANT: All Redis access goes through `dashboard/src/lib/redis.ts` which handles connection pooling and reconnection

3. **Next.js API Routes** query Redis and process data:
   - `/api/dashboard` - main dashboard metrics with device-specific data
   - `/api/lanes` - lane-specific data and performance metrics
   - `/api/classification/*` - comprehensive vehicle classification analytics
     - `/api/classification` - main classification data with filtering
     - `/api/classification/summary` - summary statistics
     - `/api/classification/metrics` - real-time metrics
     - `/api/classification/cache` - cache management
     - `/api/classification/poller` - Redis poller control
     - `/api/classification/monitoring` - performance monitoring
     - `/api/classification/enhanced-metrics` - advanced analytics
     - `/api/classification/auto-process` - automated processing
   - `/api/video/*` - video streaming and camera management
     - `/api/video/streams` - HLS stream management
     - `/api/video/cameras` - camera configuration
     - `/api/video/recordings` - video recording management
   - `/api/tracking/*` - vehicle tracking and movement data
     - `/api/tracking` - main tracking data
     - `/api/tracking/vehicles` - individual vehicle tracking
   - `/api/real-passdata` - raw PassData access
   - `/api/simple-redis` - Redis connectivity testing

4. **Unified WebSocket Server** pushes real-time updates:
   - `unified-websocket-server.ts` - all real-time data (traffic, tracking, classification) on port 8080
   - Single WebSocket connection for all real-time data streams
   - Device-aware message routing with automatic reconnection
   - Channel-based subscriptions (dashboard, tracking, classification)
   - Connection pooling and state management
   - Legacy classification polling still available via API endpoints

5. **Multi-Device Support**: All data processing is device-scoped (e.g., `deviceId: 'test'`, `'Radar04'`)
   - DeviceContext (`src/contexts/DeviceContext.tsx`) manages device selection via React Context
   - DeviceSyncService (`src/lib/device-sync-service.ts`) coordinates device switching across systems
   - All components and APIs accept `deviceId` parameter
   - Device preferences saved to localStorage for persistence

### Key Architectural Patterns

#### Singleton Pattern for Classification Processing
`ClassificationProcessor.getInstance()` in `src/lib/classification-processor.ts` maintains a single instance with:
- In-memory data maps organized by `deviceId`
- 15-minute aggregation timer for MongoDB storage
- Real-time metrics calculation from PassData (0x05)
- Enhanced vehicle type mapping with VEHICLE_TYPE_MAP
- Performance monitoring and rate limiting
- Cache management with TTL-based cleanup
- Automated processing with Redis polling

#### Data Aggregation Strategy
- **Real-time**: In-memory Map structures per device with Redis caching
- **15-minute intervals**: Automatic aggregation to MongoDB via `ClassificationHistoryStorage`
- **Historical queries**: MongoDB time-range queries with device filtering
- **Performance optimization**: Redis-based caching with configurable TTL
- **Data export**: Multiple format support (JSON, CSV) with filtering capabilities

#### WebSocket Connection Management
- Automatic reconnection on disconnect
- Device-specific subscription patterns
- Connection pooling and state management in contexts

## Critical Implementation Rules

### Redis Connection
- ALWAYS use `getRedisClient()` from `src/lib/redis.ts`
- NEVER create direct Redis clients in API routes
- Connection includes retry logic (max 3 attempts with exponential backoff)
- Handle connection errors gracefully with fallback data

### Vehicle Classification
- PassData (0x05) is the source of truth for classification
- `ProcessedPassData` type has these critical fields:
  - `vehicleType` (string, not number) - mapped from radar codes
  - `crossSectionSpeed`, `headwayTime`, `occupancyDuration`
  - `laneNumber`, `crossSectionPosition`, `occupancyStatus`
- Classification processor MUST be device-aware (always pass `deviceId`)
- Use `VEHICLE_TYPE_MAP` from `src/types/classification.ts` for mapping

### Multi-Device Data Isolation
- ALWAYS scope data by `deviceId` parameter
- Redis keys are device-specific: `Radar04/ObjectData`, `test/PassData`, etc.
- MongoDB queries MUST filter by `deviceId` field
- In-memory maps use device as primary key: `Map<deviceId, Map<dataKey, value>>`

**Default Devices** (from `src/types/device.ts`):
- `test` - Simulated radar data for testing (default device)
- `Radar04` - Production radar system at 192.168.6.22
- Device configuration can be extended via environment variables or localStorage
- Each device has its own `redisPrefix` for Redis key namespacing

### Lane Numbers
Standard lanes are 11, 12, 13; Lane 485 exists but configuration is unknown.
Use `LANE_CONFIG` from `src/types/radar.ts` for display names.

### TypeScript Strictness
- NO `any` types without explicit comment justification
- All radar data structures defined in `src/types/radar.ts`
- Enforce null checks for Redis/MongoDB responses

### Styling Conventions
- **Tailwind CSS v4** for all styling (configured in `tailwind.config.ts`)
- Global styles in `src/app/globals.css` using `@import "tailwindcss"`
- Custom classes use Tailwind utility composition
- Responsive design with mobile-first breakpoints
- Color scheme: Gray backgrounds, blue accents, green for status indicators
- Tab navigation uses custom `.tab-button` classes from globals.css

## Data Processing Patterns

### Processing PassData for Classification
```typescript
// CORRECT pattern - from classification-processor.ts
public processPassDataForClassification(data: ProcessedPassData, deviceId: string = 'test'): void {
  const vehicleType = data.vehicleType; // Already a string
  const timestamp = data.timestamp;

  // Update device-scoped data
  this.updateClassificationData(vehicleType, data, deviceId);
  this.updateTimeBasedData(vehicleType, data, timestamp, deviceId);
  this.updateHourlyAnalysis(vehicleType, data, hour, deviceId);
}
```

### Querying Historical Data
```typescript
// MongoDB queries MUST include deviceId filter
const historicalData = await historyStorage.getHistoricalData(deviceId, {
  startTime: new Date('2025-01-01'),
  endTime: new Date('2025-01-31')
});
```

### API Route Pattern
```typescript
// CORRECT: Always get device from query params
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId') || 'test';

  const redis = await getRedisClient();
  const data = await redis.get(`${deviceId}/ObjectData`);
  // ... process and return
}
```

## Video Streaming Architecture

- **RTSP Input** → **FFmpeg** → **HLS segments** → **Next.js API** → **hls.js player**
- HLS output: `dashboard/hls-output/camera{id}/stream.m3u8`
- API endpoints: 
  - `/api/video/streams` - HLS stream management and control
  - `/api/video/cameras` - Camera configuration and settings
  - `/api/video/recordings` - Video recording management
  - `/api/video/hls/[...path]` - Serves .m3u8 and .ts files
- 1-second latency achieved via FFmpeg tuning in `start-1sec-latency.sh`
- Multi-camera support with grid layout and individual controls
- Camera settings management with RTSP URL configuration
- Video recording capabilities with playback interface

## Testing & Debugging

### Classification System
- Test data generators: `dashboard/test-classification.js`, `dashboard/generate-test-data.js`
- Use `/api/classification/generate-test-data` to seed with synthetic PassData
- Debug endpoint: `/api/debug-classification` returns raw in-memory state

### MongoDB Verification
```bash
node dashboard/test-mongodb.js  # Verify collections and data
```

### Redis Verification
```bash
redis-cli -h 192.168.6.22 -p 6379 ping  # Should return PONG
redis-cli -h 192.168.6.22 -p 6379 keys "Radar04/*"  # List keys
```

## Common Gotchas

1. **PassData vehicle type mapping**: Raw packets have numeric codes; always convert to strings via `VEHICLE_TYPE_MAP`

2. **Device selection sync**: When device changes in UI, ALL WebSocket connections and API calls must update
   - Use `DeviceSyncService.getInstance().syncDevice(deviceId)` for coordinated switching
   - Service validates backend and WebSocket connectivity before completing switch

3. **15-minute aggregation timer**: Runs on server startup; ensure MongoDB connection is stable or timer will log errors

4. **Lane 485**: Present in data but configuration unknown; handle gracefully in UI

5. **FFmpeg process management**: Use provided scripts; manual FFmpeg commands may not achieve 1-second latency

6. **WebSocket port conflicts**: Dev mode runs 2 processes (Next.js:3000, Unified WebSocket:8080)

7. **Hydration mismatches**: CRITICAL issue with Next.js 15 SSR
   - NEVER use `Math.random()`, `Date.now()`, or `localStorage` during initial render
   - Use `isClient` state flag pattern from DeviceContext:
     ```typescript
     const [isClient, setIsClient] = useState(false);
     useEffect(() => { setIsClient(true); }, []);
     // Only access localStorage/random values when isClient === true
     ```
   - Wrap client-only components in `ClientOnlyTimeDisplay` pattern
   - Use `useEffect` to defer client-side operations until after hydration

8. **MongoDB database naming**: Database is `traffic_signal_dashboard`, NOT `traffic_analysis` (both exist on server)

## Key Files Reference

### Core Infrastructure
- `dashboard/src/lib/redis.ts` - Redis singleton connection with retry logic
- `dashboard/src/lib/mongodb.ts` - MongoDB connection using env variables
- `dashboard/src/contexts/DeviceContext.tsx` - Global device state management
- `dashboard/src/lib/device-sync-service.ts` - Device switching coordination

### Data Processing
- `dashboard/src/lib/classification-processor.ts` - Singleton classification engine
- `dashboard/src/lib/classification-history-storage.ts` - MongoDB persistence layer
- `dashboard/src/lib/radar-processor.ts` - Radar data parsing and validation
- `dashboard/src/lib/vehicle-tracker.ts` - Individual vehicle tracking logic

### WebSocket Server
- `dashboard/src/lib/unified-websocket-server.ts` - Unified real-time data server (port 8080)
  - Handles all WebSocket connections for traffic, tracking, and classification
  - Device-aware message routing and subscription management
  - Channel-based subscriptions (dashboard, tracking, classification)
  - Automatic reconnection and connection pooling
  - Client subscription management with device-specific filtering
  - Real-time data broadcasting with TTL-based caching
  - Performance monitoring and connection statistics

### UI Components
- `dashboard/src/app/page.tsx` - Main dashboard with tab navigation
- `dashboard/src/components/DashboardLayout.tsx` - Header + navigation wrapper with device selector
- `dashboard/src/components/DashboardOverview.tsx` - Real-time dashboard metrics and alerts
- `dashboard/src/components/LiveTracking.tsx` - Interactive vehicle tracking visualization with heat maps
- `dashboard/src/components/DeviceSelector.tsx` - Device switching dropdown with sync service
- `dashboard/src/components/HistoricalCharts.tsx` - Time-based analytics and trend visualization
- `dashboard/src/components/VideoStreamingGrid.tsx` - Multi-camera video streaming interface
- `dashboard/src/components/CameraSettings.tsx` - Camera configuration and management
- `dashboard/src/components/VideoRecordings.tsx` - Video recording playback and management
- `dashboard/src/app/classification/page.tsx` - Comprehensive vehicle classification dashboard
- `dashboard/src/app/video-streaming/page.tsx` - Full-featured video streaming interface

### Type Definitions
- `dashboard/src/types/radar.ts` - All radar packet structures (0x01-0x05)
- `dashboard/src/types/device.ts` - Device and camera configurations
- `dashboard/src/types/classification.ts` - Vehicle classification types
- `dashboard/src/types/tracking.ts` - Vehicle tracking types

## Component Architecture

### Client vs Server Components

This project uses Next.js 15 App Router with a clear client/server boundary:

**Client Components** (`'use client'` directive):
- `src/app/page.tsx` - Main dashboard with tab navigation
- `src/app/classification/page.tsx` - Vehicle classification dashboard
- `src/app/video-streaming/page.tsx` - Video streaming interface
- `src/components/DashboardLayout.tsx` - Layout wrapper with navigation
- `src/components/DashboardOverview.tsx` - Real-time dashboard with WebSocket integration
- `src/components/LiveTracking.tsx` - Interactive vehicle tracking with heat maps
- `src/components/DeviceSelector.tsx` - Device switching UI with sync service
- `src/components/HistoricalCharts.tsx` - Time-based analytics visualization
- `src/components/VideoStreamingGrid.tsx` - Multi-camera video streaming
- `src/components/CameraSettings.tsx` - Camera configuration interface
- `src/components/VideoRecordings.tsx` - Video recording management
- `src/contexts/DeviceContext.tsx` - Global device state management
- `src/hooks/useUnifiedWebSocket.tsx` - WebSocket connection management

**Server Components** (default):
- API routes in `src/app/api/**` - Redis/MongoDB queries
- No client components in API routes

**Key Pattern**: Use `useDevice()` hook to access device context in client components:
```typescript
import { useDevice } from '@/contexts/DeviceContext';

export default function MyComponent() {
  const { selectedDevice, switchDevice } = useDevice();
  // selectedDevice.id is the current device ID to use in API calls
}
```

### Navigation Structure

Main dashboard uses tab-based navigation (`src/app/page.tsx`):
- **Overview** - Real-time metrics and alerts
- **Live Tracking** - Individual vehicle tracking map
- **Classification** - Links to `/classification` route
- **Video Streaming** - Links to `/video-streaming` route
- **Analytics** - Placeholder for future features
- **Settings** - Placeholder for configuration

Separate full-page routes:
- `/classification` - Full vehicle classification dashboard
- `/video-streaming` - Video management and streaming

## Environment Variables

Required in `dashboard/.env.local`:
```env
# Redis Configuration
REDIS_HOST=192.168.6.22
REDIS_PORT=6379
REDIS_KEY_PREFIX=Radar04

# MongoDB Configuration
MONGODB_HOST=192.168.6.22
MONGODB_PORT=27017
MONGODB_USERNAME=admin
MONGODB_PASSWORD=admin123
MONGODB_AUTH_DATABASE=admin
MONGODB_DASHBOARD_DATABASE=traffic_signal_dashboard

# Radar Configuration
RADAR_PROTOCOL_VERSION=2.1
RADAR_DEVICE_ID=Radar04

# Dashboard Configuration
DASHBOARD_REFRESH_INTERVAL=1000
QUEUE_THRESHOLD=50
SPEED_LIMIT=60
LANES=11,12,13,485
```

### MongoDB Connection Pattern

MongoDB uses separate environment variables (NOT a URI string):
```typescript
// CORRECT - from src/lib/mongodb.ts
const uri = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DASHBOARD_DATABASE}?authSource=${process.env.MONGODB_AUTH_DATABASE}`;
```

**Important**: Database name is `traffic_signal_dashboard`, NOT `traffic_analysis`

## OpenSpec Workflow (IMPORTANT)

This project uses **OpenSpec** for specification-driven development. All feature changes follow a structured proposal → implementation → archive workflow.

### When to Create a Change Proposal

**MUST create proposal for:**
- New features or capabilities
- Breaking changes (API, schema, architecture)
- Performance optimizations that change behavior
- Security pattern updates

**Skip proposal for:**
- Bug fixes (restoring intended spec behavior)
- Typos, formatting, comments
- Non-breaking dependency updates
- Tests for existing behavior

### OpenSpec Commands

```bash
# Explore current state
openspec list                    # List active changes
openspec list --specs            # List all specifications
openspec show [change-or-spec]   # View details
openspec validate [change] --strict  # Validate proposal

# Archive completed work
openspec archive <change-id> --yes   # Move to archive after deployment
```

### Three-Stage Workflow

#### Stage 1: Creating Changes
1. Check existing specs: `openspec list --specs`
2. Choose unique verb-led change-id (e.g., `add-real-time-alerts`, `update-classification-metrics`)
3. Create structure under `openspec/changes/[change-id]/`:
   ```
   openspec/changes/add-feature-name/
   ├── proposal.md      # Why, what, impact
   ├── tasks.md         # Implementation checklist
   ├── design.md        # Technical decisions (optional, see criteria)
   └── specs/           # Spec deltas
       └── [capability]/
           └── spec.md  # ADDED/MODIFIED/REMOVED requirements
   ```
4. Write spec deltas using operation headers:
   - `## ADDED Requirements` - new capabilities
   - `## MODIFIED Requirements` - changed behavior (paste FULL requirement)
   - `## REMOVED Requirements` - deprecated features
   - `## RENAMED Requirements` - name changes
5. Every requirement MUST have at least one `#### Scenario:` (4 hashtags, not bullets)
6. Validate: `openspec validate [change-id] --strict`
7. **DO NOT START IMPLEMENTATION** until proposal is approved

#### Stage 2: Implementing Changes
1. Read `proposal.md` → `design.md` (if exists) → `tasks.md`
2. Implement tasks sequentially
3. Update `tasks.md` checkboxes as you complete items
4. Ensure all tasks marked `[x]` before marking change complete

#### Stage 3: Archiving Changes
After deployment:
1. Run `openspec archive <change-id> --yes`
2. This moves `changes/[name]` → `changes/archive/YYYY-MM-DD-[name]/`
3. Specs in `openspec/specs/` are updated automatically
4. Create separate PR for archival

### Critical Spec Formatting Rules

**CORRECT scenario format:**
```markdown
### Requirement: Feature Name
The system SHALL provide...

#### Scenario: Success case
- **WHEN** user performs action
- **THEN** expected result
- **AND** additional condition
```

**WRONG formats:**
```markdown
- **Scenario: Name**     ❌ (don't use bullets)
**Scenario**: Name       ❌ (don't use bold + colon)
### Scenario: Name       ❌ (must be #### - 4 hashtags)
```

### Design.md Criteria

Only create `design.md` if ANY of these apply:
- Cross-cutting change (multiple services/modules)
- New architectural pattern or external dependency
- Significant data model changes
- Security, performance, or migration complexity
- Technical ambiguity needing decisions before coding

Otherwise, omit `design.md` to keep proposals lightweight.

### Active vs Archived Changes

- `openspec/changes/` - Currently in progress (not yet deployed)
- `openspec/changes/archive/` - Completed and deployed features
- `openspec/specs/` - Current truth (what IS built and deployed)

### Example: Checking Before Adding a Feature

```bash
# 1. Check if capability exists
openspec list --specs | grep -i "classification"

# 2. Check for in-progress changes
openspec list

# 3. View existing spec
openspec show dashboard --type spec

# 4. If modifying existing capability, use MODIFIED in delta spec
# If adding orthogonal new capability, use ADDED in delta spec
```

## API Reference

### Dashboard APIs
- `GET /api/dashboard?device={deviceId}` - Main dashboard metrics with device-specific data
- `GET /api/lanes?device={deviceId}` - Lane-specific data and performance metrics

### Classification APIs
- `GET /api/classification` - Main classification data with filtering and aggregation
- `POST /api/classification` - Process real-time updates and export data
- `GET /api/classification/summary` - Summary statistics and KPIs
- `GET /api/classification/metrics` - Real-time metrics and counters
- `GET /api/classification/cache` - Cache management and statistics
- `POST /api/classification/cache` - Cache control operations
- `DELETE /api/classification/cache` - Clear cache data
- `GET /api/classification/poller` - Redis poller status and statistics
- `POST /api/classification/poller` - Start/stop poller operations
- `GET /api/classification/monitoring` - Performance monitoring and rate limiting stats
- `GET /api/classification/enhanced-metrics` - Advanced analytics and insights
- `POST /api/classification/auto-process` - Automated processing control

### Video Streaming APIs
- `GET /api/video/streams` - List active video streams
- `POST /api/video/streams` - Create new video streams
- `GET /api/video/cameras` - Camera configuration management
- `POST /api/video/cameras` - Add/update camera settings
- `GET /api/video/recordings` - Video recording management
- `GET /api/video/hls/[...path]` - HLS stream serving (.m3u8 and .ts files)

### Tracking APIs
- `GET /api/tracking?device={deviceId}` - Main tracking data
- `GET /api/tracking/vehicles?device={deviceId}` - Individual vehicle tracking

### Utility APIs
- `GET /api/real-passdata` - Raw PassData access for debugging
- `GET /api/simple-redis` - Redis connectivity testing

## API Security & Authentication

### Authentication
All API routes use middleware-based authentication and rate limiting via `src/lib/middleware.ts`.

**API Key Authentication:**
- Set `API_KEY` environment variable for production
- Pass API key via `x-api-key` header or `Authorization: Bearer <key>` header
- If `API_KEY` is not set, all requests are allowed (development mode only)

**Example Requests:**
```bash
# With x-api-key header
curl -H "x-api-key: your-api-key-here" http://localhost:3000/api/dashboard

# With Authorization Bearer token
curl -H "Authorization: Bearer your-api-key-here" http://localhost:3000/api/classification

# Generate secure API key
openssl rand -base64 32
```

### Rate Limiting
Two rate limiters are active:

**General API Endpoints (100 requests/minute):**
- Dashboard, Classification, Tracking, Lanes APIs
- Blocked for 5 minutes if limit exceeded
- Headers include: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Export Endpoints (10 requests/minute):**
- `/api/classification/export` and similar data export routes
- Stricter limits to prevent abuse
- Blocked for 10 minutes if limit exceeded

**Rate Limit Response:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Blocked until 2025-10-27T10:30:00Z",
  "retryAfter": 300
}
```

### Protected Routes
The following routes are currently protected (as of 2025-10-27):
- ✅ `/api/dashboard`
- ✅ `/api/classification`
- ✅ `/api/classification/summary`
- ✅ `/api/classification/metrics`
- ✅ `/api/classification/export`
- ✅ `/api/tracking`
- ✅ `/api/tracking/vehicles`
- ✅ `/api/lanes`

### Security Best Practices
1. **Always set API_KEY in production:** Use a strong, random key (32+ characters)
2. **Rotate API keys periodically:** Update keys every 90 days
3. **Monitor rate limiter stats:** Check `getApiRateLimiter().getStats()` for anomalies
4. **Use HTTPS in production:** Never send API keys over HTTP
5. **Log authentication failures:** Monitor for potential attacks

### Database Security
**MongoDB:**
- Connection pooling: min 2, max 10 connections
- Retry logic: 3 attempts with exponential backoff
- Optimized indexes for query performance (see MongoDB Indexes section)

**Redis:**
- Singleton connection pattern via `getRedisClient()`
- Automatic reconnection with retry logic
- Connection timeout: 5 seconds

## MongoDB Indexes

### Index Management
Create optimized database indexes for performance:
```bash
cd dashboard
npm run db:indexes
```

### Created Indexes
**classification_history collection:**
- `deviceId_timestamp_desc` - Device-scoped time-range queries (primary)
- `deviceId_timeSlot` - Aggregation by time period
- `deviceId_vehicleType_timestamp` - Vehicle type filtering

**vehicle_tracking collection:**
- `deviceId_targetId_timestamp` - Individual vehicle lookups
- `deviceId_lane_timestamp` - Lane-based queries
- `timestamp_ttl` - Automatic 30-day data cleanup

**pass_data collection:**
- `deviceId_timestamp_desc` - Device-scoped PassData queries
- `deviceId_vehicleType_timestamp` - Vehicle type analysis
- `deviceId_lane_timestamp` - Lane-based analysis

### Index Utilities
```bash
# List indexes for a collection
node -e "require('./src/lib/mongodb-indexes').listIndexes('classification_history')"

# Get index statistics
node -e "require('./src/lib/mongodb-indexes').getIndexStats('classification_history')"

# Drop all indexes (use with caution)
node -e "require('./src/lib/mongodb-indexes').dropIndexes('classification_history')"
```

## Documentation

- Full API reference: `API_DOCUMENTATION.md`
- Deployment guide: `DEPLOYMENT_GUIDE.md`
- Video streaming: `VIDEO_STREAMING_DEPLOYMENT.md`
- Classification system: `dashboard/src/docs/CLASSIFICATION_*.md`
- Project conventions: `openspec/project.md`
- OpenSpec workflow: `openspec/AGENTS.md`
- Current specs: `openspec/specs/[capability]/spec.md`
- Active changes: `openspec/changes/`
- Archived changes: `openspec/changes/archive/`
