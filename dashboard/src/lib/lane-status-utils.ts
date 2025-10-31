/**
 * Lane Status Utility Functions
 *
 * Helper functions for lane status indicators and color coding
 */

import { LaneStatus, OccupancyLevel } from '@/types/lane';

/**
 * Get occupancy level and color based on percentage thresholds
 *
 * @param percentage - Occupancy percentage (0-100)
 * @returns Object with level and Tailwind CSS color classes
 */
export function getOccupancyColor(percentage: number): {
  level: OccupancyLevel;
  bgColor: string;
  textColor: string;
} {
  if (percentage >= 80) {
    return {
      level: 'critical',
      bgColor: 'bg-red-500',
      textColor: 'text-red-700'
    };
  } else if (percentage >= 60) {
    return {
      level: 'high',
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-700'
    };
  } else if (percentage >= 40) {
    return {
      level: 'medium',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-700'
    };
  } else {
    return {
      level: 'low',
      bgColor: 'bg-green-500',
      textColor: 'text-green-700'
    };
  }
}

/**
 * Get lane status indicator based on status code
 *
 * @param statusCode - Lane status: 0 = Normal, 1 = Fault, 2 = Warning
 * @returns Object with status type, label, and color classes
 */
export function getStatusIndicator(statusCode: number): {
  status: LaneStatus;
  label: string;
  dotColor: string;
  textColor: string;
} {
  switch (statusCode) {
    case 1:
      return {
        status: 'fault',
        label: 'Fault',
        dotColor: 'bg-red-500',
        textColor: 'text-red-700'
      };
    case 2:
      return {
        status: 'warning',
        label: 'Warning',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-700'
      };
    case 0:
    default:
      return {
        status: 'normal',
        label: 'Normal',
        dotColor: 'bg-green-500',
        textColor: 'text-green-700'
      };
  }
}

/**
 * Format speed for display with units
 *
 * @param speed - Speed in km/h
 * @returns Formatted speed string
 */
export function formatSpeed(speed: number): string {
  return `${speed.toFixed(1)} km/h`;
}

/**
 * Format flow rate for display
 *
 * @param rate - Flow rate in vehicles/hour
 * @returns Formatted flow string
 */
export function formatFlowRate(rate: number): string {
  return `${Math.round(rate)} veh/hr`;
}

/**
 * Format queue length for display
 *
 * @param length - Queue length in meters
 * @returns Formatted queue length string
 */
export function formatQueueLength(length: number): string {
  return `${length.toFixed(1)} m`;
}

/**
 * Format occupancy percentage for display
 *
 * @param percentage - Occupancy percentage (0-100)
 * @returns Formatted percentage string
 */
export function formatOccupancy(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}
