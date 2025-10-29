'use client';

import { LaneStatusData } from '@/types/lane';
import {
  getOccupancyColor,
  getStatusIndicator,
  formatSpeed,
  formatFlowRate,
  formatQueueLength,
  formatOccupancy
} from '@/lib/lane-status-utils';

interface LaneStatusCardProps {
  data: LaneStatusData;
  compact?: boolean;
  customName?: string;
}

export default function LaneStatusCard({ data, compact = false, customName }: LaneStatusCardProps) {
  const displayName = customName || `Lane ${data.lane.number}`;
  const statusInfo = getStatusIndicator(data.lane.status);
  const spaceOccupancy = getOccupancyColor(data.occupancy.space);
  const timeOccupancy = getOccupancyColor(data.occupancy.time);

  if (compact) {
    // Determine if lane has queue
    const hasQueue = data.queue.length > 0;
    const statusBadgeColor = hasQueue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    const statusText = hasQueue ? 'Queued' : 'Free Flow';

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
        {/* Compact Header with Badge */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">{displayName}</h3>
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusBadgeColor}`}>
            {statusText}
          </span>
        </div>

        {/* Compact Metrics - Simple Text Rows */}
        <div className="space-y-1 text-xs text-gray-600">
          <div>Queue: <span className="text-gray-900 font-medium">{formatQueueLength(data.queue.length)}</span></div>
          <div>Vehicles: <span className="text-gray-900 font-medium">{data.queue.vehicles}</span></div>
          <div>Speed: <span className="text-gray-900 font-medium">{formatSpeed(data.speed.average)}</span></div>
          <div>Occupancy: <span className="text-gray-900 font-medium">{formatOccupancy(data.occupancy.space)}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Lane Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{displayName}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Updated: {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.dotColor}`}></div>
          <span className={`text-sm font-medium ${statusInfo.textColor}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="space-y-3">
        {/* Queue Metrics */}
        <div className="bg-gray-50 rounded-md p-3">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Queue</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Length</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatQueueLength(data.queue.length)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Vehicles</p>
              <p className="text-sm font-semibold text-gray-900">
                {data.queue.vehicles}
              </p>
            </div>
          </div>
        </div>

        {/* Occupancy Metrics */}
        <div className="bg-gray-50 rounded-md p-3">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Occupancy</h4>

          {/* Space Occupancy */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1 group">
                <p className="text-xs text-gray-500">Space</p>
                <div className="relative">
                  <svg
                    className="w-3 h-3 text-gray-400 cursor-help"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    title="Percentage of lane length covered by vehicles"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg">
                    <strong>Space Occupancy:</strong> % of lane length covered by vehicles. Indicates physical congestion level.
                    <div className="absolute bottom-0 left-2 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                  </div>
                </div>
              </div>
              <p className={`text-xs font-semibold ${spaceOccupancy.textColor}`}>
                {formatOccupancy(data.occupancy.space)}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${spaceOccupancy.bgColor} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(data.occupancy.space, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Time Occupancy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1 group">
                <p className="text-xs text-gray-500">Time</p>
                <div className="relative">
                  <svg
                    className="w-3 h-3 text-gray-400 cursor-help"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    title="Percentage of time detection point is occupied"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg">
                    <strong>Time Occupancy:</strong> % of time vehicles are present at detection point. Indicates flow rate and demand.
                    <div className="absolute bottom-0 left-2 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                  </div>
                </div>
              </div>
              <p className={`text-xs font-semibold ${timeOccupancy.textColor}`}>
                {formatOccupancy(data.occupancy.time)}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${timeOccupancy.bgColor} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(data.occupancy.time, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Speed Metrics */}
        <div className="bg-gray-50 rounded-md p-3">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Speed</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Average</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatSpeed(data.speed.average)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">85th %ile</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatSpeed(data.speed.percentile85)}
              </p>
            </div>
          </div>
        </div>

        {/* Flow Metrics */}
        <div className="bg-gray-50 rounded-md p-3">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Flow</h4>
          <div>
            <p className="text-xs text-gray-500">Rate</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatFlowRate(data.flow.rate)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
