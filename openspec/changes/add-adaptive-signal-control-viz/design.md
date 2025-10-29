# Adaptive Signal Control Visualization - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Dashboard (Frontend)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │          Adaptive Signal Control Component                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │ Green Phase  │  │ Queue/Spill  │  │ Priority/Safety │ │ │
│  │  │  Duration    │  │   back Mgmt  │  │    Control      │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │         Algorithm Status Indicators                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↑                                     │
│                            │ WebSocket (real-time)               │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                     Backend (Next.js API)                        │
│  ┌────────────────────────┴─────────────────────────────────┐   │
│  │          Signal Control Processor                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │   │
│  │  │ Phase Logic  │  │ Queue Logic  │  │ Priority Logic│  │   │
│  │  │ Evaluator    │  │ Evaluator    │  │ Evaluator     │  │   │
│  │  └──────────────┘  └──────────────┘  └───────────────┘  │   │
│  │         ↓                  ↓                  ↓          │   │
│  │  ┌──────────────────────────────────────────────────────┐│   │
│  │  │       ASC Recommendation Engine                      ││   │
│  │  │  (Evaluates thresholds, generates recommendations)   ││   │
│  │  └──────────────────────────────────────────────────────┘│   │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↑                                     │
│                            │ Redis Pub/Sub                       │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                     Radar Data Layer                             │
│  ┌────────────────────────┴─────────────────────────────────┐   │
│  │         Redis (Real-time Data Storage)                    │   │
│  │  • P1-center/objectdata (0x01) → Vehicle classification  │   │
│  │  • P1-center/trafficdata (0x03) → Headway, occupancy     │   │
│  │  • P1-center/lanedata (0x04) → Queue, overflow           │   │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Real-time Data Ingestion
```typescript
ClairWav-T80 Radar
    ↓ (Network packets)
Redis Storage
    ↓ (Pub/Sub notifications)
Signal Control Processor
    ↓ (Evaluated rules)
WebSocket Server
    ↓ (Real-time updates)
React Dashboard
```

### 2. ASC Logic Evaluation Pipeline

```typescript
// Every 1 second (debounced)
fetchRadarData() {
  const trafficData = await redis.lRange('P1-center/trafficdata', -1, -1); // 0x03
  const laneData = await redis.lRange('P1-center/lanedata', -1, -1);       // 0x04
  const objectData = await redis.lRange('P1-center/objectdata', -10, -1);  // 0x01

  return {
    phaseControl: evaluatePhaseLogic(trafficData),
    queueControl: evaluateQueueLogic(laneData),
    priorityControl: evaluatePriorityLogic(objectData, trafficData)
  };
}
```

## Component Design

### 1. Green Phase Duration Panel

**Visual Elements**:
```tsx
<div className="phase-control-panel">
  {/* Headway Meter */}
  <div className="headway-meter">
    <label>Headway Time</label>
    <ProgressBar
      current={2.1}
      max={3.0}
      threshold={3.0}
      color={2.1 < 3.0 ? 'green' : 'amber'}
    />
    <span>2.1s / 3.0s (Gap-Out Threshold)</span>
  </div>

  {/* Occupancy Rate */}
  <div className="occupancy-indicator">
    <label>Virtual Loop Occupancy</label>
    <CircularGauge
      value={18}
      min={0}
      max={100}
      thresholdLow={5}
      color={18 > 5 ? 'green' : 'red'}
    />
    <span>18% (>5% = Demand Active)</span>
  </div>

  {/* Queue Count */}
  <div className="queue-counter">
    <label>Vehicles in Queue</label>
    <NumberDisplay value={7} trend="increasing" />
    <span>Max Green Extension Active</span>
  </div>

  {/* Phase Status */}
  <div className="phase-status">
    <Badge color="green">Phase 2 Active</Badge>
    <Timer>00:38 / 01:20 (Max Green)</Timer>
    <Recommendation>Extend +10s (High Demand)</Recommendation>
  </div>
</div>
```

**Data Mapping**:
```typescript
interface PhaseControlData {
  headwayTime: number;           // from 0x03.headwayTime
  occupancyRate: number;          // from 0x03.virtualLoopOccupancy
  queueCount: number;             // from 0x04.queue.vehicleCount
  maxHeadwayThreshold: number;    // config: 3.0 seconds
  occupancyThreshold: number;     // config: 5%
  recommendation: 'extend' | 'gap-out' | 'maintain';
  reasoning: string;
}
```

### 2. Queue & Spillback Management Panel

**Visual Elements**:
```tsx
<div className="queue-spillback-panel">
  {/* Queue Length Meter */}
  <div className="queue-meter">
    <label>Queue Length</label>
    <LinearGauge
      current={62}
      spillbackThreshold={75}
      dangerZone={75}
      color={62 < 75 ? 'amber' : 'red'}
    />
    <span>62m / 75m (Spillback Threshold)</span>
  </div>

  {/* Overflow Alert */}
  <div className={`overflow-alert ${overflow ? 'active' : 'inactive'}`}>
    <AlertIcon color="red" />
    <span>QUEUE OVERFLOW - EMERGENCY RECALL</span>
  </div>

  {/* Lead Vehicle Position */}
  <div className="vehicle-position">
    <label>Lead Vehicle</label>
    <StopLineIndicator position={5.2} />
    <span>5.2m from stop line</span>
  </div>

  {/* Phase Recommendation */}
  <div className="phase-call">
    <Button color="red" disabled={!spillbackActive}>
      Call Opposing Phase
    </Button>
    <span>Spillback Prevention Active</span>
  </div>
</div>
```

**Data Mapping**:
```typescript
interface QueueControlData {
  queueLength: number;            // from 0x04.queue.length
  maxQueueLength: number;         // from 0x03.maxQueueLength
  spillbackThreshold: number;     // config: 75 meters
  overflow: boolean;              // from 0x04.queue.overflow
  leadVehiclePosition: number;    // from 0x04.positions.leadVehicle
  recommendation: 'call-phase' | 'extend-green' | 'normal';
  urgency: 'low' | 'medium' | 'high' | 'critical';
}
```

### 3. Priority & Safety Control Panel

**Visual Elements**:
```tsx
<div className="priority-safety-panel">
  {/* Transit Priority */}
  <div className={`tsp-indicator ${busDetected ? 'active' : 'inactive'}`}>
    <Icon>🚌</Icon>
    <label>Transit Signal Priority</label>
    <Badge color={busDetected ? 'blue' : 'gray'}>
      {busDetected ? 'Active' : 'Inactive'}
    </Badge>
    <span>Bus detected in approach zone</span>
  </div>

  {/* Pedestrian/Cyclist Recall */}
  <div className={`nmv-indicator ${nmvDetected ? 'active' : 'inactive'}`}>
    <Icon>🚶🚴</Icon>
    <label>Non-Motorized Vehicle Recall</label>
    <Badge color={nmvDetected ? 'green' : 'gray'}>
      {nmvDetected ? 'Active' : 'Inactive'}
    </Badge>
    <span>Pedestrian phase called automatically</span>
  </div>

  {/* Heavy Vehicle Extension */}
  <div className={`hv-indicator ${truckDetected ? 'active' : 'inactive'}`}>
    <Icon>🚛</Icon>
    <label>Heavy Vehicle Extension</label>
    <Badge color={truckDetected ? 'orange' : 'gray'}>
      {truckDetected ? '+15s' : 'Inactive'}
    </Badge>
    <span>Truck clearance time added</span>
  </div>
</div>
```

**Data Mapping**:
```typescript
interface PriorityControlData {
  transitPriority: {
    active: boolean;              // busFlow > 0 from 0x03
    busCount: number;             // from 0x03.vehicleFlows.bus
    action: 'shorten-opposing' | 'extend-green' | null;
  };
  pedestrianRecall: {
    active: boolean;              // targetType === 13 from 0x01
    pedestrianCount: number;      // count from 0x01.entries
    action: 'call-ped-phase' | null;
  };
  heavyVehicle: {
    active: boolean;              // targetType === 8 from 0x01
    truckCount: number;           // count of large trucks
    extensionSeconds: number;     // config: +15 seconds
  };
}
```

### 4. Algorithm Status Indicators

**Visual Elements**:
```tsx
<div className="algorithm-status">
  <StatusBadge
    active={gapOutActive}
    icon="✅"
    label="Gap-Out Active"
    description="Headway > 3.0s - Phase can terminate"
  />
  <StatusBadge
    active={maxGreenExtension}
    icon="⚠️"
    label="Max Green Extension"
    description="Queue count high - Phase extended to max"
  />
  <StatusBadge
    active={spillbackPrevention}
    icon="🚨"
    label="Spillback Prevention"
    description="Queue > 75m - Emergency phase call"
  />
  <StatusBadge
    active={transitPriority}
    icon="🚌"
    label="Transit Priority"
    description="Bus detected - TSP active"
  />
  <StatusBadge
    active={pedestrianRecall}
    icon="🚶"
    label="Pedestrian Recall"
    description="NMV detected - Ped phase called"
  />
</div>
```

## Backend Implementation

### Signal Control Processor

```typescript
// /app/api/signal-control/status/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('device') || 'P1-center';
  const lane = searchParams.get('lane'); // optional: specific lane

  const redis = await getRedisClient();

  // Fetch radar data
  const [trafficDataRaw, laneDataRaw, objectDataRaw] = await Promise.all([
    redis.lRange(`${deviceId}/trafficdata`, -1, -1),   // Latest 0x03
    redis.lRange(`${deviceId}/lanedata`, -1, -1),      // Latest 0x04
    redis.lRange(`${deviceId}/objectdata`, -10, -1)    // Last 10 vehicles
  ]);

  const trafficData = JSON.parse(trafficDataRaw[0]);
  const laneData = JSON.parse(laneDataRaw[0]);
  const objectData = objectDataRaw.map(d => JSON.parse(d));

  // Evaluate ASC logic
  const phaseControl = evaluatePhaseLogic(trafficData, lane);
  const queueControl = evaluateQueueLogic(laneData, lane);
  const priorityControl = evaluatePriorityLogic(objectData, trafficData);

  return Response.json({
    success: true,
    data: {
      deviceId,
      timestamp: new Date().toISOString(),
      phaseControl,
      queueControl,
      priorityControl,
      activeRules: determineActiveRules(phaseControl, queueControl, priorityControl)
    }
  });
}
```

### ASC Logic Evaluators

```typescript
// Phase Logic Evaluator
function evaluatePhaseLogic(trafficData: TrafficData, lane?: string) {
  const headway = trafficData.headwayTime;
  const occupancy = trafficData.virtualLoopOccupancy;
  const queueCount = trafficData.maxQueueLength; // vehicle count equivalent

  // Configurable thresholds
  const MAX_HEADWAY = 3.0;  // seconds
  const MIN_OCCUPANCY = 5;  // percent

  let recommendation: 'extend' | 'gap-out' | 'maintain' = 'maintain';
  let reasoning = '';

  if (headway > MAX_HEADWAY && occupancy < MIN_OCCUPANCY) {
    recommendation = 'gap-out';
    reasoning = `Headway ${headway.toFixed(1)}s exceeds ${MAX_HEADWAY}s and occupancy ${occupancy}% below ${MIN_OCCUPANCY}% - demand satisfied`;
  } else if (queueCount > 5 && headway < MAX_HEADWAY) {
    recommendation = 'extend';
    reasoning = `${queueCount} vehicles queued with active demand - extend to max green`;
  }

  return {
    headwayTime: headway,
    occupancyRate: occupancy,
    queueCount,
    maxHeadwayThreshold: MAX_HEADWAY,
    occupancyThreshold: MIN_OCCUPANCY,
    recommendation,
    reasoning
  };
}

// Queue Logic Evaluator
function evaluateQueueLogic(laneData: LaneStatus, lane?: string) {
  const entries = lane
    ? laneData.entries.filter(e => e.lane.number.toString() === lane)
    : laneData.entries;

  const results = entries.map(entry => {
    const queueLength = entry.queue.length;
    const overflow = entry.queue.overflow;
    const leadPosition = entry.positions.leadVehicle;

    // Configurable threshold
    const SPILLBACK_THRESHOLD = 75; // meters

    let recommendation: 'call-phase' | 'extend-green' | 'normal' = 'normal';
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (overflow) {
      recommendation = 'call-phase';
      urgency = 'critical';
    } else if (queueLength >= SPILLBACK_THRESHOLD) {
      recommendation = 'call-phase';
      urgency = 'high';
    } else if (queueLength >= SPILLBACK_THRESHOLD * 0.8) {
      recommendation = 'extend-green';
      urgency = 'medium';
    }

    return {
      laneNumber: entry.lane.number,
      queueLength,
      maxQueueLength: queueLength, // historical max
      spillbackThreshold: SPILLBACK_THRESHOLD,
      overflow,
      leadVehiclePosition: leadPosition,
      recommendation,
      urgency
    };
  });

  return results;
}

// Priority Logic Evaluator
function evaluatePriorityLogic(objectData: ObjectData[], trafficData: TrafficData) {
  // Transit Priority (TSP)
  const busCount = trafficData.vehicleFlows.bus;
  const busesInApproach = objectData.filter(obj =>
    obj.entries.some(e => e.targetType === 7) // Bus type
  ).length;

  const transitPriority = {
    active: busCount > 0 || busesInApproach > 0,
    busCount: busCount || busesInApproach,
    action: busesInApproach > 0 ? 'extend-green' as const : null
  };

  // Pedestrian/Cyclist Recall (NMV)
  const pedestrians = objectData.flatMap(obj =>
    obj.entries.filter(e => e.targetType === 13) // Pedestrian
  );
  const cyclists = objectData.flatMap(obj =>
    obj.entries.filter(e => e.targetType === 5) // Bicycle
  );

  const pedestrianRecall = {
    active: pedestrians.length > 0 || cyclists.length > 0,
    pedestrianCount: pedestrians.length,
    cyclistCount: cyclists.length,
    action: (pedestrians.length > 0 || cyclists.length > 0) ? 'call-ped-phase' as const : null
  };

  // Heavy Vehicle Extension
  const largeTrucks = objectData.flatMap(obj =>
    obj.entries.filter(e => e.targetType === 8) // Large truck
  );

  const heavyVehicle = {
    active: largeTrucks.length > 0,
    truckCount: largeTrucks.length,
    extensionSeconds: largeTrucks.length > 0 ? 15 : 0 // +15s per truck
  };

  return {
    transitPriority,
    pedestrianRecall,
    heavyVehicle
  };
}
```

## Configuration Management

Add ASC threshold configuration to Lane Config Modal:

```typescript
// Add to LaneConfig interface
interface ASCThresholds {
  maxHeadway: number;           // 3.0 seconds default
  minOccupancy: number;         // 5% default
  spillbackThreshold: number;   // 75 meters default
  transitPriorityExtension: number; // 20 seconds default
  heavyVehicleExtension: number;    // 15 seconds default
  pedestrianRecallDelay: number;    // 10 seconds default
}
```

## Performance Considerations

1. **Update Frequency**: 1-second debounced updates to avoid UI thrashing
2. **Data Caching**: Cache radar data for 2 seconds to reduce Redis calls
3. **WebSocket Throttling**: Only push updates when ASC state changes
4. **Selective Rendering**: Use React.memo() for all panel components
5. **Progressive Loading**: Load panels independently to avoid blocking

## Testing Strategy

1. **Unit Tests**: Test each evaluator function with known input scenarios
2. **Integration Tests**: Verify Redis data → ASC logic → UI flow
3. **E2E Tests**: Playwright scenarios for each panel interaction
4. **Load Tests**: Verify performance with multiple simultaneous updates
5. **Traffic Engineering Validation**: Test against real-world timing scenarios
