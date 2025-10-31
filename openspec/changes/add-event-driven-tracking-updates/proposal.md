# Add Event-Driven Tracking Updates

**Change ID**: `add-event-driven-tracking-updates`
**Date**: January 31, 2025
**Status**: Complete
**Priority**: High

## Why

The live vehicle tracking system currently uses polling-based updates at fixed intervals (1-5 seconds), which introduces latency and doesn't match the radar's actual transmission rate. Traffic engineers need:

1. **Real-Time Visualization**: See vehicle movements as soon as the radar detects them
2. **Match Radar Rate**: Follow the radar's actual transmission frequency (multiple times per second)
3. **Reduce Latency**: Eliminate polling delays that cause stale data
4. **Better Responsiveness**: Smoother, more accurate vehicle tracking visualization

The radar system transmits ObjectData packets multiple times per second, but the dashboard was only checking for updates every 1-5 seconds. This mismatch causes delays and missed updates.

## What Changes

**Migrated tracking updates from polling to event-driven architecture** using Redis keyspace notifications to match the radar's transmission rate.

### Key Features

1. **Event-Driven Updates**
   - Uses Redis keyspace notifications (`__keyspace@0__:{deviceId}/objectdata`)
   - Triggers immediately when radar transmits (LPUSH/RPUSH operations)
   - Follows actual radar transmission rate (multiple times per second)

2. **Redis Pub/Sub Integration**
   - Extended `RedisPubSubService` with ObjectData subscription support
   - Automatic subscription to ObjectData keyspace notifications
   - Callback-based architecture for real-time processing

3. **Backward Compatibility**
   - Keeps 5-second polling as fallback mechanism
   - Ensures updates continue even if keyspace notifications fail
   - No breaking changes to existing WebSocket message formats

4. **Performance Optimizations**
   - Throttles tracking summary updates (once per second) to avoid spam
   - Immediate processing of tracking updates
   - Reduced CPU usage (no constant polling)

**Modified Files:**
- `dashboard/src/lib/redis-pubsub-service.ts` - Added ObjectData keyspace notification support
- `dashboard/src/lib/unified-websocket-server.ts` - Migrated to event-driven tracking updates
- `openspec/specs/live-tracking/spec.md` - Added event-driven update requirements

## Impact

- **Affected Specs**: `live-tracking`
- **Affected Code**: 
  - `dashboard/src/lib/redis-pubsub-service.ts`
  - `dashboard/src/lib/unified-websocket-server.ts`
  - WebSocket tracking channel implementation
- **User Impact**: Significantly improved real-time responsiveness, no breaking changes
- **Performance**: Reduced latency from 1-5 seconds to milliseconds, lower CPU usage

## Benefits

1. **Real-Time Updates**: Tracking updates match radar transmission rate (multiple times/second)
2. **Lower Latency**: Event-driven updates eliminate polling delays
3. **Better Accuracy**: No missed updates between polling intervals
4. **Efficient**: Event-driven architecture reduces unnecessary polling
5. **Resilient**: Fallback polling ensures updates continue if notifications fail

## Technical Details

### Architecture Change
- **Before**: Polling-based (`setInterval` every 1-5 seconds)
- **After**: Event-driven (Redis keyspace notifications + polling fallback)

### Redis Keyspace Notifications
- Pattern: `__keyspace@0__:{deviceId}/objectdata`
- Triggered by: LPUSH/RPUSH operations on objectdata keys
- Format: Standard Redis keyspace notification pattern

### Fallback Mechanism
- Polling interval: 5 seconds (slower than before, as fallback only)
- Activates automatically if keyspace notifications fail
- Ensures system continues working even without notifications enabled

