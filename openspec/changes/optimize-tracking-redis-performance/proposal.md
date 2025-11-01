# Optimize Object Tracking Redis Performance

**Change ID**: `optimize-tracking-redis-performance`
**Date**: January 31, 2025
**Status**: Complete
**Priority**: High

## Why

Object tracking was experiencing significant performance degradation due to inefficient Redis operations. The system was making sequential Redis calls for each vehicle processed:

1. **Excessive Redis Calls**: ~6-8 Redis operations per vehicle (getState, getHistory, setState × 6 fields, addHistory, etc.)
2. **High Volume**: With 16 vehicles per frame at 5-10Hz = 480-1,280 Redis calls per second
3. **Network Latency Accumulation**: Each sequential call had network round-trip latency, causing noticeable delays
4. **Processing Bottleneck**: Sequential processing prevented the system from keeping up with radar transmission rates

This bottleneck caused object tracking to appear slow and laggy, even though the event-driven architecture was correctly receiving updates. The system needed optimization to batch Redis operations and minimize round-trips.

## What Changes

**Optimized Redis operations in object tracking to use batch operations and pipelines, reducing Redis calls by 96-98%.**

### Key Optimizations

1. **Batch Redis Operations in VehicleTrackingRedis**
   - Replaced multiple sequential `hSet()` calls with single `hSet()` using object parameter
   - Added `batchSetVehicleStates()` method using Redis pipelines for multiple vehicles
   - Added `batchGetVehicleStates()` method using pipelines for parallel fetching
   - Added `batchGetVehicleHistories()` method using pipelines
   - Added `batchAddToVehicleHistories()` method using pipelines
   - Optimized `getAllVehicleStates()` to use pipelines instead of sequential calls

2. **Parallel Processing in VehicleTracker**
   - Refactored `processObjectData()` to batch fetch all vehicle states and histories in parallel
   - Process all vehicles in memory before writing to Redis
   - Batch write all updates using pipelines in parallel
   - Reduced from ~96-128 sequential Redis calls per frame to ~4-6 batch operations

3. **Performance Metrics**
   - **Before**: 480-1,280 Redis calls per second (sequential)
   - **After**: 20-60 Redis calls per second (96-98% reduction)
   - **Latency**: Reduced from cumulative sequential delays to minimal pipeline overhead
   - **Throughput**: System can now handle radar transmission rates (5-10Hz) smoothly

**Modified Files:**
- `dashboard/src/lib/vehicle-tracking-redis.ts` - Added batch operations with Redis pipelines
- `dashboard/src/lib/vehicle-tracker.ts` - Optimized to use batch operations
- `openspec/specs/live-tracking/spec.md` - Updated Redis performance requirements

## Impact

- **Affected Specs**: `live-tracking`
- **Affected Code**: 
  - `dashboard/src/lib/vehicle-tracking-redis.ts` - New batch methods
  - `dashboard/src/lib/vehicle-tracker.ts` - Optimized processing flow
- **User Impact**: Significantly faster object tracking, smooth real-time updates, no breaking changes
- **Performance**: 96-98% reduction in Redis calls, eliminated processing bottleneck

## Benefits

1. **Massive Performance Improvement**: 96-98% reduction in Redis operations (from ~960 calls/sec to ~40 calls/sec)
2. **Lower Latency**: Batch operations eliminate cumulative network round-trip delays
3. **Better Throughput**: System can now process radar updates at full transmission rate (5-10Hz)
4. **Smoother Tracking**: Objects move smoothly in real-time without lag
5. **Scalability**: Batch operations scale better with increasing vehicle counts
6. **Resource Efficiency**: Reduced Redis server load and network traffic

## Technical Details

### Architecture Change
- **Before**: Sequential Redis calls per vehicle (~6-8 calls × 16 vehicles = 96-128 calls/frame)
- **After**: Batch operations with pipelines (~2 batch reads + 2 batch writes = 4-6 operations/frame)

### Redis Pipeline Operations
- **Batch Read**: Single pipeline to fetch all vehicle states and histories in parallel
- **Batch Write**: Single pipeline to write all vehicle states and histories in parallel
- **hSet Optimization**: Single `hSet()` call with object parameter instead of 6 separate calls

### Performance Characteristics
- **Pipeline Execution**: All operations in pipeline execute atomically with single round-trip
- **Parallel Processing**: Read and write operations execute in parallel using `Promise.all()`
- **Memory Efficiency**: In-memory processing before batch writes minimizes Redis operations

