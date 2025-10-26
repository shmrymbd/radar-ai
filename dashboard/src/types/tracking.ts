// Live Vehicle Tracking Types

export interface VehiclePosition {
  targetId: string;
  x: number; // Radar X coordinate in meters
  y: number; // Radar Y coordinate in meters
  length: number; // Vehicle length in meters
  width: number; // Vehicle width in meters
  height: number; // Vehicle height in meters
  speed: number; // Speed in km/h
  vehicleType: string; // Vehicle classification
  laneNo: number; // Lane number
  timestamp: Date; // Detection timestamp
  xSpeed: number; // X velocity component
  ySpeed: number; // Y velocity component
  acceleration: number; // Acceleration in m/s²
}

export interface VehicleState {
  targetId: string;
  position: VehiclePosition;
  previousPosition?: VehiclePosition;
  trajectory: VehiclePosition[]; // Recent position history
  isVisible: boolean; // Whether vehicle is in detection zone
  lastSeen: Date; // Last detection timestamp
  enterTime: Date; // When vehicle entered detection zone
}

export interface TrackingUpdate {
  type: 'vehicle_update' | 'vehicle_enter' | 'vehicle_exit' | 'vehicle_move';
  timestamp: number;
  vehicles: VehiclePosition[];
}

export interface VehicleTrackingData {
  timestamp: Date;
  vehicles: VehicleState[];
  totalVehicles: number;
  vehiclesInZone: number;
  averageSpeed: number;
  trafficDensity: number;
}

export interface CoordinateTransform {
  radarToVisual(radarX: number, radarY: number): { x: number; y: number };
  visualToRadar(screenX: number, screenY: number): { x: number; y: number };
}

export interface VehicleRenderOptions {
  showTrails: boolean;
  showSpeedVectors: boolean;
  showVehicleDetails: boolean;
  filterByLane?: number;
  filterByType?: string;
  zoomLevel: number;
  panX: number;
  panY: number;
}

export interface LaneBoundary {
  laneNumber: number;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  description: string;
}

export interface DetectionZone {
  minX: number; // -15m
  maxX: number; // +15m
  minY: number; // 0m
  maxY: number; // 300m
  centerX: number; // 0m
  centerY: number; // 150m
}

// Vehicle classification colors
export const VEHICLE_COLORS = {
  car: '#3B82F6',      // Blue
  truck: '#EF4444',    // Red
  motorcycle: '#10B981', // Green
  bus: '#F59E0B',      // Orange
  van: '#8B5CF6',      // Purple
  suv: '#06B6D4',      // Cyan
  unknown: '#6B7280'   // Gray
} as const;

// Speed-based color intensity
export const SPEED_COLORS = {
  slow: 0.6,    // 0-20 km/h
  medium: 0.8,  // 20-50 km/h
  fast: 1.0     // 50+ km/h
} as const;

// Canvas configuration
export const CANVAS_CONFIG = {
  width: 1800,
  height: 1200,
  scale: 4, // 1 pixel = 0.25m (higher resolution for better detail)
  updateRate: 10, // 10Hz
  maxTrailLength: 50,
  vehicleMinSize: 10, // Minimum vehicle size in pixels (increased for visibility)
  vehicleMaxSize: 80 // Maximum vehicle size in pixels (increased for visibility)
} as const;

// Lane configuration for visualization
export const LANE_BOUNDARIES: LaneBoundary[] = [
  {
    laneNumber: 11,
    startX: -15,
    endX: -5,
    startY: 0,
    endY: 300,
    description: 'Lane 11 (Left)'
  },
  {
    laneNumber: 12,
    startX: -5,
    endX: 5,
    startY: 0,
    endY: 300,
    description: 'Lane 12 (Center)'
  },
  {
    laneNumber: 31,
    startX: 5,
    endX: 15,
    startY: 0,
    endY: 300,
    description: 'Lane 31 (Right)'
  }
];

// Detection zone configuration
export const DETECTION_ZONE: DetectionZone = {
  minX: -15,
  maxX: 15,
  minY: 0,
  maxY: 300,
  centerX: 0,
  centerY: 150
};
