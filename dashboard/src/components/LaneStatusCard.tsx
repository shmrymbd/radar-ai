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
}

export default function LaneStatusCard({ data, compact = false }: LaneStatusCardProps) {
  const statusInfo = getStatusIndicator(data.lane.status);
  const spaceOccupancy = getOccupancyColor(data.occupancy.space);
  const timeOccupancy = getOccupancyColor(data.occupancy.time);

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm hover:shadow-md transition-shadow">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900">Lane {data.lane.number}</h3>
          <div className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`}></div>
        </div>

        {/* Compact Metrics - Single Column */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Queue:</span>
            <span className="font-semibold">{formatQueueLength(data.queue.length)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Vehicles:</span>
            <span className="font-semibold">{data.queue.vehicles}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Speed:</span>
            <span className="font-semibold">{formatSpeed(data.speed.average)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Occupancy:</span>
            <span className={`font-semibold ${spaceOccupancy.textColor}`}>
              {formatOccupancy(data.occupancy.space)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Lane Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Lane {data.lane.number}</h3>
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
              <p className="text-xs text-gray-500">Space</p>
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
              <p className="text-xs text-gray-500">Time</p>
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
