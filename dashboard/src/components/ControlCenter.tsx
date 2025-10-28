'use client';

import { ControlCenterProvider } from '@/contexts/ControlCenterContext';
import LiveTracking from './LiveTracking';
import LaneStatusPanel from './LaneStatusPanel';
import VideoPanel from './VideoPanel';
import RadarAnalysisCard from './RadarAnalysisCard';

export default function ControlCenter() {
  return (
    <ControlCenterProvider>
      <div className="control-center-container">
        {/* Desktop Layout - Two columns (60/40 split) */}
        <div className="grid grid-cols-[60%_40%] gap-6 h-full">
          {/* PRIMARY COLUMN (60%) - Left Side */}
          <div className="flex flex-col gap-6 overflow-hidden">
            {/* Video Feed - Fixed height 450px */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden" style={{ height: '450px' }}>
              <VideoPanel />
            </div>

            {/* Live Tracking Canvas - Fixed height 600px */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex-1 min-h-0">
              <LiveTracking hideRadarCard />
            </div>
          </div>

          {/* SECONDARY COLUMN (40%) - Right Side */}
          <div className="flex flex-col gap-6 overflow-y-auto">
            {/* Radar Analysis Card - Compact */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden max-h-96">
              <RadarAnalysisCard
                vehicles={[]}
                selectedScenario={0}
                onScenarioChange={() => {}}
              />
            </div>

            {/* Lane Status Panel - Compact Grid */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden max-h-80">
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
    </ControlCenterProvider>
  );
}
