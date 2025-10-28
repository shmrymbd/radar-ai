'use client';

import { useControlCenter } from '@/contexts/ControlCenterContext';
import LaneStatusCard from './LaneStatusCard';

interface LaneStatusPanelProps {
  compact?: boolean;
}

export default function LaneStatusPanel({ compact = false }: LaneStatusPanelProps) {
  const { laneStatus, lastLaneUpdate } = useControlCenter();

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
          // Lane Cards - 2-column grid for compact mode
          <div className={compact ? 'grid grid-cols-2 gap-3' : 'space-y-4'}>
            {laneStatus.map((lane, index) => (
              <LaneStatusCard key={`lane-${lane.lane.number}-${index}`} data={lane} compact={compact} />
            ))}
          </div>
        )}
      </div>

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
