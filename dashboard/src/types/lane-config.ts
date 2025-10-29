/**
 * Lane Configuration Types
 *
 * Allows custom naming and configuration of lanes per device
 */

export interface LaneThresholds {
  queueLength: number;        // meters - above this shows "Queued"
  speedLow: number;            // km/h - below this triggers alert
  speedHigh: number;           // km/h - above this triggers alert
  occupancyHigh: number;       // % - above this triggers alert
  vehicleCountHigh: number;    // number - above this triggers alert
}

export interface LaneAlerts {
  enableQueueAlert: boolean;
  enableSpeedAlert: boolean;
  enableOccupancyAlert: boolean;
  enableVehicleCountAlert: boolean;
}

export interface LaneDisplayOptions {
  showQueue: boolean;
  showVehicles: boolean;
  showSpeed: boolean;
  showOccupancy: boolean;
}

export type LaneDirection = 'incoming' | 'outgoing';

export interface LaneConfig {
  laneNumber: number;
  customName: string;
  enabled: boolean;
  direction: LaneDirection;  // incoming or outgoing traffic
  thresholds: LaneThresholds;
  alerts: LaneAlerts;
  displayOptions: LaneDisplayOptions;
}

export interface DeviceLaneConfig {
  _id?: string;
  deviceId: string;
  lanes: LaneConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LaneConfigResponse {
  success: boolean;
  data?: DeviceLaneConfig;
  error?: string;
}

// Default values
export const DEFAULT_LANE_THRESHOLDS: LaneThresholds = {
  queueLength: 5,        // 5 meters
  speedLow: 10,          // 10 km/h
  speedHigh: 80,         // 80 km/h
  occupancyHigh: 70,     // 70%
  vehicleCountHigh: 10   // 10 vehicles
};

export const DEFAULT_LANE_ALERTS: LaneAlerts = {
  enableQueueAlert: true,
  enableSpeedAlert: false,
  enableOccupancyAlert: true,
  enableVehicleCountAlert: false
};

export const DEFAULT_DISPLAY_OPTIONS: LaneDisplayOptions = {
  showQueue: true,
  showVehicles: true,
  showSpeed: true,
  showOccupancy: true
};

export const DEFAULT_LANE_DIRECTION: LaneDirection = 'incoming';
