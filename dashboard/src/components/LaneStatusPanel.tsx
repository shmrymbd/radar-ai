'use client';

import { useState } from 'react';
import { useControlCenter } from '@/contexts/ControlCenterContext';
import LaneStatusCard from './LaneStatusCard';
import LaneConfigModal from './LaneConfigModal';
import { useLaneConfig } from '@/hooks/useLaneConfig';

interface LaneStatusPanelProps {
  compact?: boolean;
}

export default function LaneStatusPanel({ compact = false }: LaneStatusPanelProps) {
  const { laneStatus, lastLaneUpdate } = useControlCenter();
  const { getLaneName } = useLaneConfig();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Extract unique lane numbers from lane status data
  const detectedLanes = Array.from(new Set(laneStatus.map(l => l.lane.number))).filter(n => n !== 0);

  return (
    <div className="h-full bg-gray-50 rounded-lg border border-gray-200 flex flex-col">
      {/* Panel Header - Compact version */}
      <div className={`bg-white border-b border-gray-200 rounded-t-lg ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>Lane Status</h3>
            {!compact && (
              <p className="text-xs text-gray-500 mt-1">
                Real-time lane metrics and traffic flow
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* Info Button */}
            {!compact && (
              <button
                onClick={() => setShowInfo(!showInfo)}
                className={`p-2 rounded-lg transition-colors ${
                  showInfo
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title="Understanding Occupancy Metrics"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Configure Lane Names"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {lastLaneUpdate && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Last Update</p>
                <p className="text-xs font-medium text-gray-700">
                  {lastLaneUpdate.toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Occupancy Information Panel */}
      {showInfo && !compact && (
        <div className="bg-blue-50 border-b border-blue-100 p-4 animate-fadeIn">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Understanding Occupancy Metrics
          </h4>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Space Occupancy Explanation */}
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <h5 className="font-semibold text-gray-900 text-sm mb-2">Space Occupancy</h5>
              <p className="text-xs text-gray-600 mb-2">
                <strong>What it measures:</strong> Percentage of lane length covered by vehicles
              </p>
              <p className="text-xs text-gray-600 mb-2">
                <strong>Formula:</strong> (Total Vehicle Length / Lane Length) × 100%
              </p>
              <p className="text-xs text-gray-600">
                <strong>Tells you:</strong> Physical congestion level, queue density, capacity usage
              </p>
            </div>

            {/* Time Occupancy Explanation */}
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <h5 className="font-semibold text-gray-900 text-sm mb-2">Time Occupancy</h5>
              <p className="text-xs text-gray-600 mb-2">
                <strong>What it measures:</strong> Percentage of time detection point is occupied
              </p>
              <p className="text-xs text-gray-600 mb-2">
                <strong>Formula:</strong> (Time with Vehicles / Total Time) × 100%
              </p>
              <p className="text-xs text-gray-600">
                <strong>Tells you:</strong> Flow rate, service level, bottleneck detection
              </p>
            </div>
          </div>

          {/* Color-coded Thresholds */}
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <h5 className="font-semibold text-gray-900 text-sm mb-3">Traffic Level Indicators</h5>
            <div className="grid grid-cols-4 gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-xs font-medium text-gray-900">&lt;30%</p>
                  <p className="text-xs text-gray-500">Light traffic</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div>
                  <p className="text-xs font-medium text-gray-900">30-60%</p>
                  <p className="text-xs text-gray-500">Moderate</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div>
                  <p className="text-xs font-medium text-gray-900">60-85%</p>
                  <p className="text-xs text-gray-500">Heavy traffic</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-900"></div>
                <div>
                  <p className="text-xs font-medium text-gray-900">&gt;85%</p>
                  <p className="text-xs text-gray-500">Congestion</p>
                </div>
              </div>
            </div>
          </div>

          {/* Traffic Signal Decision Context */}
          <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
            <h5 className="font-semibold text-indigo-900 text-sm mb-2 flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Traffic Signal Decision Engine
            </h5>
            <p className="text-xs text-indigo-900">
              <strong>High space + High time:</strong> Congestion with continuous demand → Priority green phase<br/>
              <strong>High space + Low time:</strong> Queue clearing → Extend green slightly<br/>
              <strong>Low space + High time:</strong> Continuous flow at speed → Maintain green<br/>
              <strong>Low space + Low time:</strong> Light traffic → Give phase to other approaches
            </p>
          </div>
        </div>
      )}

      {/* Lane Cards Container - Grid layout for compact mode */}
      <div className={`flex-1 overflow-y-auto ${compact ? 'p-3' : 'p-4'}`}>
        {laneStatus.length === 0 ? (
          // No Data State - Compact version
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className={`bg-gray-200 rounded-full flex items-center justify-center mb-3 ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}>
              <svg
                className={`text-gray-400 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h4 className={`font-medium text-gray-900 mb-2 ${compact ? 'text-sm' : 'text-lg'}`}>No Lane Data</h4>
            {!compact && (
              <p className="text-sm text-gray-500 max-w-xs">
                Lane status metrics will appear here when data is available from the radar system.
              </p>
            )}
          </div>
        ) : (
          // Lane Cards - 3-column grid for compact mode, single column for regular
          <div className={compact ? 'grid grid-cols-3 gap-2' : 'space-y-4'}>
            {laneStatus.map((lane, index) => (
              <LaneStatusCard
                key={`lane-${lane.lane.number}-${index}`}
                data={lane}
                compact={compact}
                customName={getLaneName(lane.lane.number)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lane Configuration Modal */}
      <LaneConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        lanes={detectedLanes}
      />

      {/* Auto-refresh indicator - Hidden in compact mode */}
      {!compact && laneStatus.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-3 rounded-b-lg">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Auto-refreshing every 3 seconds</span>
          </div>
        </div>
      )}
    </div>
  );
}
