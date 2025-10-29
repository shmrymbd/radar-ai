'use client';

import { useState, useMemo } from 'react';
import { ControlCenterProvider, useControlCenter } from '@/contexts/ControlCenterContext';
import { VehicleState } from '@/types/tracking';
import LiveTracking from './LiveTracking';
import LaneStatusPanel from './LaneStatusPanel';
import VideoPanel from './VideoPanel';
import RadarAnalysisCard from './RadarAnalysisCard';

function ControlCenterContent() {
  const { vehicles, laneStatus } = useControlCenter();
  const [selectedScenario, setSelectedScenario] = useState(0);

  // Convert VehiclePosition[] to VehicleState[] for RadarAnalysisCard
  const vehicleStates = useMemo((): VehicleState[] => {
    return vehicles.map(v => ({
      targetId: v.targetId,
      position: v,
      trajectory: [v],
      isVisible: true,
      lastSeen: v.timestamp,
      enterTime: v.timestamp
    }));
  }, [vehicles]);

  return (
    <div className="control-center-container">
      {/* Desktop Layout - Two columns (60/40 split) */}
      <div className="grid grid-cols-[60%_40%] gap-6 h-full">
        {/* PRIMARY COLUMN (60%) - Left Side - Full height Live Tracking */}
        <div className="flex flex-col overflow-hidden">
          {/* Live Tracking Canvas - Full height */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden h-full">
            <LiveTracking hideRadarCard />
          </div>
        </div>

        {/* SECONDARY COLUMN (40%) - Right Side */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* Video Feed - Top right, fixed size */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden" style={{ height: '400px' }}>
            <VideoPanel />
          </div>

          {/* Radar Analysis Card - Compact */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <RadarAnalysisCard
              vehicles={vehicleStates}
              laneStatus={laneStatus}
              selectedScenario={selectedScenario}
              onScenarioChange={setSelectedScenario}
              compact
            />
          </div>

          {/* Lane Status Panel - Takes remaining space */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex-1 min-h-0">
            <LaneStatusPanel compact />
          </div>
        </div>
      </div>

      <style jsx>{`
        .control-center-container {
          width: 100%;
          height: calc(100vh - 140px);
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
}

export default function ControlCenter() {
  return (
    <ControlCenterProvider>
      <ControlCenterContent />
    </ControlCenterProvider>
  );
}
