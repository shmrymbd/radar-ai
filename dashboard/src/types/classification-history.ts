export interface ClassificationHistory {
  _id?: string;
  deviceId: string;
  timestamp: Date;
  timeSlot: string; // "YYYY-MM-DD-HH-MM" format
  vehicleTypes: {
    car: number;
    suv: number;
    truck: number;
    motorcycle: number;
    van: number;
  };
  laneUtilization: {
    lane11: number;
    lane12: number;
    lane31: number;
    lane32: number;
  };
  speedAnalysis: {
    averageSpeed: number;
    speedViolations: number;
    speedDistribution: SpeedRange[];
  };
  totalVehicles: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpeedRange {
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface HistoricalChartData {
  timeSlot: string;
  vehicleTypes: {
    car: number;
    suv: number;
    truck: number;
    motorcycle: number;
    van: number;
  };
  totalVehicles: number;
  averageSpeed: number;
  speedViolations: number;
}

export interface TimePeriodFilter {
  type: '24hrs' | 'yesterday' | 'month';
  startDate: Date;
  endDate: Date;
}

export interface ChartVisualizationOptions {
  chartType: 'histogram' | 'heatmap' | 'trend' | 'comparative';
  timePeriod: TimePeriodFilter;
  vehicleTypes: string[];
  lanes: number[];
  showSpeedAnalysis: boolean;
  showLaneUtilization: boolean;
}
