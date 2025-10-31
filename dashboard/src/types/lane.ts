/**
 * Lane Status Type Definitions
 *
 * Types for lane-specific traffic metrics from ClairWav-T80 radar (0x04 packet)
 */

export interface LaneMetrics {
  /** Lane number (11, 12, 13, 485, etc.) */
  number: number;
  /** Lane status: 0 = Normal, 1 = Fault, 2 = Warning */
  status: number;
}

export interface QueueMetrics {
  /** Queue length in meters */
  length: number;
  /** Number of vehicles in queue */
  vehicles: number;
}

export interface OccupancyMetrics {
  /** Space occupancy percentage (0-100) */
  space: number;
  /** Time occupancy percentage (0-100) */
  time: number;
}

export interface SpeedMetrics {
  /** Average speed in km/h */
  average: number;
  /** 85th percentile speed in km/h */
  percentile85: number;
}

export interface FlowMetrics {
  /** Flow rate in vehicles per hour */
  rate: number;
}

export interface LaneStatusData {
  lane: LaneMetrics;
  queue: QueueMetrics;
  occupancy: OccupancyMetrics;
  speed: SpeedMetrics;
  flow: FlowMetrics;
  /** Timestamp of data collection */
  timestamp: Date;
}

/**
 * Lane status indicator types
 */
export type LaneStatus = 'normal' | 'warning' | 'fault';

/**
 * Occupancy level for color coding
 */
export type OccupancyLevel = 'low' | 'medium' | 'high' | 'critical';
