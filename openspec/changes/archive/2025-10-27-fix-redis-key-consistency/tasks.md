# Implementation Tasks

## Phase 1: Audit and Document Current State

- [x] **Task 1.1**: Document all Redis key patterns currently in use
  - Search codebase for all Redis key references
  - Identify inconsistencies between services
  - Create mapping of current patterns

- [x] **Task 1.2**: Test current pub/sub functionality
  - Verify which services are actually receiving pub/sub notifications
  - Identify any services that are not receiving data due to key mismatches
  - Document current data flow

## Phase 2: Fix Core Services

- [x] **Task 2.1**: Fix PassDataStreamProcessor Redis key patterns
  - Update `getStreamKey()` method to use `deviceId/passdata:stream`
  - Ensure consistent lowercase pattern
  - Update any hardcoded key references

- [x] **Task 2.2**: Fix ListToStreamBridge key patterns
  - Update list key to use `deviceId/passdata`
  - Update stream key to use `deviceId/passdata:stream`
  - Ensure consistent separator usage (slash, not colon)

- [x] **Task 2.3**: Verify RedisPubSubService consistency
  - Ensure channel pattern matches `deviceId/passdata:new`
  - Verify keyspace notification pattern `__keyspace@0__:deviceId/passdata`
  - Test pub/sub message delivery

## Phase 3: Update Supporting Services

- [x] **Task 3.1**: Update PassDataSubscriber key patterns
  - Verify keyspace notification patterns
  - Ensure Redis key access uses `deviceId/passdata`
  - Test MongoDB data writing

- [x] **Task 3.2**: Update UnifiedWebSocketServer references
  - Fix any hardcoded Redis key references
  - Ensure WebSocket message broadcasting works
  - Test real-time data updates

- [x] **Task 3.3**: Update RedisStorage service
  - Verify all Redis key generation methods
  - Ensure consistent pattern usage
  - Test data storage and retrieval

## Phase 4: Testing and Validation

- [x] **Task 4.1**: Update unit tests
  - Fix any tests that depend on old key patterns
  - Add tests for new consistent patterns
  - Verify all tests pass

- [x] **Task 4.2**: Integration testing
  - Test end-to-end pub/sub data flow
  - Verify data consistency across services
  - Test with multiple devices

- [x] **Task 4.3**: Performance testing
  - Ensure no performance degradation
  - Verify pub/sub latency remains acceptable
  - Test under load

## Phase 5: Documentation and Cleanup

- [x] **Task 5.1**: Update architecture documentation
  - Document standard Redis key patterns
  - Update pub/sub architecture diagrams
  - Add troubleshooting guide

- [x] **Task 5.2**: Code cleanup
  - Remove any unused Redis key patterns
  - Add comments explaining key patterns
  - Ensure consistent naming

- [x] **Task 5.3**: Final validation
  - Run full test suite
  - Verify all services work together
  - Document any remaining inconsistencies

## Validation Criteria

Each task must be validated with:
- ✅ Code changes implemented
- ✅ Tests pass
- ✅ No linting errors
- ✅ Manual testing completed
- ✅ Documentation updated (if applicable)

## Dependencies

- Redis server access for testing
- MongoDB for data validation
- WebSocket server for real-time testing
- Existing test infrastructure
