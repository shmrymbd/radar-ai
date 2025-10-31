# Fix Redis Key Consistency for Pub/Sub Implementation

**Change ID**: `fix-redis-key-consistency`  
**Date**: October 26, 2025  
**Status**: Draft  
**Priority**: High  

## Problem Statement

The codebase has **inconsistent Redis key patterns** for PassData pub/sub implementation, causing potential data synchronization issues and confusion in the architecture.

### Current Issues Identified

1. **Mixed Case Patterns**: Some services use `PassData` (PascalCase) while others use `passdata` (lowercase)
2. **Inconsistent Key Formats**: Different services use different Redis key patterns:
   - `deviceId/passdata` (lowercase)
   - `deviceId/PassData` (PascalCase) 
   - `deviceId:PassData:stream` (colon separator with PascalCase)
   - `deviceId/PassData:stream` (slash separator with PascalCase)

3. **Pub/Sub Channel Mismatch**: Pub/sub channels don't consistently match Redis key patterns
4. **Stream vs List Confusion**: Some services expect Redis Lists while others expect Redis Streams

### Impact

- **Data Loss Risk**: Services may not receive pub/sub notifications due to key mismatches
- **Architecture Confusion**: Developers unclear on which pattern to use
- **Maintenance Issues**: Difficult to debug pub/sub issues with inconsistent patterns
- **Scalability Problems**: Inconsistent patterns make horizontal scaling difficult

## Proposed Solution

**Standardize on lowercase `deviceId/passdata` pattern** across all services for consistency with existing Redis data.

### Key Standardization

- **Primary Pattern**: `deviceId/passdata` (lowercase, slash separator)
- **Pub/Sub Channels**: `deviceId/passdata:new` for notifications
- **Keyspace Notifications**: `__keyspace@0__:deviceId/passdata`
- **Stream Keys**: `deviceId/passdata:stream` (if needed)

### Services to Update

1. **PassDataStreamProcessor**: Fix stream key generation
2. **ListToStreamBridge**: Standardize key patterns
3. **RedisPubSubService**: Ensure channel consistency
4. **PassDataSubscriber**: Verify keyspace notification patterns
5. **UnifiedWebSocketServer**: Update Redis key references

## Success Criteria

- ✅ All services use consistent `deviceId/passdata` pattern
- ✅ Pub/sub notifications work reliably across all services
- ✅ No data loss due to key mismatches
- ✅ Clear documentation of Redis key patterns
- ✅ All tests pass with consistent patterns

## Implementation Plan

1. **Audit Current Usage**: Document all Redis key patterns in use
2. **Update Core Services**: Fix PassDataStreamProcessor and ListToStreamBridge
3. **Verify Pub/Sub**: Ensure all pub/sub services use consistent patterns
4. **Update Tests**: Fix any tests that depend on old key patterns
5. **Documentation**: Update architecture docs with standard patterns

## Risk Assessment

- **Low Risk**: Changes are internal to Redis key patterns
- **No Breaking Changes**: External APIs remain unchanged
- **Easy Rollback**: Can revert key pattern changes if needed
- **Testing Required**: Need to verify pub/sub still works after changes

## Dependencies

- Redis server connectivity
- Existing pub/sub infrastructure
- MongoDB data storage (unchanged)
- WebSocket server (minimal changes)

---

**Next Steps**: Review and approve this proposal, then implement the Redis key consistency fixes.
