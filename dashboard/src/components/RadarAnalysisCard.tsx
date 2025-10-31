'use client';

import { useState, useEffect } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import { VehicleState } from '@/types/tracking';

interface LaneStatusData {
  lane: {
    number: number;
    status: number;
  };
  queue: {
    length: number;
    vehicles: number;
    vehicleCount?: number;
  };
  occupancy: {
    space: number;
    time: number;
  };
  speed: {
    average: number;
    percentile85: number;
  };
  vehicleSpacing?: number;
  vehiclesOnline?: number;
  positions?: {
    leadVehicle: number;
    trailingVehicle: number;
  };
}

interface RadarAnalysisCardProps {
  vehicles: VehicleState[];
  laneStatus?: LaneStatusData[];
  selectedScenario: number;
  onScenarioChange: (scenarioId: number) => void;
  className?: string;
  compact?: boolean;
}

interface RadarAnalysis {
  scenarios: Array<{
    id: number;
    name: string;
    description: string;
    lanes: Array<{
      laneNumber: number;
      startX: number;
      endX: number;
      description: string;
      width: number;
      vehicleCount?: number;
      avgX?: number;
      minX?: number;
      maxX?: number;
    }>;
  }>;
  vehicleStats: {
    count: number;
    avgWidth: number;
    avgLength: number;
    maxWidth?: number;
    minWidth?: number;
    types: Record<string, number>;
    laneUsage?: Record<number, number>;
    radarLanes?: Array<{
      laneNumber: number;
      avgX: number;
      width: number;
      vehicleCount: number;
    }>;
  };
  queueMetrics: {
    avgQueueLength: number;
    totalQueuedVehicles: number;
    lanesWithQueues: number;
  };
  trafficMetrics: {
    stoppedLanes: number;
    criticalLanes: number;
    avgWaitTime: number; // seconds
    maxQueue: number; // meters
    dischargeRate: number; // vehicles per minute
    throughput: number; // vehicles per minute
    signalPhase: 'RED' | 'GREEN'; // inferred signal phase
  };
}

export default function RadarAnalysisCard({
  vehicles,
  laneStatus,
  selectedScenario,
  onScenarioChange,
  className = '',
  compact = false
}: RadarAnalysisCardProps) {
  const { selectedDevice } = useDevice();
  const [objectDataValidation, setObjectDataValidation] = useState<{
    hasRealData: boolean;
    dataSource: string;
    lastUpdated?: string;
  }>({ hasRealData: false, dataSource: 'WebSocket' });

  // Analyze radar data to create lane scenarios based on actual radar lane assignments
  const analyzeRadarData = (): RadarAnalysis => {
    // Calculate queue metrics from lane status
    const calculateQueueMetrics = () => {
      if (!laneStatus || laneStatus.length === 0) {
        return {
          avgQueueLength: 0,
          totalQueuedVehicles: 0,
          lanesWithQueues: 0
        };
      }

      // Filter to only lanes with actual queues (queue.length > 0)
      const lanesWithQueues = laneStatus.filter(lane => (lane.queue?.length || 0) > 0);

      const totalQueueLength = lanesWithQueues.reduce((sum, lane) => sum + (lane.queue?.length || 0), 0);
      const totalQueuedVehicles = laneStatus.reduce((sum, lane) => sum + (lane.queue?.vehicles || 0), 0);

      // Calculate average only from lanes that have queues
      const avgQueueLength = lanesWithQueues.length > 0 ? totalQueueLength / lanesWithQueues.length : 0;

      return {
        avgQueueLength,
        totalQueuedVehicles,
        lanesWithQueues: lanesWithQueues.length
      };
    };

    // Calculate traffic engineering metrics
    const calculateTrafficMetrics = () => {
      if (!laneStatus || laneStatus.length === 0) {
        return {
          stoppedLanes: 0,
          criticalLanes: 0,
          avgWaitTime: 0,
          maxQueue: 0,
          dischargeRate: 0,
          throughput: 0,
          signalPhase: 'GREEN' as const
        };
      }

      // 1. Stopped Lanes: Lanes with avg speed < 5 km/h AND queue > 0
      const stoppedLanes = laneStatus.filter(lane =>
        (lane.speed?.average || 0) < 5 && (lane.queue?.length || 0) > 0
      ).length;

      // 2. Critical Lanes: Queue > 100m OR (vehicles > 5 AND speed < 10 km/h)
      const criticalLanes = laneStatus.filter(lane => {
        const queueLength = lane.queue?.length || 0;
        const vehicleCount = lane.queue?.vehicles || 0;
        const avgSpeed = lane.speed?.average || 0;

        return queueLength > 100 || (vehicleCount > 5 && avgSpeed < 10);
      }).length;

      // 3. Average Wait Time: Based on actual queue length and vehicle spacing
      const queuedLanes = laneStatus.filter(lane => (lane.queue?.length || 0) > 0);
      let totalWaitTime = 0;
      if (queuedLanes.length > 0) {
        queuedLanes.forEach(lane => {
          const queueLength = lane.queue?.length || 0;
          const vehicleCount = lane.queue?.vehicleCount || lane.queue?.vehicles || 1;
          const vehicleSpacing = lane.vehicleSpacing || 10; // Use actual spacing from Redis

          // Wait time estimation: Average vehicle is at queueLength/2 position
          // Time to clear = (queue position) / (discharge rate)
          // Discharge rate based on actual spacing: vehicles can clear at ~2 sec per vehicle
          const avgPosition = queueLength / 2; // meters
          const secondsPerVehicle = vehicleSpacing / 5; // 5 m/s typical discharge speed
          const waitTime = (avgPosition / vehicleSpacing) * secondsPerVehicle;

          totalWaitTime += waitTime;
        });
        totalWaitTime = totalWaitTime / queuedLanes.length;
      }

      // 4. Max Queue: Longest queue across all lanes
      const maxQueue = laneStatus.length > 0
        ? Math.max(...laneStatus.map(lane => lane.queue?.length || 0))
        : 0;

      // 4. Discharge Rate: Vehicles clearing intersection per minute
      // For flowing lanes, use actual speeds; for stopped/queued lanes, use saturation flow estimates
      let dischargeRate = 0;

      laneStatus.forEach(lane => {
        const speed = lane.speed?.average || 0; // km/h (actual measured speed)
        const queueLength = lane.queue?.length || 0;
        const vehicleSpacing = lane.vehicleSpacing || 5; // meters (actual spacing from radar)
        const vehiclesOnline = lane.vehiclesOnline || 0; // actual vehicles in lane

        if (speed > 20 && vehicleSpacing > 0) {
          // FLOWING LANE: Use actual measured flow rate
          const speedMetersPerMin = (speed * 1000) / 60;
          const vehiclesPerMin = speedMetersPerMin / vehicleSpacing;
          dischargeRate += vehiclesPerMin * Math.min(vehiclesOnline / 5, 1);
        } else if (queueLength > 0) {
          // STOPPED/QUEUED LANE: Use saturation flow rate estimate
          // Saturation flow: 1800-2000 veh/hour/lane = ~30 veh/min/lane (typical urban intersection)
          // This represents the POTENTIAL discharge rate when signal turns green
          const saturationFlowPerMin = 30; // vehicles/min/lane
          const queueVehicles = Math.ceil(queueLength / vehicleSpacing);

          // Use saturation flow, capped by actual queue size
          // This shows how fast the queue COULD discharge
          dischargeRate += Math.min(saturationFlowPerMin, queueVehicles);
        }
      });

      // 5. Throughput: Total vehicles processed per minute (all lanes)
      // Combines actual flow (moving lanes) + potential flow (queued lanes)
      let throughput = 0;
      laneStatus.forEach(lane => {
        const speed = lane.speed?.average || 0; // actual speed from radar
        const queueLength = lane.queue?.length || 0;
        const vehicleSpacing = lane.vehicleSpacing || 5; // actual spacing
        const vehiclesOnline = lane.vehiclesOnline || 0; // actual count

        if (speed > 10 && vehicleSpacing > 0) {
          // MOVING LANE: Use actual measured throughput
          const speedMetersPerMin = (speed * 1000) / 60;
          const vehiclesPerMin = speedMetersPerMin / vehicleSpacing;
          throughput += vehiclesPerMin * Math.min(vehiclesOnline / 5, 1);
        } else if (queueLength > 0) {
          // QUEUED LANE: Use estimated throughput based on queue
          // Conservative estimate: 20 veh/min/lane (lower than saturation flow)
          // Represents average throughput accounting for signal cycles
          const avgThroughputPerMin = 20; // vehicles/min/lane
          const queueVehicles = Math.ceil(queueLength / vehicleSpacing);

          // Throughput estimate based on queue size and typical signal timing
          throughput += Math.min(avgThroughputPerMin, queueVehicles * 0.5);
        }
      });

      // 6. Signal Phase: Infer RED/GREEN from queue and lane speeds
      // RED: Significant queue (>10m) AND low speeds (<10 km/h) = stopped at red light
      // GREEN: Everything else (flowing or transitioning)
      const hasSignificantStoppedQueue = laneStatus.some(lane =>
        (lane.queue?.length || 0) > 10 && (lane.speed?.average || 0) < 10
      );

      let signalPhase: 'RED' | 'GREEN';
      if (hasSignificantStoppedQueue) {
        // Significant queue with stopped traffic → RED phase (vehicles waiting at red light)
        signalPhase = 'RED';
      } else {
        // All other conditions → GREEN phase (flowing, transitioning, or brief queuing)
        signalPhase = 'GREEN';
      }

      return {
        stoppedLanes,
        criticalLanes,
        avgWaitTime: Math.round(totalWaitTime),
        maxQueue: Math.round(maxQueue),
        dischargeRate: Math.round(dischargeRate),
        throughput: Math.round(throughput),
        signalPhase
      };
    };

    if (vehicles.length === 0) {
      return {
        scenarios: [
          {
            id: 0,
            name: 'Standard 3-Lane',
            description: 'Default configuration',
            lanes: [
              { laneNumber: 1, startX: -15, endX: -5, description: 'Left Lane', width: 10 },
              { laneNumber: 2, startX: -5, endX: 5, description: 'Center Lane', width: 10 },
              { laneNumber: 3, startX: 5, endX: 15, description: 'Right Lane', width: 10 }
            ]
          }
        ],
        vehicleStats: { count: 0, avgWidth: 0, avgLength: 0, types: {} },
        queueMetrics: calculateQueueMetrics(),
        trafficMetrics: calculateTrafficMetrics()
      };
    }

    // Analyze vehicle data
    const vehicleWidths = vehicles.map(v => v.position.width);
    const vehicleLengths = vehicles.map(v => v.position.length);
    const vehicleTypes = vehicles.map(v => v.position.vehicleType);
    
    const avgWidth = vehicleWidths.reduce((sum, w) => sum + w, 0) / vehicleWidths.length;
    const avgLength = vehicleLengths.reduce((sum, l) => sum + l, 0) / vehicleLengths.length;
    const maxWidth = Math.max(...vehicleWidths);
    const minWidth = Math.min(...vehicleWidths);
    
    // Count vehicle types
    const typeCount = vehicleTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyze actual radar lane assignments and X positions
    const laneData = vehicles.reduce((acc, v) => {
      const laneNo = v.position.laneNo;
      const x = v.position.x;
      
      if (!acc[laneNo]) {
        acc[laneNo] = { xPositions: [], vehicles: [] };
      }
      acc[laneNo].xPositions.push(x);
      acc[laneNo].vehicles.push(v);
      return acc;
    }, {} as Record<number, { xPositions: number[], vehicles: VehicleState[] }>);

    // Calculate lane boundaries based on actual radar data
    const radarLanes = Object.entries(laneData).map(([laneNo, data]) => {
      const xPositions = data.xPositions;
      const minX = Math.min(...xPositions);
      const maxX = Math.max(...xPositions);
      const avgX = xPositions.reduce((sum, x) => sum + x, 0) / xPositions.length;
      
      // Calculate lane width based on vehicle positions and widths
      const vehicleWidths = data.vehicles.map(v => v.position.width);
      const maxVehicleWidth = Math.max(...vehicleWidths);
      const laneWidth = Math.max(maxVehicleWidth * 1.5, 3.5); // Safety buffer
      
      return {
        laneNumber: parseInt(laneNo),
        startX: avgX - laneWidth / 2,
        endX: avgX + laneWidth / 2,
        description: `Radar Lane ${laneNo}`,
        width: laneWidth,
        vehicleCount: data.vehicles.length,
        avgX: avgX,
        minX: minX,
        maxX: maxX
      };
    }).sort((a, b) => a.avgX - b.avgX); // Sort by X position

    // Create scenarios based on radar data
    const scenarios = [
      // Scenario 1: Radar-Based (actual radar lane assignments)
      {
        id: 0,
        name: 'Radar-Based',
        description: `Based on actual radar lanes (${radarLanes.length} lanes)`,
        lanes: radarLanes
      },
      
      // Scenario 2: Optimized Radar (merge close lanes, expand wide ones)
      {
        id: 1,
        name: 'Optimized Radar',
        description: 'Optimized radar lanes with better spacing',
        lanes: (() => {
          if (radarLanes.length === 0) return radarLanes;
          
          // Merge lanes that are too close together
          const mergedLanes = [];
          let currentLane = radarLanes[0];
          
          for (let i = 1; i < radarLanes.length; i++) {
            const nextLane = radarLanes[i];
            const distance = nextLane.avgX - currentLane.avgX;
            
            if (distance < 4.0) { // Merge if too close
              currentLane = {
                ...currentLane,
                endX: nextLane.endX,
                width: nextLane.endX - currentLane.startX,
                description: `Merged Lane ${currentLane.laneNumber}-${nextLane.laneNumber}`,
                vehicleCount: currentLane.vehicleCount + nextLane.vehicleCount
              };
            } else {
              mergedLanes.push(currentLane);
              currentLane = nextLane;
            }
          }
          mergedLanes.push(currentLane);
          
          return mergedLanes;
        })()
      },
      
      // Scenario 3: Standardized (convert radar lanes to standard 3-lane)
      {
        id: 2,
        name: 'Standardized',
        description: 'Convert radar lanes to standard 3-lane configuration',
        lanes: (() => {
          const totalWidth = 30; // Detection zone width
          const laneWidth = totalWidth / 3;
          const startX = -15;
          
          return [
            { laneNumber: 1, startX: startX, endX: startX + laneWidth, description: 'Left Lane', width: laneWidth },
            { laneNumber: 2, startX: startX + laneWidth, endX: startX + 2 * laneWidth, description: 'Center Lane', width: laneWidth },
            { laneNumber: 3, startX: startX + 2 * laneWidth, endX: startX + 3 * laneWidth, description: 'Right Lane', width: laneWidth }
          ];
        })()
      }
    ];

    // Analyze lane usage from radar data
    const laneUsage = vehicles.reduce((acc, v) => {
      const lane = v.position.laneNo;
      acc[lane] = (acc[lane] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      scenarios,
      vehicleStats: {
        count: vehicles.length,
        avgWidth: avgWidth,
        avgLength: avgLength,
        maxWidth: maxWidth,
        minWidth: minWidth,
        types: typeCount,
        laneUsage: laneUsage,
        radarLanes: radarLanes
      },
      queueMetrics: calculateQueueMetrics(),
      trafficMetrics: calculateTrafficMetrics()
    };
  };

  // Validate ObjectData from Redis
  useEffect(() => {
    const validateObjectData = async () => {
      try {
        const response = await fetch(`/api/simple-redis?deviceId=${selectedDevice.id}`);
        const data = await response.json();
        
        if (data.success && data.sampleObjectData) {
          setObjectDataValidation({
            hasRealData: true,
            dataSource: `Redis ${selectedDevice.id}/ObjectData`,
            lastUpdated: new Date().toLocaleTimeString()
          });
        } else {
          setObjectDataValidation({
            hasRealData: false,
            dataSource: 'WebSocket (fallback)',
            lastUpdated: new Date().toLocaleTimeString()
          });
        }
      } catch (error) {
        console.error('Error validating ObjectData:', error);
        setObjectDataValidation({
          hasRealData: false,
          dataSource: 'WebSocket (fallback)',
          lastUpdated: new Date().toLocaleTimeString()
        });
      }
    };

    validateObjectData();
    // Re-validate every 30 seconds
    const interval = setInterval(validateObjectData, 30000);
    return () => clearInterval(interval);
  }, [selectedDevice.id]);

  const analysis = analyzeRadarData();
  const currentScenario = analysis.scenarios[selectedScenario];

  if (compact) {
    return (
      <div className={`bg-white rounded-lg shadow p-3 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Phase Analysis</h3>
          <div className="flex items-center gap-2">
            {/* Traffic Light Status - Temporarily Hidden for Study */}
            {/* <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              analysis.trafficMetrics.signalPhase === 'GREEN' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                analysis.trafficMetrics.signalPhase === 'GREEN' ? 'bg-green-500' : 'bg-red-500 animate-pulse'
              }`}></div>
              <span className={`text-xs font-bold ${
                analysis.trafficMetrics.signalPhase === 'GREEN' ? 'text-green-700' : 'text-red-700'
              }`}>{analysis.trafficMetrics.signalPhase}</span>
            </div> */}
            <div className={`w-2 h-2 rounded-full ${objectDataValidation.hasRealData ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          </div>
        </div>

        <div className="text-xs space-y-3">
          {/* Top Row - Critical Metrics */}
          <div className="grid grid-cols-3 gap-3">
            {/* Stopped Lanes */}
            <div className={`p-2 rounded-lg text-center ${
              analysis.trafficMetrics.stoppedLanes === 0 ? 'bg-green-50' :
              analysis.trafficMetrics.stoppedLanes <= 2 ? 'bg-yellow-50' :
              analysis.trafficMetrics.stoppedLanes === 3 ? 'bg-orange-50' : 'bg-red-50'
            }`}>
              <div className="text-gray-600 text-xs mb-1">⏸️ Stopped</div>
              <div className={`font-bold text-lg ${
                analysis.trafficMetrics.stoppedLanes === 0 ? 'text-green-700' :
                analysis.trafficMetrics.stoppedLanes <= 2 ? 'text-yellow-700' :
                analysis.trafficMetrics.stoppedLanes === 3 ? 'text-orange-700' : 'text-red-700'
              }`}>{analysis.trafficMetrics.stoppedLanes}</div>
              <div className="text-gray-500 text-xs">lanes</div>
            </div>

            {/* Critical Lanes */}
            <div className={`p-2 rounded-lg text-center ${
              analysis.trafficMetrics.criticalLanes === 0 ? 'bg-green-50' :
              analysis.trafficMetrics.criticalLanes === 1 ? 'bg-yellow-50' : 'bg-red-50'
            } ${analysis.trafficMetrics.criticalLanes > 0 ? 'animate-pulse' : ''}`}>
              <div className="text-gray-600 text-xs mb-1">⚠️ Critical</div>
              <div className={`font-bold text-lg ${
                analysis.trafficMetrics.criticalLanes === 0 ? 'text-green-700' :
                analysis.trafficMetrics.criticalLanes === 1 ? 'text-yellow-700' : 'text-red-700'
              }`}>{analysis.trafficMetrics.criticalLanes}</div>
              <div className="text-gray-500 text-xs">lanes</div>
            </div>

            {/* Max Queue */}
            <div className={`p-2 rounded-lg text-center ${
              analysis.trafficMetrics.maxQueue < 50 ? 'bg-green-50' :
              analysis.trafficMetrics.maxQueue < 100 ? 'bg-yellow-50' :
              analysis.trafficMetrics.maxQueue < 150 ? 'bg-orange-50' : 'bg-red-50'
            }`}>
              <div className="text-gray-600 text-xs mb-1">📏 Max Queue</div>
              <div className={`font-bold text-lg ${
                analysis.trafficMetrics.maxQueue < 50 ? 'text-green-700' :
                analysis.trafficMetrics.maxQueue < 100 ? 'text-yellow-700' :
                analysis.trafficMetrics.maxQueue < 150 ? 'text-orange-700' : 'text-red-700'
              }`}>{analysis.trafficMetrics.maxQueue}m</div>
              <div className="text-gray-500 text-xs">longest</div>
            </div>
          </div>

          {/* Middle Row - Queue Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {/* Average Queue Length */}
            <div className={`p-2 rounded-lg ${
              analysis.queueMetrics.avgQueueLength < 50 ? 'bg-green-50' :
              analysis.queueMetrics.avgQueueLength < 100 ? 'bg-yellow-50' :
              analysis.queueMetrics.avgQueueLength < 150 ? 'bg-orange-50' : 'bg-red-50'
            }`}>
              <div className="text-gray-600 text-xs mb-1">📐 Avg Queue</div>
              <div className={`font-bold text-base ${
                analysis.queueMetrics.avgQueueLength < 50 ? 'text-green-700' :
                analysis.queueMetrics.avgQueueLength < 100 ? 'text-yellow-700' :
                analysis.queueMetrics.avgQueueLength < 150 ? 'text-orange-700' : 'text-red-700'
              }`}>{analysis.queueMetrics.avgQueueLength.toFixed(1)}m</div>
            </div>

            {/* Lanes with Queues */}
            <div className={`p-2 rounded-lg ${
              analysis.queueMetrics.lanesWithQueues === 0 ? 'bg-green-50' :
              analysis.queueMetrics.lanesWithQueues <= 2 ? 'bg-yellow-50' :
              analysis.queueMetrics.lanesWithQueues === 3 ? 'bg-orange-50' : 'bg-red-50'
            }`}>
              <div className="text-gray-600 text-xs mb-1">🛣️ Lanes w/ Q</div>
              <div className={`font-bold text-base ${
                analysis.queueMetrics.lanesWithQueues === 0 ? 'text-green-700' :
                analysis.queueMetrics.lanesWithQueues <= 2 ? 'text-yellow-700' :
                analysis.queueMetrics.lanesWithQueues === 3 ? 'text-orange-700' : 'text-red-700'
              }`}>{analysis.queueMetrics.lanesWithQueues}</div>
            </div>
          </div>

          {/* Bottom Row - Flow Metrics */}
          <div className="grid grid-cols-3 gap-3">
            {/* Average Wait Time */}
            <div className={`p-2 rounded-lg text-center ${
              analysis.trafficMetrics.avgWaitTime < 30 ? 'bg-green-50' :
              analysis.trafficMetrics.avgWaitTime < 60 ? 'bg-yellow-50' :
              analysis.trafficMetrics.avgWaitTime < 120 ? 'bg-orange-50' : 'bg-red-50'
            }`}>
              <div className="text-gray-600 text-xs mb-1">⏱️ Wait</div>
              <div className={`font-bold text-base ${
                analysis.trafficMetrics.avgWaitTime < 30 ? 'text-green-700' :
                analysis.trafficMetrics.avgWaitTime < 60 ? 'text-yellow-700' :
                analysis.trafficMetrics.avgWaitTime < 120 ? 'text-orange-700' : 'text-red-700'
              }`}>{analysis.trafficMetrics.avgWaitTime}s</div>
            </div>
            {/* Discharge Rate */}
            <div className={`p-2 rounded-lg ${
              analysis.trafficMetrics.dischargeRate > 20 ? 'bg-green-50' :
              analysis.trafficMetrics.dischargeRate > 15 ? 'bg-yellow-50' :
              analysis.trafficMetrics.dischargeRate > 10 ? 'bg-orange-50' : 'bg-red-50'
            }`}>
              <div className="text-gray-600 text-xs mb-1">📤 Discharge</div>
              <div className={`font-bold text-base ${
                analysis.trafficMetrics.dischargeRate > 20 ? 'text-green-700' :
                analysis.trafficMetrics.dischargeRate > 15 ? 'text-yellow-700' :
                analysis.trafficMetrics.dischargeRate > 10 ? 'text-orange-700' : 'text-red-700'
              }`}>{analysis.trafficMetrics.dischargeRate}/min</div>
            </div>

            {/* Throughput */}
            <div className={`p-2 rounded-lg ${
              analysis.trafficMetrics.throughput > 40 ? 'bg-green-50' :
              analysis.trafficMetrics.throughput > 25 ? 'bg-yellow-50' :
              analysis.trafficMetrics.throughput > 15 ? 'bg-orange-50' : 'bg-red-50'
            }`}>
              <div className="text-gray-600 text-xs mb-1">📊 Throughput</div>
              <div className={`font-bold text-base ${
                analysis.trafficMetrics.throughput > 40 ? 'text-green-700' :
                analysis.trafficMetrics.throughput > 25 ? 'text-yellow-700' :
                analysis.trafficMetrics.throughput > 15 ? 'text-orange-700' : 'text-red-700'
              }`}>{analysis.trafficMetrics.throughput}/min</div>
            </div>
          </div>

          {/* Compact Scenario Selector */}
          <div className="grid grid-cols-3 gap-1">
            {analysis.scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => onScenarioChange(scenario.id)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedScenario === scenario.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                }`}
              >
                {scenario.name}
              </button>
            ))}
          </div>

          {/* Current Scenario - Compact */}
          <div className="p-2 bg-blue-50 rounded border border-blue-200">
            <div className="font-medium text-blue-900 text-xs mb-1">{currentScenario.name}</div>
            <div className="text-xs text-blue-700">{currentScenario.lanes.length} lanes</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Radar Data Analysis & Lane Scenarios</h3>
        <div className="flex items-center space-x-3 text-xs">
          {/* Traffic Light Status - Temporarily Hidden for Study */}
          {/* <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            analysis.trafficMetrics.signalPhase === 'GREEN' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <div className={`w-4 h-4 rounded-full ${
              analysis.trafficMetrics.signalPhase === 'GREEN' ? 'bg-green-500' : 'bg-red-500 animate-pulse'
            }`}></div>
            <span className={`text-sm font-bold ${
              analysis.trafficMetrics.signalPhase === 'GREEN' ? 'text-green-700' : 'text-red-700'
            }`}>{analysis.trafficMetrics.signalPhase}</span>
          </div> */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${objectDataValidation.hasRealData ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-gray-600">{objectDataValidation.dataSource}</span>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-700 space-y-4">
        {/* Vehicle Statistics */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Vehicle Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Total Vehicles</label>
              <p className="text-lg font-semibold text-gray-900">{analysis.vehicleStats.count}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Average Width</label>
              <p className="text-lg font-semibold text-gray-900">{analysis.vehicleStats.avgWidth.toFixed(1)}m</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Average Length</label>
              <p className="text-lg font-semibold text-gray-900">{analysis.vehicleStats.avgLength.toFixed(1)}m</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Max Width</label>
              <p className="text-lg font-semibold text-gray-900">{analysis.vehicleStats.maxWidth?.toFixed(1) || 'N/A'}m</p>
            </div>
          </div>
        </div>

        {/* Vehicle Types */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Vehicle Types</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(analysis.vehicleStats.types).map(([type, count]) => (
              <div key={type} className="px-3 py-2 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900 capitalize">{type}:</span>
                <span className="ml-1 text-sm font-semibold text-blue-700">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lane Usage from Radar */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Radar Lane Usage</h4>
          {analysis.vehicleStats.laneUsage ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(analysis.vehicleStats.laneUsage).map(([lane, count]) => (
                <div key={lane} className="px-3 py-2 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-900">Lane {lane}:</span>
                  <span className="ml-1 text-sm font-semibold text-green-700">{count} vehicles</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No lane data available</p>
          )}
        </div>

        {/* Radar Lane Analysis */}
        {analysis.vehicleStats.radarLanes && analysis.vehicleStats.radarLanes.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Radar Lane Details</h4>
            <div className="space-y-2">
              {analysis.vehicleStats.radarLanes.map(lane => (
                <div key={lane.laneNumber} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900 mb-1">Lane {lane.laneNumber}</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Position: X={lane.avgX.toFixed(1)}m</div>
                    <div>Width: {lane.width.toFixed(1)}m</div>
                    <div>Vehicles: {lane.vehicleCount}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scenario Selector */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Lane Scenario Selection</h4>
          <div className="grid grid-cols-3 gap-2">
            {analysis.scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => onScenarioChange(scenario.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedScenario === scenario.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                }`}
              >
                {scenario.name}
              </button>
            ))}
          </div>
        </div>

        {/* Current Scenario Info */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="font-medium text-blue-900 text-base mb-1">{currentScenario.name}</div>
          <div className="text-sm text-blue-700 mb-3">{currentScenario.description}</div>
          <div className="text-sm text-blue-800 mb-2">
            <strong>Lanes:</strong> {currentScenario.lanes.length} |
            <strong> Width:</strong> {currentScenario.lanes[0]?.width?.toFixed(1)}m each
          </div>
          <div className="grid grid-cols-3 gap-2">
            {currentScenario.lanes.map(lane => (
              <div key={lane.laneNumber} className="bg-white px-3 py-2 rounded text-center text-sm font-medium text-gray-900 border border-blue-100">
                {lane.description}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
