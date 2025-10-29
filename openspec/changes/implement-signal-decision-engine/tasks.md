# Implementation Tasks: Adaptive Traffic Signal Decision Engine

## Overview

This document breaks down the implementation into 4 phases with specific, testable tasks.

**Total Estimated Time**: 7-8 weeks
**Priority**: High (Core traffic optimization capability)

---

## Phase 1: Core Data Aggregation (Week 1-2)

### 1.1 Data Aggregator Component

- [ ] **Task 1.1.1**: Create `src/lib/signal-decision/data-aggregator.ts`
  - [ ] Define TypeScript interfaces (AggregatedTrafficState, ApproachState)
  - [ ] Implement DataAggregator class skeleton
  - [ ] Add Redis client integration using existing getRedisClient()
  - **Estimated Time**: 4 hours

- [ ] **Task 1.1.2**: Implement data fetching for all 5 packet types
  - [ ] Add getObjectData() method (0x01 packets)
  - [ ] Add getPassData() method (0x05 packets)
  - [ ] Add getTrafficData() method (0x03 packets)
  - [ ] Add getLaneStatus() method (0x04 packets)
  - [ ] Add getRegionData() method (0x02 packets)
  - [ ] Use Promise.all() for parallel fetching
  - **Estimated Time**: 8 hours

- [ ] **Task 1.1.3**: Implement data processing methods
  - [ ] Add processLaneStatus() - extract queue and occupancy
  - [ ] Add processPassData() - calculate wait times and crossing rates
  - [ ] Add processObjectData() - track vehicles and detect emergencies
  - [ ] Add processTrafficData() - extract headway and flow rates
  - [ ] Add processRegionData() - parse turn movement percentages
  - **Estimated Time**: 12 hours

- [ ] **Task 1.1.4**: Add data validation and normalization
  - [ ] Validate numeric ranges (queue length 0-500m, speed 0-200 km/h)
  - [ ] Handle missing data with sensible defaults
  - [ ] Add data quality scoring
  - [ ] Log validation warnings
  - **Estimated Time**: 6 hours

- [ ] **Task 1.1.5**: Implement caching and optimization
  - [ ] Add in-memory cache with 100ms TTL
  - [ ] Implement incremental updates (detect data changes)
  - [ ] Add performance monitoring (track aggregation time)
  - [ ] Optimize Redis queries with pipelining
  - **Estimated Time**: 6 hours

### 1.2 Real-time Subscription System

- [ ] **Task 1.2.1**: Implement Redis Pub/Sub subscriber
  - [ ] Subscribe to keyspace notifications for all data types
  - [ ] Handle LPUSH/RPUSH events
  - [ ] Trigger aggregation on data updates
  - [ ] Add reconnection logic with exponential backoff
  - **Estimated Time**: 6 hours

- [ ] **Task 1.2.2**: Add callback system for real-time updates
  - [ ] Implement subscribeToUpdates() method
  - [ ] Support multiple subscribers
  - [ ] Add unsubscribe mechanism
  - [ ] Rate-limit callbacks (max 10 Hz per subscriber)
  - **Estimated Time**: 4 hours

### 1.3 Testing and Validation

- [ ] **Task 1.3.1**: Unit tests for DataAggregator
  - [ ] Test data fetching with mocked Redis
  - [ ] Test processing methods with sample data
  - [ ] Test validation edge cases
  - [ ] Test caching behavior
  - **Estimated Time**: 8 hours

- [ ] **Task 1.3.2**: Integration tests with real Redis
  - [ ] Test with P1-center device data
  - [ ] Test with multiple devices
  - [ ] Test performance under load (100+ vehicles)
  - [ ] Verify latency targets (< 50ms aggregation)
  - **Estimated Time**: 6 hours

**Phase 1 Total**: ~60 hours (2 weeks)

---

## Phase 2: Scoring and Decision Logic (Week 3-4)

### 2.1 Scoring Engine Component

- [ ] **Task 2.1.1**: Create `src/lib/signal-decision/scoring-engine.ts`
  - [ ] Define IntersectionConfig and ScoreBreakdown interfaces
  - [ ] Implement ScoringEngine class
  - [ ] Add configurable weight system
  - **Estimated Time**: 4 hours

- [ ] **Task 2.1.2**: Implement scoring factors
  - [ ] Add queue length scoring (0-100 scale)
  - [ ] Add wait time scoring with starvation prevention
  - [ ] Add demand scoring (vehicle count + arrival rate)
  - [ ] Add efficiency scoring (flow rate vs. capacity)
  - [ ] Add safety scoring (speed compliance)
  - **Estimated Time**: 8 hours

- [ ] **Task 2.1.3**: Implement weighted score calculation
  - [ ] Calculate weighted total score (0-100)
  - [ ] Add getScoreBreakdown() for debugging
  - [ ] Implement score normalization
  - [ ] Add confidence scoring
  - **Estimated Time**: 4 hours

- [ ] **Task 2.1.4**: Add configuration management
  - [ ] Load configs from MongoDB lane_config collection
  - [ ] Support per-intersection custom weights
  - [ ] Implement config validation
  - [ ] Add config hot-reloading
  - **Estimated Time**: 6 hours

### 2.2 Decision Engine Component

- [ ] **Task 2.2.1**: Create `src/lib/signal-decision/decision-engine.ts`
  - [ ] Define SignalPhase and SignalDecision interfaces
  - [ ] Implement DecisionEngine class
  - [ ] Integrate ScoringEngine
  - **Estimated Time**: 4 hours

- [ ] **Task 2.2.2**: Implement core decision logic
  - [ ] Add emergency vehicle preemption
  - [ ] Implement min/max green time enforcement
  - [ ] Add phase selection algorithm
  - [ ] Implement extension logic (gap-out detection)
  - **Estimated Time**: 10 hours

- [ ] **Task 2.2.3**: Implement phase transition logic
  - [ ] Calculate score deltas for all approaches
  - [ ] Implement transition threshold logic
  - [ ] Add phase sequencing rules
  - [ ] Implement compatible movement detection
  - **Estimated Time**: 8 hours

- [ ] **Task 2.2.4**: Add turn phase optimization
  - [ ] Detect when protected left turn needed (> 30% left turns)
  - [ ] Implement protected-permissive phase selection
  - [ ] Add overlap phase support
  - **Estimated Time**: 6 hours

### 2.3 Testing and Validation

- [ ] **Task 2.3.1**: Unit tests for ScoringEngine
  - [ ] Test individual factor calculations
  - [ ] Test weighted score accuracy
  - [ ] Test edge cases (zero vehicles, max queue)
  - [ ] Test config validation
  - **Estimated Time**: 6 hours

- [ ] **Task 2.3.2**: Unit tests for DecisionEngine
  - [ ] Test emergency preemption
  - [ ] Test phase transitions
  - [ ] Test extension logic
  - [ ] Test decision confidence scoring
  - **Estimated Time**: 8 hours

- [ ] **Task 2.3.3**: Integration tests with sample scenarios
  - [ ] Test heavy traffic scenario
  - [ ] Test balanced traffic scenario
  - [ ] Test emergency vehicle scenario
  - [ ] Test turn phase optimization
  - **Estimated Time**: 8 hours

**Phase 2 Total**: ~72 hours (2 weeks)

---

## Phase 3: Safety Validation and Control (Week 5-6)

### 3.1 Safety Validator Component

- [ ] **Task 3.1.1**: Create `src/lib/signal-decision/safety-validator.ts`
  - [ ] Define SafetyConstraints and SafetyValidation interfaces
  - [ ] Implement SafetyValidator class
  - [ ] Load safety constraints from config
  - **Estimated Time**: 4 hours

- [ ] **Task 3.1.2**: Implement clearance time calculations
  - [ ] Calculate vehicle clearance time (distance / speed)
  - [ ] Add safety buffer (20% extra time)
  - [ ] Implement pedestrian clearance calculation
  - [ ] Add queue discharge time estimation
  - **Estimated Time**: 6 hours

- [ ] **Task 3.1.3**: Implement conflict detection
  - [ ] Create conflict matrix for intersection geometry
  - [ ] Detect movement conflicts (left turn vs. opposing through)
  - [ ] Validate yellow + all-red clearance intervals
  - [ ] Add pedestrian conflict detection
  - **Estimated Time**: 8 hours

- [ ] **Task 3.1.4**: Implement safety validation checks
  - [ ] Validate min/max green times
  - [ ] Validate yellow interval duration
  - [ ] Validate all-red clearance time
  - [ ] Validate pedestrian crossing times
  - [ ] Add override mechanism for special cases
  - **Estimated Time**: 6 hours

### 3.2 Signal Controller Interface

- [ ] **Task 3.2.1**: Create `src/lib/signal-decision/signal-controller.ts`
  - [ ] Define hardware command interfaces
  - [ ] Implement SignalController class
  - [ ] Add state management (current phase, elapsed time)
  - **Estimated Time**: 6 hours

- [ ] **Task 3.2.2**: Implement decision execution
  - [ ] Execute HOLD decisions (no-op)
  - [ ] Execute EXTEND decisions (update max time)
  - [ ] Execute TRANSITION decisions (yellow → all-red → green)
  - [ ] Execute PREEMPT decisions (immediate transition)
  - **Estimated Time**: 8 hours

- [ ] **Task 3.2.3**: Add command generation
  - [ ] Generate phase change commands
  - [ ] Generate timing adjustment commands
  - [ ] Add command validation before sending
  - [ ] Implement command retry logic
  - **Estimated Time**: 6 hours

- [ ] **Task 3.2.4**: Implement audit logging
  - [ ] Log all decisions to MongoDB signal_decisions collection
  - [ ] Log safety validation results
  - [ ] Log command execution status
  - [ ] Add performance metrics (decision latency)
  - **Estimated Time**: 6 hours

### 3.3 Manual Override System

- [ ] **Task 3.3.1**: Add manual control interface
  - [ ] Implement enable/disable automation toggle
  - [ ] Add manual phase selection
  - [ ] Implement emergency stop functionality
  - [ ] Add override reason logging
  - **Estimated Time**: 6 hours

- [ ] **Task 3.3.2**: Create monitoring dashboard components
  - [ ] Display current decision state
  - [ ] Show score breakdown visualization
  - [ ] Add decision history timeline
  - [ ] Implement real-time decision streaming
  - **Estimated Time**: 8 hours

### 3.4 Testing and Validation

- [ ] **Task 3.4.1**: Unit tests for SafetyValidator
  - [ ] Test clearance calculations
  - [ ] Test conflict detection
  - [ ] Test safety constraint validation
  - [ ] Test edge cases (high speeds, long queues)
  - **Estimated Time**: 8 hours

- [ ] **Task 3.4.2**: Unit tests for SignalController
  - [ ] Test decision execution
  - [ ] Test command generation
  - [ ] Test state management
  - [ ] Test error handling
  - **Estimated Time**: 6 hours

- [ ] **Task 3.4.3**: End-to-end integration tests
  - [ ] Test full decision cycle (data → decision → command)
  - [ ] Test with live Redis data streams
  - [ ] Test MongoDB audit logging
  - [ ] Verify latency targets (< 200ms end-to-end)
  - **Estimated Time**: 10 hours

**Phase 3 Total**: ~88 hours (2+ weeks)

---

## Phase 4: Production Deployment (Week 7-8)

### 4.1 API Integration

- [ ] **Task 4.1.1**: Create signal control API routes
  - [ ] Add `GET /api/signal-control/status` - Get current decision state
  - [ ] Add `POST /api/signal-control/manual-override` - Enable manual control
  - [ ] Add `GET /api/signal-control/decisions/history` - Query decision log
  - [ ] Add `POST /api/signal-control/config` - Update intersection config
  - **Estimated Time**: 8 hours

- [ ] **Task 4.1.2**: Implement WebSocket broadcast
  - [ ] Add 'signal-control' channel
  - [ ] Broadcast decision updates in real-time
  - [ ] Add score breakdown streaming
  - [ ] Implement client subscription management
  - **Estimated Time**: 6 hours

### 4.2 Performance Optimization

- [ ] **Task 4.2.1**: Profile and optimize hot paths
  - [ ] Profile data aggregation performance
  - [ ] Optimize score calculations
  - [ ] Reduce memory allocations
  - [ ] Add performance monitoring instrumentation
  - **Estimated Time**: 8 hours

- [ ] **Task 4.2.2**: Implement load testing
  - [ ] Test with 100+ vehicles per intersection
  - [ ] Test with multiple devices simultaneously
  - [ ] Verify sub-200ms decision latency under load
  - [ ] Test memory usage over 24 hours
  - **Estimated Time**: 8 hours

### 4.3 Documentation and Training

- [ ] **Task 4.3.1**: Create user documentation
  - [ ] Write traffic engineer guide
  - [ ] Document configuration parameters
  - [ ] Create troubleshooting guide
  - [ ] Add decision algorithm explanation
  - **Estimated Time**: 8 hours

- [ ] **Task 4.3.2**: Create technical documentation
  - [ ] Document component architecture
  - [ ] Add API endpoint documentation
  - [ ] Create deployment guide
  - [ ] Document safety validation logic
  - **Estimated Time**: 6 hours

- [ ] **Task 4.3.3**: Create training materials
  - [ ] Prepare demo scenarios
  - [ ] Create video walkthrough
  - [ ] Develop configuration best practices guide
  - [ ] Prepare FAQ document
  - **Estimated Time**: 8 hours

### 4.4 Pilot Deployment

- [ ] **Task 4.4.1**: Select pilot intersection
  - [ ] Choose intersection with good data quality
  - [ ] Verify all 5 data types available
  - [ ] Document baseline performance metrics
  - [ ] Get traffic engineer approval
  - **Estimated Time**: 4 hours

- [ ] **Task 4.4.2**: Deploy to pilot
  - [ ] Deploy decision engine
  - [ ] Configure intersection parameters
  - [ ] Enable monitoring dashboard
  - [ ] Train traffic engineers on manual override
  - **Estimated Time**: 8 hours

- [ ] **Task 4.4.3**: Monitor pilot performance (1 week)
  - [ ] Collect performance metrics daily
  - [ ] Monitor for safety issues
  - [ ] Gather traffic engineer feedback
  - [ ] Tune configuration parameters
  - **Estimated Time**: 20 hours (spread over 1 week)

- [ ] **Task 4.4.4**: Evaluate and refine
  - [ ] Analyze performance vs. baseline
  - [ ] Identify improvement opportunities
  - [ ] Address any bugs or issues
  - [ ] Document lessons learned
  - **Estimated Time**: 8 hours

### 4.5 Production Rollout

- [ ] **Task 4.5.1**: Prepare production deployment
  - [ ] Create deployment checklist
  - [ ] Set up production monitoring
  - [ ] Configure alerting for failures
  - [ ] Document rollback procedures
  - **Estimated Time**: 6 hours

- [ ] **Task 4.5.2**: Deploy to additional intersections
  - [ ] Roll out to 2-3 more intersections
  - [ ] Monitor each deployment for 48 hours
  - [ ] Collect comparative performance data
  - [ ] Refine configurations based on intersection characteristics
  - **Estimated Time**: 16 hours

- [ ] **Task 4.5.3**: Ongoing monitoring and optimization
  - [ ] Set up weekly performance reports
  - [ ] Create maintenance schedule
  - [ ] Plan quarterly optimization reviews
  - [ ] Establish feedback loop with traffic engineers
  - **Estimated Time**: 8 hours

**Phase 4 Total**: ~122 hours (2+ weeks)

---

## Summary

### Total Effort Estimate

| Phase | Hours | Duration |
|-------|-------|----------|
| Phase 1: Data Aggregation | 60 | 2 weeks |
| Phase 2: Scoring & Decisions | 72 | 2 weeks |
| Phase 3: Safety & Control | 88 | 2+ weeks |
| Phase 4: Deployment | 122 | 2+ weeks |
| **Total** | **342 hours** | **8 weeks** |

### Critical Path

1. Phase 1 must complete before Phase 2 (data aggregation required for scoring)
2. Phase 2 must complete before Phase 3 (decisions required for safety validation)
3. Phase 3 can partially overlap with Phase 4 (documentation can start early)
4. Pilot deployment requires all prior phases complete

### Risk Mitigation

- **Data Quality Issues**: Phase 1 includes extensive validation
- **Safety Concerns**: Phase 3 has comprehensive safety validation
- **Performance Issues**: Phase 2 and 4 include optimization and load testing
- **User Adoption**: Phase 4 includes training and gradual rollout

### Success Criteria

- [ ] All unit tests passing (> 90% code coverage)
- [ ] Integration tests successful with real data
- [ ] Decision latency < 200ms (average), < 500ms (p99)
- [ ] Zero safety incidents during pilot
- [ ] Traffic engineer approval for production rollout
- [ ] Performance improvements vs. baseline:
  - [ ] 20% reduction in average queue length
  - [ ] 15% increase in throughput
  - [ ] 25% reduction in maximum wait time

---

**Tasks Version**: 1.0.0
**Created**: 2025-10-29
**Status**: Draft - Ready for review
