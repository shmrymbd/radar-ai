'use client';

import { useState } from 'react';
import { ControlCenterProvider } from '@/contexts/ControlCenterContext';
import LiveTracking from './LiveTracking';
import LaneStatusPanel from './LaneStatusPanel';
import VideoPanel from './VideoPanel';
import RadarAnalysisCard from './RadarAnalysisCard';

export default function ControlCenter() {
  const [mobileTab, setMobileTab] = useState<'video' | 'tracking' | 'lanes'>('tracking');

  return (
    <ControlCenterProvider>
      <div className="control-center-container">
        {/* Desktop Layout - Two columns (60/40 split) */}
        <div className="hidden lg:grid lg:grid-cols-[60%_40%] gap-6 h-full">
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

        {/* Tablet Layout - Single column with accordions */}
        <div className="hidden md:block lg:hidden h-full overflow-y-auto">
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md border border-gray-200" style={{ height: '400px' }}>
              <VideoPanel />
            </div>
            <div className="bg-white rounded-lg shadow-md border border-gray-200" style={{ height: '600px' }}>
              <LiveTracking />
            </div>
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <LaneStatusPanel />
            </div>
          </div>
        </div>

        {/* Mobile Layout - Tab/Accordion Pattern */}
        <div className="md:hidden control-center-mobile">
          <div className="mobile-tabs">
            <button
              className={`mobile-tab ${mobileTab === 'video' ? 'active' : ''}`}
              onClick={() => setMobileTab('video')}
              aria-label="Video Feed"
            >
              <span className="text-xl">📹</span>
              <span className="text-sm">Video</span>
            </button>
            <button
              className={`mobile-tab ${mobileTab === 'tracking' ? 'active' : ''}`}
              onClick={() => setMobileTab('tracking')}
              aria-label="Vehicle Tracking"
            >
              <span className="text-xl">🗺️</span>
              <span className="text-sm">Tracking</span>
            </button>
            <button
              className={`mobile-tab ${mobileTab === 'lanes' ? 'active' : ''}`}
              onClick={() => setMobileTab('lanes')}
              aria-label="Lane Status"
            >
              <span className="text-xl">🛣️</span>
              <span className="text-sm">Lanes</span>
            </button>
          </div>

          <div className="mobile-panel-content">
            {mobileTab === 'video' && <VideoPanel />}
            {mobileTab === 'tracking' && <LiveTracking />}
            {mobileTab === 'lanes' && <LaneStatusPanel />}
          </div>
        </div>

        <style jsx>{`
          .control-center-container {
            width: 100%;
            height: calc(100vh - 140px);
            padding: 1.5rem;
          }

          /* Mobile Layout */
          .control-center-mobile {
            display: flex;
            flex-direction: column;
            height: 100%;
          }

          .mobile-tabs {
            display: flex;
            background: white;
            border-bottom: 2px solid #e5e7eb;
            margin-bottom: 1rem;
            border-radius: 0.5rem 0.5rem 0 0;
          }

          .mobile-tab {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0.75rem 0.5rem;
            background: transparent;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            transition: all 0.3s;
            gap: 0.25rem;
          }

          .mobile-tab.active {
            border-bottom-color: #2563eb;
            color: #2563eb;
          }

          .mobile-tab:not(.active) {
            color: #6b7280;
          }

          .mobile-tab:hover:not(.active) {
            background: #f3f4f6;
          }

          .mobile-panel-content {
            flex: 1;
            overflow: hidden;
          }
        `}</style>
      </div>
    </ControlCenterProvider>
  );
}
