# Adaptive Traffic Signal Decision Engine - Design Document

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Design](#component-design)
3. [Data Flow](#data-flow)
4. [Decision Algorithm](#decision-algorithm)
5. [Safety Validation](#safety-validation)
6. [Integration Points](#integration-points)
7. [Performance Considerations](#performance-considerations)
8. [Error Handling](#error-handling)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ClairWav-T80 Radar System                     │
│  ObjectData │ RegionData │ TrafficData │ LaneStatus │ PassData  │
│    (0x01)   │   (0x02)   │   (0x03)    │   (0x04)   │  (0x05)   │
└──────┬──────┴──────┬─────┴──────┬──────┴──────┬─────┴──────┬────┘
       │             │            │             │            │
       └─────────────┴────────────┴─────────────┴────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Redis Pub/Sub       │
                    │  • List Storage         │
                    │  • Keyspace Notifs      │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼────────┐    ┌─────────▼──────────┐    ┌───────▼───────┐
│ Data Collector │    │ Historical Storage │    │ Real-time Mon │
│   Subscribers  │    │     (MongoDB)      │    │  (WebSocket)  │
└───────┬────────┘    └────────────────────┘    └───────────────┘
        │
        │ Aggregated Data
        │
┌───────▼─────────────────────────────────────────────────────────┐
│              Signal Decision Engine Core                         │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Data Aggregator │  │ Scoring Engine  │  │ Decision Logic  │ │
│  │                 │  │                 │  │                 │ │
│  │ • Normalize     │  │ • Queue Factor  │  │ • Phase Select  │ │
│  │ • Validate      │  │ • Wait Factor   │  │ • Timing Calc   │ │
│  │ • Cache         │  │ • Demand Factor │  │ • Emergency     │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │          │
│           └────────────────────┼────────────────────┘          │
│                                │                                │
│                    ┌───────────▼───────────┐                    │
│                    │  Safety Validator     │                    │
│                    │                       │                    │
│                    │ • Min/Max Times       │                    │
│                    │ • Clearance Intervals │                    │
│                    │ • Conflict Detection  │                    │
│                    └───────────┬───────────┘                    │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Signal Controller     │
                    │   Interface             │
                    │                         │
                    │ • Command Generation    │
                    │ • State Management      │
                    │ • Audit Logging         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Physical Signal        │
                    │  Controller Hardware    │
                    └─────────────────────────┘
```

---

## Component Design

### 1. Data Aggregator

**Purpose**: Collect and normalize data from all 5 radar packet types into a unified traffic state.

**TypeScript Interface**:
```typescript
interface IDataAggregator {
  /**
   * Aggregate latest data from all sources for a device
   * @param deviceId Device identifier (e.g., 'P1-center')
   * @param lookbackMs Time window to consider (default: 5000ms)
   * @returns Aggregated traffic state
   */
  aggregateTrafficState(
    deviceId: string,
    lookbackMs?: number
  ): Promise<AggregatedTrafficState>;

  /**
   * Subscribe to real-time data updates
   * @param deviceId Device to monitor
   * @param callback Function to call on new data
   */
  subscribeToUpdates(
    deviceId: string,
    callback: (state: AggregatedTrafficState) => void
  ): void;
}

interface AggregatedTrafficState {
  timestamp: number;
  deviceId: string;

  // Per-approach data
  approaches: Map<number, ApproachState>;

  // Intersection-wide metrics
  totalVehicles: number;
  averageSpeed: number;
  congestionLevel: 'low' | 'medium' | 'high';

  // Emergency status
  emergencyVehiclePresent: boolean;
  emergencyApproach?: number;
}

interface ApproachState {
  laneNumber: number;
  direction: 'incoming' | 'outgoing';

  // From LaneStatus (0x04)
  queueLength: number;          // meters
  queueVehicles: number;        // count
  occupancyRate: number;        // 0-100%

  // From PassData (0x05) analysis
  waitTime: number;             // seconds (oldest vehicle)
  crossingRate: number;         // vehicles/minute
  lastCrossingTime: number;     // timestamp

  // From ObjectData (0x01)
  trackedVehicles: VehicleInfo[];
  approachSpeed: number;        // km/h average
  vehicleTypes: VehicleTypeCount;

  // From TrafficData (0x03)
  headwayAverage: number;       // seconds
  flowRate: number;             // vehicles/hour
  densityLevel: number;         // vehicles/km

  // From RegionData (0x02)
  turnMovements: {
    left: number;               // percentage
    through: number;            // percentage
    right: number;              // percentage
  };
}

interface VehicleInfo {
  targetId: number;
  targetType: number;
  vehicleType: string;
  position: { x: number; y: number; z: number };
  speed: number;
  distanceToStopLine: number;
  estimatedArrivalTime: number;
  isEmergency: boolean;
}
```

**Implementation Details**:
```typescript
class DataAggregator implements IDataAggregator {
  private redis: RedisClient;
  private dataCache: Map<string, AggregatedTrafficState>;
  private updateInterval: number = 100; // ms

  async aggregateTrafficState(
    deviceId: string,
    lookbackMs: number = 5000
  ): Promise<AggregatedTrafficState> {
    const now = Date.now();
    const since = now - lookbackMs;

    // Fetch data from Redis in parallel
    const [objectData, passData, trafficData, laneStatus, regionData] =
      await Promise.all([
        this.getObjectData(deviceId, since),
        this.getPassData(deviceId, since),
        this.getTrafficData(deviceId, since),
        this.getLaneStatus(deviceId),
        this.getRegionData(deviceId)
      ]);

    // Group by lane/approach
    const approaches = new Map<number, ApproachState>();

    // Process each data type
    this.processLaneStatus(approaches, laneStatus);
    this.processPassData(approaches, passData, now);
    this.processObjectData(approaches, objectData);
    this.processTrafficData(approaches, trafficData);
    this.processRegionData(approaches, regionData);

    // Detect emergencies
    const { emergencyPresent, emergencyApproach } =
      this.detectEmergencyVehicles(objectData);

    // Calculate intersection-wide metrics
    const totalVehicles = Array.from(approaches.values())
      .reduce((sum, a) => sum + a.trackedVehicles.length, 0);

    const averageSpeed = this.calculateAverageSpeed(approaches);
    const congestionLevel = this.assessCongestion(approaches);

    return {
      timestamp: now,
      deviceId,
      approaches,
      totalVehicles,
      averageSpeed,
      congestionLevel,
      emergencyVehiclePresent: emergencyPresent,
      emergencyApproach
    };
  }

  private processLaneStatus(
    approaches: Map<number, ApproachState>,
    laneStatus: LaneStatus[]
  ): void {
    for (const lane of laneStatus) {
      if (!approaches.has(lane.laneNumber)) {
        approaches.set(lane.laneNumber, this.createEmptyApproach(lane.laneNumber));
      }

      const approach = approaches.get(lane.laneNumber)!;
      approach.queueLength = lane.queueLength;
      approach.queueVehicles = lane.vehicleCount;
      approach.occupancyRate = lane.occupancy;
    }
  }

  private processPassData(
    approaches: Map<number, ApproachState>,
    passData: PassData[],
    now: number
  ): void {
    // Group by lane
    const byLane = new Map<number, PassData[]>();
    for (const pass of passData) {
      if (!byLane.has(pass.laneNumber)) {
        byLane.set(pass.laneNumber, []);
      }
      byLane.get(pass.laneNumber)!.push(pass);
    }

    // Calculate wait times and crossing rates
    for (const [laneNumber, passes] of byLane) {
      if (!approaches.has(laneNumber)) continue;

      const approach = approaches.get(laneNumber)!;

      // Find oldest vehicle still waiting
      const sortedByTime = passes.sort((a, b) =>
        a.passing.time - b.passing.time
      );

      if (sortedByTime.length > 0) {
        const oldestTime = sortedByTime[0].passing.time;
        approach.waitTime = (now - oldestTime) / 1000; // to seconds
        approach.lastCrossingTime = sortedByTime[sortedByTime.length - 1].passing.time;
      }

      // Crossing rate (vehicles per minute)
      const timeSpanMinutes = (
        sortedByTime[sortedByTime.length - 1].passing.time -
        sortedByTime[0].passing.time
      ) / 60000;

      approach.crossingRate = timeSpanMinutes > 0
        ? passes.length / timeSpanMinutes
        : 0;
    }
  }

  private detectEmergencyVehicles(
    objectData: ObjectData[]
  ): { emergencyPresent: boolean; emergencyApproach?: number } {
    // Emergency vehicle types (based on ClairWav protocol)
    const EMERGENCY_TYPES = [12]; // Police car

    for (const obj of objectData) {
      if (EMERGENCY_TYPES.includes(obj.targetType)) {
        return {
          emergencyPresent: true,
          emergencyApproach: obj.laneNo
        };
      }
    }

    return { emergencyPresent: false };
  }
}
```

### 2. Scoring Engine

**Purpose**: Calculate priority scores for each approach based on multi-factor analysis.

**TypeScript Interface**:
```typescript
interface IScoringEngine {
  /**
   * Calculate priority score for an approach
   * @param approach Current approach state
   * @param config Intersection-specific configuration
   * @returns Score from 0-100 (higher = more priority)
   */
  calculateScore(
    approach: ApproachState,
    config: IntersectionConfig
  ): number;

  /**
   * Get detailed score breakdown for debugging
   */
  getScoreBreakdown(
    approach: ApproachState,
    config: IntersectionConfig
  ): ScoreBreakdown;
}

interface ScoreBreakdown {
  totalScore: number;
  factors: {
    queueLength: { score: number; weight: number; value: number };
    waitTime: { score: number; weight: number; value: number };
    demand: { score: number; weight: number; value: number };
    efficiency: { score: number; weight: number; value: number };
    safety: { score: number; weight: number; value: number };
  };
}

interface IntersectionConfig {
  maxQueueLength: number;        // meters
  maxWaitTime: number;            // seconds
  expectedFlowRate: number;       // vehicles/hour
  weights: {
    queueLength: number;          // 0-1 (default: 0.35)
    waitTime: number;             // 0-1 (default: 0.25)
    demand: number;               // 0-1 (default: 0.20)
    efficiency: number;           // 0-1 (default: 0.15)
    safety: number;               // 0-1 (default: 0.05)
  };
}
```

**Implementation Details**:
```typescript
class ScoringEngine implements IScoringEngine {
  calculateScore(
    approach: ApproachState,
    config: IntersectionConfig
  ): number {
    const breakdown = this.getScoreBreakdown(approach, config);
    return breakdown.totalScore;
  }

  getScoreBreakdown(
    approach: ApproachState,
    config: IntersectionConfig
  ): ScoreBreakdown {
    // 1. Queue Length Factor (0-100)
    const queueScore = Math.min(
      100,
      (approach.queueLength / config.maxQueueLength) * 100
    );

    // 2. Wait Time Factor (0-100)
    const waitScore = Math.min(
      100,
      (approach.waitTime / config.maxWaitTime) * 100
    );

    // 3. Demand Factor (0-100)
    // Based on vehicle count and arrival rate
    const demandScore = Math.min(
      100,
      (
        (approach.queueVehicles * 50) +
        (approach.trackedVehicles.length * 25) +
        ((approach.flowRate / config.expectedFlowRate) * 25)
      )
    );

    // 4. Efficiency Factor (0-100)
    // Rewards good flow, penalizes congestion
    const efficiencyScore = Math.max(
      0,
      100 - approach.occupancyRate
    ) * (approach.crossingRate / 60); // Scale by actual throughput

    // 5. Safety Factor (0-100)
    // Penalizes high speeds, rewards pedestrian presence
    const speedPenalty = approach.approachSpeed > config.speedLimit
      ? 50
      : 0;
    const safetyScore = 100 - speedPenalty;

    // Calculate weighted total
    const totalScore = (
      queueScore * config.weights.queueLength +
      waitScore * config.weights.waitTime +
      demandScore * config.weights.demand +
      efficiencyScore * config.weights.efficiency +
      safetyScore * config.weights.safety
    );

    return {
      totalScore: Math.round(totalScore),
      factors: {
        queueLength: {
          score: queueScore,
          weight: config.weights.queueLength,
          value: approach.queueLength
        },
        waitTime: {
          score: waitScore,
          weight: config.weights.waitTime,
          value: approach.waitTime
        },
        demand: {
          score: demandScore,
          weight: config.weights.demand,
          value: approach.queueVehicles
        },
        efficiency: {
          score: efficiencyScore,
          weight: config.weights.efficiency,
          value: approach.crossingRate
        },
        safety: {
          score: safetyScore,
          weight: config.weights.safety,
          value: approach.approachSpeed
        }
      }
    };
  }
}
```

### 3. Decision Logic

**Purpose**: Translate priority scores into signal phase commands.

**TypeScript Interface**:
```typescript
interface IDecisionEngine {
  /**
   * Make signal decision based on current traffic state
   * @param state Aggregated traffic state
   * @param currentPhase Current signal phase
   * @param phaseElapsed Seconds current phase has been active
   * @returns Signal command decision
   */
  makeDecision(
    state: AggregatedTrafficState,
    currentPhase: SignalPhase,
    phaseElapsed: number
  ): SignalDecision;
}

interface SignalPhase {
  activeApproaches: number[];    // Lane numbers with green
  type: 'protected' | 'permissive' | 'protected-permissive';
  startTime: number;             // timestamp
}

interface SignalDecision {
  action: 'EXTEND' | 'TRANSITION' | 'HOLD' | 'PREEMPT';
  nextPhase?: SignalPhase;
  duration?: number;             // seconds
  reason: string;
  confidence: number;            // 0-1
  validatedSafe: boolean;
}
```

**Implementation Details**:
```typescript
class DecisionEngine implements IDecisionEngine {
  private scoringEngine: IScoringEngine;
  private safetyValidator: ISafetyValidator;
  private config: IntersectionConfig;

  makeDecision(
    state: AggregatedTrafficState,
    currentPhase: SignalPhase,
    phaseElapsed: number
  ): SignalDecision {
    // 1. Check for emergency preemption
    if (state.emergencyVehiclePresent) {
      return this.createPreemptionDecision(
        state.emergencyApproach!,
        currentPhase
      );
    }

    // 2. Check minimum green time constraint
    if (phaseElapsed < this.config.minGreenTime) {
      return {
        action: 'HOLD',
        reason: `Minimum green time not met (${phaseElapsed}s < ${this.config.minGreenTime}s)`,
        confidence: 1.0,
        validatedSafe: true
      };
    }

    // 3. Calculate scores for all approaches
    const scores = new Map<number, number>();
    for (const [laneNumber, approach] of state.approaches) {
      scores.set(
        laneNumber,
        this.scoringEngine.calculateScore(approach, this.config)
      );
    }

    // 4. Find highest priority approach
    const currentScore = this.getCurrentPhaseScore(
      currentPhase.activeApproaches,
      scores
    );

    const { bestApproach, bestScore } = this.findBestApproach(scores);

    // 5. Decide: extend, hold, or transition
    if (currentPhase.activeApproaches.includes(bestApproach)) {
      // Current phase is still best
      if (phaseElapsed >= this.config.maxGreenTime) {
        return {
          action: 'TRANSITION',
          nextPhase: this.selectNextPhase(state, scores, bestApproach),
          reason: 'Maximum green time reached',
          confidence: 0.9,
          validatedSafe: true
        };
      }

      // Extend if demand remains
      const approach = state.approaches.get(bestApproach)!;
      if (approach.queueVehicles > 0 || approach.trackedVehicles.length > 3) {
        return {
          action: 'EXTEND',
          duration: this.config.extensionIncrement,
          reason: `Queue remains: ${approach.queueVehicles} vehicles`,
          confidence: 0.85,
          validatedSafe: true
        };
      }

      return {
        action: 'HOLD',
        reason: 'Current phase optimal, no demand',
        confidence: 0.7,
        validatedSafe: true
      };
    }

    // 6. Different approach has higher priority
    const scoreDelta = bestScore - currentScore;
    const transitionThreshold = 20; // Require significant improvement

    if (scoreDelta >= transitionThreshold) {
      const nextPhase = this.selectNextPhase(state, scores, bestApproach);

      // Validate safety
      const safetyCheck = this.safetyValidator.validateTransition(
        currentPhase,
        nextPhase,
        state
      );

      if (safetyCheck.safe) {
        return {
          action: 'TRANSITION',
          nextPhase,
          reason: `Higher priority approach (score ${bestScore} vs ${currentScore})`,
          confidence: 0.8,
          validatedSafe: true
        };
      } else {
        return {
          action: 'HOLD',
          reason: `Safety check failed: ${safetyCheck.reason}`,
          confidence: 0.5,
          validatedSafe: false
        };
      }
    }

    // 7. Default: hold current phase
    return {
      action: 'HOLD',
      reason: 'Current phase acceptable',
      confidence: 0.6,
      validatedSafe: true
    };
  }

  private createPreemptionDecision(
    emergencyApproach: number,
    currentPhase: SignalPhase
  ): SignalDecision {
    return {
      action: 'PREEMPT',
      nextPhase: {
        activeApproaches: [emergencyApproach],
        type: 'protected',
        startTime: Date.now()
      },
      reason: 'Emergency vehicle detected',
      confidence: 1.0,
      validatedSafe: true
    };
  }

  private selectNextPhase(
    state: AggregatedTrafficState,
    scores: Map<number, number>,
    primaryApproach: number
  ): SignalPhase {
    // Check if protected turn phase needed
    const approach = state.approaches.get(primaryApproach)!;
    const leftTurnPercentage = approach.turnMovements.left;

    if (leftTurnPercentage > 30) {
      // Need protected left turn phase
      return {
        activeApproaches: [primaryApproach],
        type: 'protected',
        startTime: Date.now()
      };
    }

    // Find compatible approaches (can run concurrently)
    const compatibleApproaches = this.findCompatibleApproaches(
      primaryApproach,
      scores,
      state
    );

    return {
      activeApproaches: [primaryApproach, ...compatibleApproaches],
      type: compatibleApproaches.length > 0 ? 'protected-permissive' : 'permissive',
      startTime: Date.now()
    };
  }
}
```

### 4. Safety Validator

**Purpose**: Ensure all decisions comply with traffic engineering safety standards.

**TypeScript Interface**:
```typescript
interface ISafetyValidator {
  /**
   * Validate a phase transition is safe
   * @param currentPhase Active phase
   * @param nextPhase Proposed phase
   * @param state Current traffic state
   * @returns Safety validation result
   */
  validateTransition(
    currentPhase: SignalPhase,
    nextPhase: SignalPhase,
    state: AggregatedTrafficState
  ): SafetyValidation;

  /**
   * Calculate required clearance time
   * @param approach Approach to clear
   * @returns Clearance time in seconds
   */
  calculateClearanceTime(approach: ApproachState): number;
}

interface SafetyValidation {
  safe: boolean;
  reason?: string;
  requiredClearance?: number;
  conflicts?: number[];
}

interface SafetyConstraints {
  minGreenTime: number;          // 5 seconds typical
  maxGreenTime: number;          // 60 seconds typical
  yellowTime: number;            // 3-5 seconds based on speed
  allRedTime: number;            // 1-2 seconds clearance
  minPedestrianTime: number;     // 7 seconds minimum
  extensionIncrement: number;    // 2-5 seconds per extension
}
```

**Implementation Details**:
```typescript
class SafetyValidator implements ISafetyValidator {
  private constraints: SafetyConstraints;
  private conflictMatrix: Map<number, number[]>; // lane → conflicting lanes

  validateTransition(
    currentPhase: SignalPhase,
    nextPhase: SignalPhase,
    state: AggregatedTrafficState
  ): SafetyValidation {
    // 1. Check for conflicting movements
    const conflicts = this.detectConflicts(
      currentPhase.activeApproaches,
      nextPhase.activeApproaches
    );

    if (conflicts.length > 0) {
      return {
        safe: false,
        reason: `Conflicting movements detected: lanes ${conflicts.join(', ')}`,
        conflicts
      };
    }

    // 2. Calculate required clearance time
    let maxClearanceNeeded = 0;
    for (const laneNumber of currentPhase.activeApproaches) {
      const approach = state.approaches.get(laneNumber);
      if (!approach) continue;

      const clearance = this.calculateClearanceTime(approach);
      maxClearanceNeeded = Math.max(maxClearanceNeeded, clearance);
    }

    // 3. Ensure yellow + all-red time is sufficient
    const totalClearanceProvided =
      this.constraints.yellowTime + this.constraints.allRedTime;

    if (maxClearanceNeeded > totalClearanceProvided) {
      return {
        safe: false,
        reason: `Insufficient clearance time (need ${maxClearanceNeeded}s, have ${totalClearanceProvided}s)`,
        requiredClearance: maxClearanceNeeded
      };
    }

    // 4. Check pedestrian conflicts
    const pedestrianCheck = this.validatePedestrianClearance(
      currentPhase,
      nextPhase,
      state
    );

    if (!pedestrianCheck.safe) {
      return pedestrianCheck;
    }

    return {
      safe: true,
      requiredClearance: maxClearanceNeeded
    };
  }

  calculateClearanceTime(approach: ApproachState): number {
    // Formula: time = (distance + vehicleLength) / speed
    // Use maximum vehicle in queue
    const maxDistance = approach.queueLength;
    const averageVehicleLength = 5; // meters
    const speedMps = approach.approachSpeed / 3.6; // km/h to m/s

    if (speedMps === 0) return 0;

    const clearanceTime = (maxDistance + averageVehicleLength) / speedMps;

    // Add safety buffer
    return Math.ceil(clearanceTime * 1.2);
  }

  private detectConflicts(
    current: number[],
    next: number[]
  ): number[] {
    const conflicts: number[] = [];

    for (const currentLane of current) {
      const conflictingLanes = this.conflictMatrix.get(currentLane) || [];

      for (const nextLane of next) {
        if (conflictingLanes.includes(nextLane)) {
          conflicts.push(nextLane);
        }
      }
    }

    return conflicts;
  }

  private validatePedestrianClearance(
    currentPhase: SignalPhase,
    nextPhase: SignalPhase,
    state: AggregatedTrafficState
  ): SafetyValidation {
    // Check if pedestrian crossings are affected
    // This would integrate with pedestrian detection if available

    // For now, enforce minimum pedestrian time if phase change
    // affects crosswalks (implementation dependent on intersection geometry)

    return { safe: true };
  }
}
```

---

## Data Flow

### Real-time Data Pipeline

```
┌─────────────────┐
│ Radar Hardware  │
└────────┬────────┘
         │ UDP packets
         ▼
┌─────────────────┐
│ Radar Processor │  (Existing: dashboard/src/lib/radar-processor.ts)
└────────┬────────┘
         │ Parsed data
         ▼
┌─────────────────┐
│  Redis Lists    │  deviceId/passdata, deviceId/objectdata, etc.
│  + Pub/Sub      │
└────────┬────────┘
         │ Keyspace notifications
         ▼
┌─────────────────┐
│ Data Aggregator │  ← NEW COMPONENT
│  Subscriber     │
└────────┬────────┘
         │ AggregatedTrafficState (every 100ms)
         ▼
┌─────────────────┐
│ Decision Engine │  ← NEW COMPONENT
└────────┬────────┘
         │ SignalDecision
         ▼
┌─────────────────┐
│Signal Controller│  ← NEW COMPONENT
│   Interface     │
└────────┬────────┘
         │ Hardware commands
         ▼
┌─────────────────┐
│ Traffic Signal  │
│   Controller    │
└─────────────────┘
```

### Decision Cycle Timing

```
t=0ms:   New radar data arrives in Redis
t=5ms:   Keyspace notification triggers Data Aggregator
t=10ms:  Aggregator fetches all 5 data types from Redis
t=50ms:  Aggregation complete → AggregatedTrafficState ready
t=60ms:  Scoring Engine calculates priority scores
t=70ms:  Decision Engine makes phase decision
t=80ms:  Safety Validator checks decision
t=90ms:  Signal Controller generates command
t=100ms: Command sent to hardware (via API or serial)

Total latency: ~100ms from data arrival to signal command
```

---

## Integration Points

### 1. Redis Integration

```typescript
// Use existing getRedisClient() from src/lib/redis.ts
import { getRedisClient } from '@/lib/redis';

class DataAggregator {
  private async getPassData(deviceId: string, since: number): Promise<PassData[]> {
    const redis = await getRedisClient();
    const key = `${deviceId}/passdata`;

    // Get recent entries
    const entries = await redis.lRange(key, -100, -1);

    return entries
      .map(entry => JSON.parse(entry))
      .filter((data: PassData) => data.timestamp >= since);
  }
}
```

### 2. MongoDB Integration

```typescript
// Log all decisions to MongoDB for audit trail
import { getMongoClient } from '@/lib/mongodb';

class SignalController {
  private async logDecision(decision: SignalDecision): Promise<void> {
    const db = await getMongoClient();

    await db.collection('signal_decisions').insertOne({
      timestamp: Date.now(),
      deviceId: this.deviceId,
      decision: decision.action,
      phase: decision.nextPhase,
      reason: decision.reason,
      confidence: decision.confidence,
      validatedSafe: decision.validatedSafe
    });
  }
}
```

### 3. WebSocket Integration

```typescript
// Broadcast decisions to monitoring dashboard
import { broadcastToChannel } from '@/lib/websocket-server';

class SignalController {
  private async broadcastDecision(decision: SignalDecision): Promise<void> {
    await broadcastToChannel('signal-control', {
      type: 'signal_decision',
      deviceId: this.deviceId,
      decision,
      timestamp: Date.now()
    });
  }
}
```

### 4. API Endpoints

```typescript
// New API routes for signal control
// GET /api/signal-control/status?deviceId=P1-center
// POST /api/signal-control/manual-override
// GET /api/signal-control/decisions/history
```

---

## Performance Considerations

### Optimization Strategies

1. **Data Caching**:
```typescript
class DataAggregator {
  private cache = new Map<string, {
    state: AggregatedTrafficState;
    expiry: number;
  }>();

  async aggregateTrafficState(deviceId: string): Promise<AggregatedTrafficState> {
    const cached = this.cache.get(deviceId);
    if (cached && Date.now() < cached.expiry) {
      return cached.state;
    }

    const state = await this.fetchAndAggregate(deviceId);

    this.cache.set(deviceId, {
      state,
      expiry: Date.now() + 100 // 100ms cache
    });

    return state;
  }
}
```

2. **Parallel Processing**:
```typescript
// Fetch all data types in parallel
const [objectData, passData, trafficData, laneStatus, regionData] =
  await Promise.all([
    this.getObjectData(deviceId, since),
    this.getPassData(deviceId, since),
    this.getTrafficData(deviceId, since),
    this.getLaneStatus(deviceId),
    this.getRegionData(deviceId)
  ]);
```

3. **Incremental Updates**:
```typescript
// Only recalculate when data changes
private lastDataHash: string;

async aggregateTrafficState(deviceId: string): Promise<AggregatedTrafficState> {
  const currentHash = await this.calculateDataHash(deviceId);

  if (currentHash === this.lastDataHash) {
    return this.cachedState;
  }

  this.lastDataHash = currentHash;
  return await this.fetchAndAggregate(deviceId);
}
```

### Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Decision Latency | < 200ms | < 500ms |
| Data Aggregation | < 50ms | < 100ms |
| Score Calculation | < 10ms | < 20ms |
| Safety Validation | < 20ms | < 50ms |
| Memory Usage | < 100MB | < 250MB |
| CPU Usage | < 20% | < 50% |

---

## Error Handling

### Failure Modes and Responses

1. **Redis Connection Failure**:
```typescript
class DataAggregator {
  async aggregateTrafficState(deviceId: string): Promise<AggregatedTrafficState> {
    try {
      return await this.fetchAndAggregate(deviceId);
    } catch (error) {
      if (error.message.includes('Redis')) {
        // Fall back to last known state
        logger.error('Redis connection failed, using cached state');
        return this.lastKnownState;
      }
      throw error;
    }
  }
}
```

2. **Invalid Data Detection**:
```typescript
private validateApproachState(approach: ApproachState): boolean {
  // Check for reasonable ranges
  if (approach.queueLength < 0 || approach.queueLength > 500) {
    return false;
  }

  if (approach.waitTime < 0 || approach.waitTime > 3600) {
    return false;
  }

  if (approach.occupancyRate < 0 || approach.occupancyRate > 100) {
    return false;
  }

  return true;
}
```

3. **Safety Validation Failure**:
```typescript
class DecisionEngine {
  makeDecision(
    state: AggregatedTrafficState,
    currentPhase: SignalPhase,
    phaseElapsed: number
  ): SignalDecision {
    const decision = this.generateDecision(state, currentPhase, phaseElapsed);

    const safetyCheck = this.safetyValidator.validateTransition(
      currentPhase,
      decision.nextPhase,
      state
    );

    if (!safetyCheck.safe) {
      // Reject unsafe decision, hold current phase
      return {
        action: 'HOLD',
        reason: `Safety check failed: ${safetyCheck.reason}`,
        confidence: 0.0,
        validatedSafe: false
      };
    }

    return decision;
  }
}
```

4. **Emergency Fallback**:
```typescript
class SignalController {
  private async executeDecision(decision: SignalDecision): Promise<void> {
    try {
      await this.sendCommand(decision);
    } catch (error) {
      logger.error('Failed to execute decision, activating fallback mode');

      // Fall back to fixed-time plan
      await this.activateFixedTimingPlan();

      // Alert operators
      await this.sendAlert('Signal controller in fallback mode');
    }
  }
}
```

---

**Design Document Version**: 1.0.0
**Created**: 2025-10-29
**Status**: Draft
