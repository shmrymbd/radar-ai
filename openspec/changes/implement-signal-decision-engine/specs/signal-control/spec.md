# Signal Decision Engine Specification

## Overview

This specification defines requirements for an Adaptive Traffic Signal Decision Engine that automatically makes red/green signal timing decisions based on real-time radar data from all ClairWav-T80 packet types (0x01-0x05).

**Capability**: signal-control
**Version**: 2.0.0
**Status**: Draft
**Dependencies**: radar-processing, dashboard

---

## ADDED Requirements

### REQ-SD-001: Multi-Source Data Aggregation

The system SHALL aggregate data from all five ClairWav-T80 radar packet types into a unified traffic state for decision making.

**Rationale**: Holistic analysis of all available data sources produces more accurate and effective signal timing decisions than single-source analysis.

**Priority**: Critical
**Complexity**: High

#### Scenarios

##### Scenario SD-001-1: Complete Data Aggregation

```gherkin
GIVEN a device "P1-center" is actively streaming all 5 packet types
  AND ObjectData (0x01) shows 12 vehicles in lanes 11, 12, 13
  AND PassData (0x05) shows 8 crossing events in last 30 seconds
  AND TrafficData (0x03) shows average headway of 3.2 seconds
  AND LaneStatus (0x04) shows queue length 25m in lane 11
  AND RegionData (0x02) shows 35% left turns, 60% through, 5% right
WHEN the data aggregator processes current traffic state
THEN it SHALL produce an AggregatedTrafficState with all metrics populated
  AND aggregation SHALL complete within 50 milliseconds
  AND the state SHALL include per-approach data for each active lane
  AND the state SHALL include intersection-wide metrics
```

##### Scenario SD-001-2: Partial Data Availability

```gherkin
GIVEN a device "P1-center" has ObjectData and PassData available
  BUT TrafficData packets are delayed (last update 10 seconds ago)
  AND RegionData is unavailable (sensor error)
WHEN the data aggregator processes current traffic state
THEN it SHALL use cached values for TrafficData (with staleness warning)
  AND it SHALL estimate turn movements from recent PassData patterns
  AND it SHALL flag the state as "partial data quality"
  AND aggregation SHALL still complete successfully
```

##### Scenario SD-001-3: Emergency Vehicle Detection

```gherkin
GIVEN ObjectData (0x01) contains a vehicle with targetType = 12 (police car)
  AND the vehicle is in lane 11 at 50 meters from stop line
  AND the vehicle speed is 65 km/h
WHEN the data aggregator processes ObjectData
THEN it SHALL set emergencyVehiclePresent = true
  AND it SHALL set emergencyApproach = 11
  AND it SHALL calculate estimated arrival time as 2.8 seconds
  AND it SHALL prioritize this vehicle in the aggregated state
```

---

### REQ-SD-002: Multi-Factor Priority Scoring

The system SHALL calculate priority scores for each traffic approach using a configurable multi-factor algorithm that considers queue length, wait time, demand, efficiency, and safety.

**Rationale**: Multi-factor scoring balances competing objectives (throughput, fairness, safety) better than single-metric approaches.

**Priority**: Critical
**Complexity**: High

#### Scenarios

##### Scenario SD-002-1: Queue-Dominant Scoring

```gherkin
GIVEN lane 11 has queueLength = 80 meters (high)
  AND lane 11 has waitTime = 45 seconds (moderate)
  AND lane 12 has queueLength = 20 meters (low)
  AND lane 12 has waitTime = 90 seconds (high)
  AND intersection config has queueLength weight = 0.35, waitTime weight = 0.25
WHEN the scoring engine calculates priority scores
THEN lane 11 SHALL receive a higher total score than lane 12
  AND lane 11 score SHALL be approximately 65-75 (out of 100)
  AND lane 12 score SHALL be approximately 45-55 (out of 100)
  AND score breakdown SHALL show queue factor as dominant for lane 11
```

##### Scenario SD-002-2: Wait Time Starvation Prevention

```gherkin
GIVEN lane 13 has waitTime = 180 seconds (3 minutes - excessive)
  AND lane 13 has queueLength = 15 meters (short)
  AND lane 13 has only 2 vehicles waiting
  AND other lanes have moderate queues (30-40 meters)
WHEN the scoring engine calculates priority scores
THEN lane 13 SHALL receive a boosted score due to starvation prevention
  AND waitTime factor SHALL contribute 25+ points to lane 13 total score
  AND lane 13 SHALL rank in top 2 approaches for service priority
```

##### Scenario SD-002-3: Custom Weight Configuration

```gherkin
GIVEN an intersection configuration with custom weights:
  | Factor     | Weight |
  |------------|--------|
  | queueLength| 0.40   |
  | waitTime   | 0.30   |
  | demand     | 0.15   |
  | efficiency | 0.10   |
  | safety     | 0.05   |
WHEN the scoring engine is initialized with this configuration
THEN it SHALL apply these weights to all score calculations
  AND total weights SHALL sum to 1.0 (validated)
  AND score breakdown SHALL reflect custom weight distribution
```

---

### REQ-SD-003: Adaptive Phase Selection

The system SHALL select optimal signal phases based on real-time priority scores, current phase state, and safety constraints.

**Rationale**: Adaptive phase selection maximizes intersection efficiency by responding to actual traffic conditions rather than fixed timing plans.

**Priority**: Critical
**Complexity**: High

#### Scenarios

##### Scenario SD-003-1: Phase Extension on Continued Demand

```gherkin
GIVEN current phase is green for lane 11 (through movement)
  AND current phase has been active for 25 seconds
  AND lane 11 still has 8 vehicles in queue
  AND lane 11 has 5 additional vehicles approaching at 50 km/h
  AND minimum green time (5s) is satisfied
  AND maximum green time (60s) is not reached
WHEN the decision engine evaluates current phase
THEN it SHALL decide to EXTEND current phase
  AND extension SHALL be for 5 seconds (config.extensionIncrement)
  AND decision reason SHALL be "Queue remains: 8 vehicles"
  AND decision confidence SHALL be >= 0.85
```

##### Scenario SD-003-2: Phase Transition on Higher Priority

```gherkin
GIVEN current phase is green for lane 11 with score = 45
  AND current phase has been active for 30 seconds (min green satisfied)
  AND lane 12 has score = 72 (significantly higher)
  AND score delta is 27 points (> 20 point threshold)
  AND lane 12 queue has grown to 60 meters
WHEN the decision engine evaluates phase selection
THEN it SHALL decide to TRANSITION to lane 12 phase
  AND it SHALL generate a phase change command sequence:
    | Step | Action        | Duration |
    |------|---------------|----------|
    | 1    | Yellow lane 11| 4s       |
    | 2    | All-red clear | 2s       |
    | 3    | Green lane 12 | variable |
  AND decision reason SHALL cite score delta
  AND safety validation SHALL pass before execution
```

##### Scenario SD-003-3: Protected Left Turn Phase Selection

```gherkin
GIVEN lane 11 has 35% left turn movement (from RegionData)
  AND lane 11 has 12 vehicles waiting (8 left turners, 4 through)
  AND opposing lane 13 has heavy through traffic (15 vehicles)
  AND permissive left turns would create conflicts
WHEN the decision engine selects next phase for lane 11
THEN it SHALL select a "protected" phase type
  AND phase SHALL include ONLY lane 11 (no concurrent movements)
  AND phase SHALL allow safe left turns without conflicts
  AND phase duration SHALL be calculated for 8 vehicles clearance
```

---

### REQ-SD-004: Emergency Vehicle Preemption

The system SHALL immediately preempt normal signal operation to provide green signal for emergency vehicles detected in ObjectData.

**Rationale**: Emergency vehicle priority is a critical safety requirement that supersedes all other optimization objectives.

**Priority**: Critical
**Complexity**: Medium

#### Scenarios

##### Scenario SD-004-1: Immediate Emergency Preemption

```gherkin
GIVEN normal signal operation is active (lane 11 green)
  AND lane 11 is at 15 seconds into phase
  AND an emergency vehicle (targetType = 12) is detected in lane 12
  AND emergency vehicle is 80 meters from intersection
  AND emergency vehicle is traveling at 70 km/h
WHEN the decision engine detects emergency vehicle
THEN it SHALL immediately decide to PREEMPT to lane 12
  AND preemption SHALL override current phase (regardless of elapsed time)
  AND yellow + all-red clearance SHALL be provided for lane 11
  AND lane 12 SHALL receive green within 6 seconds (yellow + all-red)
  AND decision reason SHALL be "Emergency vehicle detected"
  AND decision confidence SHALL be 1.0 (maximum)
```

##### Scenario SD-004-2: Emergency Vehicle Clearance Detection

```gherkin
GIVEN emergency preemption is active for lane 12
  AND lane 12 has had green signal for 25 seconds
  AND the emergency vehicle has crossed the stop line (PassData confirms)
  AND no additional emergency vehicles are detected
WHEN the decision engine re-evaluates traffic state
THEN it SHALL exit preemption mode
  AND it SHALL resume normal adaptive control
  AND it SHALL log preemption duration and clearance time
  AND next phase SHALL be selected based on normal priority scores
```

##### Scenario SD-004-3: Multiple Emergency Vehicles

```gherkin
GIVEN an emergency vehicle is detected in lane 11 (police)
  AND emergency preemption is initiated for lane 11
  AND 10 seconds later, another emergency vehicle is detected in lane 12 (ambulance)
  AND both vehicles are approaching the intersection
WHEN the decision engine detects the second emergency vehicle
THEN it SHALL maintain preemption for lane 11 (first responder priority)
  AND it SHALL queue lane 12 for subsequent preemption
  AND it SHALL transition to lane 12 immediately after lane 11 clears
  AND it SHALL log multiple emergency event
```

---

### REQ-SD-005: Safety Validation and Constraints

The system SHALL validate all signal decisions against traffic engineering safety standards and SHALL reject any decision that violates clearance intervals, minimum times, or creates movement conflicts.

**Rationale**: Safety is paramount. No optimization objective justifies unsafe signal timing that could cause collisions.

**Priority**: Critical
**Complexity**: High

#### Scenarios

##### Scenario SD-005-1: Minimum Green Time Enforcement

```gherkin
GIVEN current phase is green for lane 11
  AND phase has been active for only 3 seconds
  AND lane 12 has extremely high priority score (95)
  AND config.minGreenTime = 5 seconds
WHEN the decision engine evaluates phase transition to lane 12
THEN it SHALL reject the transition decision
  AND it SHALL decide to HOLD current phase
  AND decision reason SHALL be "Minimum green time not met (3s < 5s)"
  AND phase SHALL continue until 5 seconds elapsed
```

##### Scenario SD-005-2: Insufficient Clearance Time

```gherkin
GIVEN current phase is green for lane 11 at 50 km/h speed limit
  AND lane 11 has a vehicle at stop line traveling 55 km/h
  AND decision engine wants to transition to conflicting lane 13
  AND calculated clearance time is 4.2 seconds
  AND available clearance (yellow + all-red) is only 4.0 seconds
WHEN the safety validator checks the transition
THEN it SHALL mark the transition as UNSAFE
  AND validation SHALL fail with reason "Insufficient clearance time (need 4.2s, have 4.0s)"
  AND decision engine SHALL HOLD current phase
  AND transition SHALL be deferred until safe
```

##### Scenario SD-005-3: Movement Conflict Detection

```gherkin
GIVEN intersection has conflicting movements:
  | Lane | Movement | Conflicts With |
  |------|----------|----------------|
  | 11   | Left     | 13 (through)   |
  | 12   | Through  | 14 (left)      |
  | 13   | Through  | 11 (left)      |
  | 14   | Left     | 12 (through)   |
  AND decision engine proposes green for lanes 11 and 13 concurrently
WHEN the safety validator checks for conflicts
THEN it SHALL detect conflict between lane 11 left and lane 13 through
  AND validation SHALL fail with reason "Conflicting movements detected: lanes 11, 13"
  AND decision SHALL be rejected
  AND decision engine SHALL select non-conflicting phase
```

##### Scenario SD-005-4: Maximum Green Time Limit

```gherkin
GIVEN current phase is green for lane 11
  AND phase has been active for 60 seconds (config.maxGreenTime)
  AND lane 11 still has 15 vehicles in queue
  AND no higher priority approach exists
WHEN the decision engine evaluates phase at 60 seconds
THEN it SHALL decide to TRANSITION despite continued demand
  AND decision reason SHALL be "Maximum green time reached"
  AND this enforces fairness to other approaches
  AND lane 11 SHALL be eligible for service again in next cycle
```

---

### REQ-SD-006: Real-time Decision Execution

The system SHALL execute signal decisions with sub-200ms latency from data update to signal command generation, maintaining continuous decision loop operation.

**Rationale**: Traffic conditions change rapidly. Decision latency must be minimal for effective adaptive control.

**Priority**: High
**Complexity**: Medium

#### Scenarios

##### Scenario SD-006-1: Normal Decision Cycle Performance

```gherkin
GIVEN new PassData arrives in Redis at timestamp T0
  AND keyspace notification triggers data aggregator at T0 + 5ms
  AND aggregation completes at T0 + 50ms
  AND scoring completes at T0 + 60ms
  AND decision logic completes at T0 + 75ms
  AND safety validation completes at T0 + 90ms
  AND command generation completes at T0 + 100ms
WHEN the full decision cycle executes
THEN total latency SHALL be <= 200ms (T0 + 100ms target)
  AND each stage SHALL log its execution time
  AND performance metrics SHALL be recorded for monitoring
```

##### Scenario SD-006-2: Degraded Performance Detection

```gherkin
GIVEN the decision engine is monitoring its own performance
  AND last 10 decision cycles averaged 180ms latency
  AND current cycle takes 450ms (Redis slow query)
  AND latency exceeds 500ms critical threshold
WHEN the performance monitor detects degradation
THEN it SHALL log a performance warning
  AND it SHALL include timing breakdown by stage
  AND it SHALL alert operators if degradation persists (3+ cycles)
  AND system SHALL continue operation (no failure)
```

##### Scenario SD-006-3: Continuous Decision Loop

```gherkin
GIVEN the decision engine is running in production mode
  AND data aggregator is subscribed to Redis pub/sub
  AND update frequency is approximately 10 Hz (every 100ms)
WHEN new data arrives continuously
THEN the decision engine SHALL evaluate state every 100ms
  AND it SHALL make decision (HOLD, EXTEND, or TRANSITION) each cycle
  AND it SHALL maintain decision history for last 1000 cycles
  AND it SHALL provide real-time status via WebSocket channel
```

---

### REQ-SD-007: Configuration Management

The system SHALL support per-intersection configuration of scoring weights, safety constraints, and phase timing parameters, with hot-reload capability and validation.

**Rationale**: Different intersections have different characteristics (geometry, traffic patterns, priorities). Configuration flexibility is essential.

**Priority**: High
**Complexity**: Medium

#### Scenarios

##### Scenario SD-007-1: Load Intersection Configuration

```gherkin
GIVEN a device "P1-center" is starting up
  AND MongoDB lane_config collection contains config for "P1-center":
    ```json
    {
      "deviceId": "P1-center",
      "decisionConfig": {
        "maxQueueLength": 100,
        "maxWaitTime": 120,
        "expectedFlowRate": 800,
        "minGreenTime": 5,
        "maxGreenTime": 60,
        "extensionIncrement": 3,
        "weights": {
          "queueLength": 0.35,
          "waitTime": 0.25,
          "demand": 0.20,
          "efficiency": 0.15,
          "safety": 0.05
        }
      }
    }
    ```
WHEN the decision engine initializes
THEN it SHALL load configuration from MongoDB
  AND it SHALL validate all parameters (weights sum to 1.0, times positive)
  AND it SHALL apply configuration to scoring and decision logic
  AND it SHALL log "Configuration loaded for P1-center"
```

##### Scenario SD-007-2: Hot-Reload Configuration Change

```gherkin
GIVEN the decision engine is running with current config
  AND a traffic engineer updates config in MongoDB (increase minGreenTime 5s → 7s)
  AND engineer triggers hot-reload via API: POST /api/signal-control/config/reload
WHEN the decision engine receives reload command
THEN it SHALL fetch updated config from MongoDB
  AND it SHALL validate updated parameters
  AND it SHALL apply new config without service interruption
  AND it SHALL log "Configuration reloaded: minGreenTime 5→7"
  AND next decision SHALL use new minGreenTime value
```

##### Scenario SD-007-3: Invalid Configuration Rejection

```gherkin
GIVEN an administrator attempts to update config via API
  AND the new configuration has invalid weights:
    ```json
    {
      "weights": {
        "queueLength": 0.40,
        "waitTime": 0.30,
        "demand": 0.20,
        "efficiency": 0.15,
        "safety": 0.10
      }
    }
    ```
  AND weights sum to 1.15 (> 1.0, invalid)
WHEN the configuration service validates the update
THEN it SHALL reject the configuration
  AND it SHALL return HTTP 400 with error: "Invalid weights: sum = 1.15, must be 1.0"
  AND current configuration SHALL remain unchanged
  AND decision engine SHALL continue with previous valid config
```

---

### REQ-SD-008: Audit Logging and Monitoring

The system SHALL log all decisions, score calculations, and safety validations to MongoDB for audit trail, performance analysis, and troubleshooting.

**Rationale**: Complete audit trail is essential for legal compliance, performance optimization, and incident investigation.

**Priority**: High
**Complexity**: Low

#### Scenarios

##### Scenario SD-008-1: Decision Audit Logging

```gherkin
GIVEN the decision engine makes a TRANSITION decision at timestamp T
  AND decision transitions from lane 11 to lane 12 phase
  AND decision was triggered by score delta of 28 points
  AND safety validation passed with 4.5s clearance calculated
WHEN the signal controller executes the decision
THEN it SHALL insert audit record to MongoDB signal_decisions collection:
    ```json
    {
      "timestamp": T,
      "deviceId": "P1-center",
      "decision": {
        "action": "TRANSITION",
        "fromPhase": {"activeApproaches": [11], "type": "protected"},
        "toPhase": {"activeApproaches": [12], "type": "permissive"},
        "reason": "Higher priority approach (score 72 vs 44)",
        "confidence": 0.80,
        "validatedSafe": true
      },
      "scores": {
        "11": 44,
        "12": 72,
        "13": 38
      },
      "safetyCheck": {
        "conflicts": [],
        "clearanceRequired": 4.5,
        "clearanceProvided": 5.0
      },
      "executionTime": 95
    }
    ```
  AND record SHALL be indexed by timestamp and deviceId
```

##### Scenario SD-008-2: Performance Metrics Logging

```gherkin
GIVEN the decision engine completes 100 decision cycles
  AND average latency is 145ms
  AND p95 latency is 210ms
  AND p99 latency is 380ms
  AND 3 cycles exceeded 500ms threshold
WHEN the metrics aggregator compiles hourly statistics
THEN it SHALL insert performance record to MongoDB signal_performance collection:
    ```json
    {
      "timestamp": "2025-10-29T14:00:00Z",
      "deviceId": "P1-center",
      "cycleCount": 100,
      "latency": {
        "average": 145,
        "p50": 140,
        "p95": 210,
        "p99": 380,
        "violations": 3
      },
      "decisions": {
        "HOLD": 45,
        "EXTEND": 30,
        "TRANSITION": 24,
        "PREEMPT": 1
      }
    }
    ```
  AND metrics SHALL be used for performance dashboards
```

##### Scenario SD-008-3: Safety Violation Logging

```gherkin
GIVEN a decision is proposed that fails safety validation
  AND validation fails due to insufficient clearance (need 5.2s, have 5.0s)
  AND decision is rejected and HOLD is used instead
WHEN the safety validator rejects the decision
THEN it SHALL log safety violation to MongoDB signal_safety_events collection:
    ```json
    {
      "timestamp": T,
      "deviceId": "P1-center",
      "violationType": "INSUFFICIENT_CLEARANCE",
      "severity": "WARNING",
      "details": {
        "proposedTransition": {"from": 11, "to": 13},
        "clearanceRequired": 5.2,
        "clearanceAvailable": 5.0,
        "reason": "Vehicle at stop line traveling 60 km/h"
      },
      "actionTaken": "DECISION_REJECTED_HOLD"
    }
    ```
  AND high-severity violations SHALL trigger alerts
```

---

### REQ-SD-009: Manual Override and Control

The system SHALL provide manual override capability allowing traffic engineers to disable automation, manually select phases, or implement emergency stop procedures.

**Rationale**: Human operators must retain ultimate control for safety, special events, construction, or system testing.

**Priority**: High
**Complexity**: Medium

#### Scenarios

##### Scenario SD-009-1: Disable Automated Control

```gherkin
GIVEN the decision engine is running in automated mode
  AND a traffic engineer needs to take manual control (e.g., special event)
  AND engineer sends POST /api/signal-control/manual-override:
    ```json
    {
      "deviceId": "P1-center",
      "action": "DISABLE_AUTOMATION",
      "reason": "Marathon event - manual control needed",
      "operator": "engineer@traffic.city.gov"
    }
    ```
WHEN the signal controller processes override request
THEN it SHALL disable automated decision making
  AND it SHALL hold current phase (no further transitions)
  AND it SHALL log override event to audit trail
  AND it SHALL display "MANUAL CONTROL ACTIVE" status
  AND it SHALL wait for manual phase selection commands
```

##### Scenario SD-009-2: Manual Phase Selection

```gherkin
GIVEN automated control is disabled (manual mode active)
  AND current phase is green for lane 11
  AND traffic engineer wants to switch to lane 12
  AND engineer sends POST /api/signal-control/manual-phase:
    ```json
    {
      "deviceId": "P1-center",
      "phase": {"activeApproaches": [12], "type": "protected"},
      "duration": 45
    }
    ```
WHEN the signal controller processes manual phase command
THEN it SHALL validate the phase is safe (no conflicts)
  AND it SHALL execute yellow + all-red clearance for lane 11
  AND it SHALL activate green for lane 12
  AND it SHALL maintain lane 12 green for 45 seconds (fixed time)
  AND it SHALL log "Manual phase selection: lane 12, 45s"
```

##### Scenario SD-009-3: Resume Automated Control

```gherkin
GIVEN the system is in manual control mode
  AND special event has concluded
  AND traffic engineer wants to resume automation
  AND engineer sends POST /api/signal-control/manual-override:
    ```json
    {
      "deviceId": "P1-center",
      "action": "RESUME_AUTOMATION",
      "operator": "engineer@traffic.city.gov"
    }
    ```
WHEN the signal controller processes resume request
THEN it SHALL re-enable automated decision making
  AND it SHALL resume normal decision cycle immediately
  AND it SHALL log "Automation resumed by engineer@traffic.city.gov"
  AND it SHALL display "AUTOMATED CONTROL ACTIVE" status
  AND next decision SHALL be based on current traffic state
```

---

## MODIFIED Requirements

### REQ-SC-001: Signal Timing Optimization

> **Original**: The system SHALL optimize signal timing based on real-time queue detection and traffic flow analysis.

**Updated**: The system SHALL optimize signal timing using the Adaptive Signal Decision Engine, which integrates queue detection, traffic flow analysis, wait time monitoring, and multi-factor priority scoring from all radar data types (0x01-0x05).

**Changes**:
- Add integration with new Decision Engine (REQ-SD-003)
- Require multi-source data aggregation (REQ-SD-001)
- Apply multi-factor scoring algorithm (REQ-SD-002)

**Impact**: Low - Enhances existing functionality, backward compatible

#### Scenarios

##### Scenario SC-001-1: Queue-Based Optimization (Enhanced)

```gherkin
GIVEN lane 11 has queue length 75 meters (from LaneStatus 0x04)
  AND lane 11 has 18 vehicles waiting (from ObjectData 0x01)
  AND lane 11 has wait time 95 seconds (from PassData 0x05 analysis)
  AND other lanes have moderate queues (30-40 meters)
  AND decision engine calculates lane 11 priority score = 78
WHEN the signal timing optimizer evaluates optimal timing
THEN it SHALL prioritize lane 11 for next green phase
  AND it SHALL calculate optimal green duration as 35 seconds (18 vehicles * 2s headway)
  AND optimization SHALL consider all data sources holistically
```

---

### REQ-SC-003: Signal Control Interface

> **Original**: The system SHALL provide an interface for traffic engineers to manually override automated control when necessary.

**Updated**: The system SHALL provide comprehensive manual control interface (REQ-SD-009) with automation enable/disable, manual phase selection, emergency stop, and audit logging of all operator actions.

**Changes**:
- Add structured API endpoints for override control
- Require audit logging of all manual interventions
- Add safety validation even for manual commands

**Impact**: Medium - Adds new API endpoints, enhances safety

---

## Integration Requirements

### INT-SD-001: Redis Integration

The Decision Engine SHALL integrate with existing Redis infrastructure using the `getRedisClient()` pattern for all data access.

**Scenarios**:

```gherkin
GIVEN the DataAggregator needs to fetch PassData
WHEN it calls `await redis.lRange('P1-center/passdata', -100, -1)'
THEN it SHALL use connection from getRedisClient() (never direct connection)
  AND it SHALL handle connection errors gracefully
  AND it SHALL log Redis access errors for monitoring
```

### INT-SD-002: MongoDB Integration

The Decision Engine SHALL store audit logs, configuration, and performance metrics in MongoDB using existing connection patterns.

**Collections**:
- `signal_decisions` - Decision audit trail
- `signal_performance` - Performance metrics
- `signal_safety_events` - Safety violations
- `lane_config` - Decision engine configuration (enhanced with decisionConfig field)

### INT-SD-003: WebSocket Integration

The Decision Engine SHALL broadcast real-time decision updates via new 'signal-control' WebSocket channel.

**Message Format**:
```json
{
  "type": "signal_decision",
  "channel": "signal-control",
  "deviceId": "P1-center",
  "timestamp": 1730217600000,
  "decision": {
    "action": "TRANSITION",
    "phase": {"activeApproaches": [12], "type": "protected"},
    "reason": "Higher priority (score 72)",
    "confidence": 0.80
  },
  "scores": {"11": 44, "12": 72, "13": 38}
}
```

---

## Performance Requirements

### PERF-SD-001: Decision Latency

- **Average Latency**: < 200ms (data arrival → command generation)
- **P95 Latency**: < 350ms
- **P99 Latency**: < 500ms
- **Critical Threshold**: 500ms (violations logged and alerted)

### PERF-SD-002: Resource Usage

- **Memory**: < 250MB per device
- **CPU**: < 30% average, < 50% peak (per core)
- **Network**: < 100 KB/s per device (Redis + MongoDB)

### PERF-SD-003: Scalability

- Support at least 10 devices simultaneously on single instance
- Handle 100+ vehicles per intersection without degradation
- Maintain performance over 24+ hour continuous operation

---

## Safety Requirements

### SAFE-SD-001: Minimum Clearance Intervals

ALL signal transitions MUST provide adequate clearance:
- Yellow interval: Based on speed limit (3-6 seconds typical)
- All-red interval: Minimum 1 second, calculated from intersection size
- Total clearance: MUST exceed calculated vehicle clearance time

### SAFE-SD-002: Movement Conflict Prevention

The system MUST prevent conflicting movements (e.g., opposing left turns) from receiving concurrent green signals.

### SAFE-SD-003: Fail-Safe Operation

On system failure or error:
1. Log error with full context
2. Transition to safe state (all-red or fixed-time plan)
3. Alert operators immediately
4. Disable automation until error resolved

---

## Testing Requirements

### TEST-SD-001: Unit Test Coverage

- Minimum 90% code coverage for all decision engine components
- 100% coverage for safety validator
- Test all scenarios defined in requirements

### TEST-SD-002: Integration Testing

- Test with real Redis data from all 5 packet types
- Test MongoDB audit logging persistence
- Test WebSocket broadcast functionality
- Verify performance under realistic traffic volumes

### TEST-SD-003: Safety Testing

- Validate all safety constraint enforcement
- Test conflict detection with all movement combinations
- Verify emergency preemption override
- Test fail-safe behavior on component failures

---

**Specification Version**: 2.0.0
**Created**: 2025-10-29
**Status**: Draft - Ready for validation
**Authors**: Claude Code AI Agent

---

## Changelog

### Version 2.0.0 (2025-10-29)

- ADDED 9 new requirements for Signal Decision Engine (REQ-SD-001 through REQ-SD-009)
- MODIFIED 2 existing signal-control requirements (REQ-SC-001, REQ-SC-003)
- Added comprehensive scenarios using GIVEN-WHEN-THEN format
- Defined integration requirements with Redis, MongoDB, WebSocket
- Specified performance, safety, and testing requirements
- Total: 35+ scenarios across all requirements
