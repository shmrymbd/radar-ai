// Vehicle Classification Types

export interface VehicleClassification {
  vehicleType: string;
  count: number;
  averageSpeed: number;
  speedDistribution: SpeedRange[];
  laneDistribution: LaneCount[];
  timeDistribution: TimeSlot[];
}

export interface ClassificationMetrics {
  totalVehicles: number;
  vehicleTypes: VehicleTypeCount[];
  averageSpeeds: SpeedByType[];
  laneUtilization: LaneUtilization[];
  peakHours: PeakHourAnalysis[];
  timestamp: Date;
}

export interface VehicleTypeCount {
  vehicleType: string;
  count: number;
  percentage: number;
  averageSpeed: number;
  speedRange: {
    min: number;
    max: number;
    median: number;
  };
}

export interface SpeedByType {
  vehicleType: string;
  averageSpeed: number;
  speedDistribution: SpeedRange[];
  violationCount: number;
  violationRate: number;
}

export interface LaneUtilization {
  laneNumber: number;
  totalVehicles: number;
  vehicleTypes: VehicleTypeCount[];
  utilizationRate: number;
  averageSpeed: number;
  occupancyRate: number;
}

export interface PeakHourAnalysis {
  hour: number;
  totalVehicles: number;
  vehicleTypes: VehicleTypeCount[];
  averageSpeed: number;
  trafficDensity: number;
}

export interface SpeedRange {
  range: string;
  count: number;
  percentage: number;
}

export interface LaneCount {
  laneNumber: number;
  count: number;
  percentage: number;
}

export interface TimeSlot {
  timeSlot: string;
  count: number;
  percentage: number;
}

export interface ClassificationFilter {
  vehicleTypes?: string[];
  speedRange?: {
    min: number;
    max: number;
  };
  lanes?: number[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  aggregationPeriod?: '1min' | '15min' | '1hour' | 'daily';
}

export interface ClassificationSummary {
  totalVehicles: number;
  uniqueVehicleTypes: number;
  averageSpeed: number;
  speedViolations: number;
  laneUtilization: number;
  peakHour: number;
  trafficComposition: VehicleTypeCount[];
}

export interface HistoricalClassificationData {
  timestamp: Date;
  metrics: ClassificationMetrics;
  summary: ClassificationSummary;
}

export interface ClassificationExport {
  format: 'csv' | 'json' | 'excel';
  data: ClassificationMetrics[];
  filters: ClassificationFilter;
  generatedAt: Date;
}

// Vehicle type mapping from ClairWav Communication Protocol V2.1 (Section 2.2.2)
// For Video Integrated Radar Models (ClairWav-T24SC/T24LC/T80LC)
export const VEHICLE_TYPE_MAP = {
  0: 'other',
  1: 'bicycle',
  2: 'motorcycle',
  3: 'tricycle',
  4: 'bus',
  5: 'van',
  6: 'car',
  7: 'suv',
  8: 'large_truck',
  9: 'medium_truck',
  10: 'light_truck',
  11: 'dangerous_goods',
  12: 'engineering_vehicle',
  13: 'pedestrian',
  14: 'medium_bus'
} as const;

export type VehicleType = keyof typeof VEHICLE_TYPE_MAP;

// Speed ranges for analysis
export const SPEED_RANGES = [
  { range: '0-20 km/h', min: 0, max: 20 },
  { range: '20-40 km/h', min: 20, max: 40 },
  { range: '40-60 km/h', min: 40, max: 60 },
  { range: '60-80 km/h', min: 60, max: 80 },
  { range: '80+ km/h', min: 80, max: 999 }
] as const;

// Time slots for analysis
export const TIME_SLOTS = [
  '00:00-01:00', '01:00-02:00', '02:00-03:00', '03:00-04:00',
  '04:00-05:00', '05:00-06:00', '06:00-07:00', '07:00-08:00',
  '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
  '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00',
  '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00',
  '20:00-21:00', '21:00-22:00', '22:00-23:00', '23:00-24:00'
] as const;
