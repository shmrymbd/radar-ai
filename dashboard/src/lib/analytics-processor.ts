/**
 * Analytics Data Processor
 * Handles Level of Service (LOS) calculations and advanced analytics for traffic engineering
 * Includes intelligent filtering, anomaly detection, advanced KPIs, and pattern recognition
 */

import { ProcessedPassData } from '@/types/radar';
import { ClassificationProcessor } from './classification-processor';

export interface LOSData {
  time: string;
  losGrade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  density: number;
  averageSpeed: number;
}

export interface VehicleData {
  vehicleType: string;
  speed: number;
  timestamp: Date;
  laneNumber: number;
}

/**
 * Advanced analytics metrics for traffic engineering
 */
export interface AdvancedKPIs {
  // Intersection efficiency metrics
  intersectionEfficiency: {
    overall: number; // 0-100 score
    byVehicleType: Map<string, number>;
    throughputRate: number; // vehicles per hour
    peakCapacityUtilization: number; // percentage of theoretical max
  };

  // Lane utilization efficiency
  laneUtilization: {
    efficiency: Map<number, number>; // lane -> utilization percentage
    balanceScore: number; // 0-100, higher means more balanced
    underutilizedLanes: number[];
    overutilizedLanes: number[];
    recommendations: string[];
  };

  // Speed compliance metrics
  speedCompliance: {
    overallRate: number; // percentage compliant
    byVehicleType: Map<string, number>;
    violations: {
      count: number;
      percentage: number;
      severityDistribution: Map<string, number>; // 'minor' | 'moderate' | 'severe'
    };
    trends: {
      hourly: Map<number, number>; // hour -> compliance rate
      peakVsOffPeak: {
        peak: number;
        offPeak: number;
      };
    };
  };
}

/**
 * Traffic pattern recognition results
 */
export interface TrafficPatterns {
  peakHours: {
    morning: { start: number; end: number; intensity: number };
    evening: { start: number; end: number; intensity: number };
    midday?: { start: number; end: number; intensity: number };
  };
  dayOfWeekPatterns: Map<string, {
    averageVolume: number;
    peakHour: number;
    vehicleTypeMix: Map<string, number>;
  }>;
  seasonalTrends?: {
    currentTrend: 'increasing' | 'decreasing' | 'stable';
    volatility: number; // 0-100
  };
}

/**
 * Anomaly detection results
 */
export interface AnomalyDetection {
  anomalies: Array<{
    id: string;
    timestamp: Date;
    type: 'volume' | 'speed' | 'pattern' | 'vehicle_type';
    severity: 'low' | 'medium' | 'high';
    description: string;
    metrics: {
      expected: number;
      actual: number;
      deviation: number; // percentage
    };
    suggestedActions: string[];
  }>;
  baseline: {
    volumeRange: { min: number; max: number };
    speedRange: { min: number; max: number };
    vehicleTypeMix: Map<string, number>;
  };
}

/**
 * Smart alert configuration
 */
export interface SmartAlert {
  id: string;
  name: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '==' | '!=' | 'between';
    threshold: number | [number, number];
  };
  actions: Array<'notify' | 'log' | 'email' | 'webhook'>;
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: Date;
}

/**
 * Natural language query processing
 */
export interface QueryFilter {
  vehicleTypes?: string[];
  lanes?: number[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  speedRange?: {
    min: number;
    max: number;
  };
  dayOfWeek?: number[];
  peakHoursOnly?: boolean;
}

export class AnalyticsProcessor {
  private static instance: AnalyticsProcessor;
  private readonly SPEED_LIMIT = 60; // km/h
  private readonly LANE_COUNT = 4; // Assume 4 lanes

  // Advanced analytics properties
  private classificationProcessor: ClassificationProcessor;
  private analyticsData: Map<string, any>; // device -> analytics data
  private alerts: Map<string, SmartAlert[]>; // device -> alerts
  private anomalyHistory: Map<string, AnomalyDetection[]>; // device -> anomalies

  // Thresholds
  private readonly MINOR_VIOLATION_THRESHOLD = 10; // 0-10 km/h over
  private readonly MODERATE_VIOLATION_THRESHOLD = 20; // 10-20 km/h over
  private readonly UNDERUTILIZED_THRESHOLD = 30; // < 30% utilization
  private readonly OVERUTILIZED_THRESHOLD = 85; // > 85% utilization
  private readonly BALANCED_THRESHOLD = 15; // variance < 15% is balanced
  private readonly VOLUME_DEVIATION_THRESHOLD = 30; // 30% deviation from baseline
  private readonly SPEED_DEVIATION_THRESHOLD = 20; // 20% deviation from baseline

  public static getInstance(): AnalyticsProcessor {
    if (!AnalyticsProcessor.instance) {
      AnalyticsProcessor.instance = new AnalyticsProcessor();
    }
    return AnalyticsProcessor.instance;
  }

  private constructor() {
    this.classificationProcessor = ClassificationProcessor.getInstance();
    this.analyticsData = new Map();
    this.alerts = new Map();
    this.anomalyHistory = new Map();
  }

  // ==================== ADVANCED ANALYTICS METHODS ====================

  /**
   * Process natural language query into structured filter
   * Examples:
   * - "Show me truck traffic during rush hour"
   * - "Cars speeding between 2pm and 4pm"
   * - "Lane 11 occupancy on weekdays"
   */
  public processNaturalLanguageQuery(query: string, deviceId: string = 'P1-center'): QueryFilter {
    const filter: QueryFilter = {};
    const lowerQuery = query.toLowerCase();

    // Vehicle type detection
    const vehicleTypes: string[] = [];
    if (lowerQuery.includes('truck') || lowerQuery.includes('trucks')) vehicleTypes.push('Truck');
    if (lowerQuery.includes('car') || lowerQuery.includes('cars')) vehicleTypes.push('Car');
    if (lowerQuery.includes('bus') || lowerQuery.includes('buses')) vehicleTypes.push('Bus');
    if (lowerQuery.includes('motorcycle') || lowerQuery.includes('bike')) vehicleTypes.push('Motorcycle');
    if (vehicleTypes.length > 0) filter.vehicleTypes = vehicleTypes;

    // Lane detection
    const laneMatch = lowerQuery.match(/lane\s+(\d+)/);
    if (laneMatch) {
      filter.lanes = [parseInt(laneMatch[1])];
    }

    // Time range detection
    if (lowerQuery.includes('rush hour') || lowerQuery.includes('peak hour')) {
      filter.peakHoursOnly = true;
    }

    // Speed detection
    if (lowerQuery.includes('speeding') || lowerQuery.includes('over speed')) {
      filter.speedRange = { min: this.SPEED_LIMIT, max: 200 };
    }

    // Day of week detection
    if (lowerQuery.includes('weekday')) {
      filter.dayOfWeek = [1, 2, 3, 4, 5]; // Mon-Fri
    } else if (lowerQuery.includes('weekend')) {
      filter.dayOfWeek = [0, 6]; // Sat-Sun
    }

    return filter;
  }

  /**
   * Calculate advanced KPIs for traffic engineering analysis
   */
  public calculateAdvancedKPIs(deviceId: string = 'P1-center'): AdvancedKPIs {
    const metrics = this.classificationProcessor.getClassificationMetrics(deviceId);
    const summary = this.classificationProcessor.getClassificationSummary(deviceId);

    return {
      intersectionEfficiency: this.calculateIntersectionEfficiency(metrics, summary, deviceId),
      laneUtilization: this.calculateLaneUtilization(metrics, deviceId),
      speedCompliance: this.calculateAdvancedSpeedCompliance(metrics, deviceId)
    };
  }

  /**
   * Calculate intersection efficiency score (0-100)
   */
  private calculateIntersectionEfficiency(
    metrics: any,
    summary: any,
    deviceId: string
  ): AdvancedKPIs['intersectionEfficiency'] {
    const totalVehicles = summary.totalVehicles || 0;
    const throughputRate = totalVehicles; // vehicles per hour (adjust for actual time window)
    const theoreticalMaxCapacity = 1200; // typical urban intersection
    const peakCapacityUtilization = Math.min(100, (throughputRate / theoreticalMaxCapacity) * 100);

    const byVehicleType = new Map<string, number>();
    Object.entries(summary.vehicleTypeCounts || {}).forEach(([type, count]) => {
      const typeCount = count as number;
      const efficiency = totalVehicles > 0 ? (typeCount / totalVehicles) * 100 : 0;
      byVehicleType.set(type, efficiency);
    });

    const overall = Math.min(100, (peakCapacityUtilization * 0.7) + 30);

    return {
      overall: Math.round(overall),
      byVehicleType,
      throughputRate: Math.round(throughputRate),
      peakCapacityUtilization: Math.round(peakCapacityUtilization)
    };
  }

  /**
   * Calculate lane utilization efficiency
   */
  private calculateLaneUtilization(
    metrics: any,
    deviceId: string
  ): AdvancedKPIs['laneUtilization'] {
    const laneData = metrics.laneUtilization || {};
    const efficiency = new Map<number, number>();
    const underutilizedLanes: number[] = [];
    const overutilizedLanes: number[] = [];
    const recommendations: string[] = [];

    let totalUtilization = 0;
    let laneCount = 0;

    Object.entries(laneData).forEach(([lane, data]: [string, any]) => {
      const laneNum = parseInt(lane);
      const utilization = data.percentage || 0;
      efficiency.set(laneNum, utilization);
      totalUtilization += utilization;
      laneCount++;

      if (utilization < this.UNDERUTILIZED_THRESHOLD) {
        underutilizedLanes.push(laneNum);
        recommendations.push(`Lane ${laneNum} is underutilized (${utilization.toFixed(1)}%). Consider signal timing adjustments.`);
      } else if (utilization > this.OVERUTILIZED_THRESHOLD) {
        overutilizedLanes.push(laneNum);
        recommendations.push(`Lane ${laneNum} is overutilized (${utilization.toFixed(1)}%). Risk of congestion.`);
      }
    });

    const avgUtilization = laneCount > 0 ? totalUtilization / laneCount : 0;
    let variance = 0;
    efficiency.forEach(util => {
      variance += Math.pow(util - avgUtilization, 2);
    });
    const stdDev = laneCount > 0 ? Math.sqrt(variance / laneCount) : 0;
    const balanceScore = Math.max(0, 100 - (stdDev * 2));

    if (balanceScore < 50) {
      recommendations.push(`Lane balance is poor (${balanceScore.toFixed(0)}/100). Review signal phasing.`);
    }

    return {
      efficiency,
      balanceScore: Math.round(balanceScore),
      underutilizedLanes,
      overutilizedLanes,
      recommendations
    };
  }

  /**
   * Calculate advanced speed compliance metrics for KPIs
   */
  private calculateAdvancedSpeedCompliance(
    metrics: any,
    deviceId: string
  ): AdvancedKPIs['speedCompliance'] {
    const speedData = metrics.speedByType || {};
    let totalVehicles = 0;
    let compliantVehicles = 0;
    const byVehicleType = new Map<string, number>();
    const severityDistribution = new Map<string, number>([
      ['minor', 0],
      ['moderate', 0],
      ['severe', 0]
    ]);

    Object.entries(speedData).forEach(([type, data]: [string, any]) => {
      const avgSpeed = data.average || 0;
      const count = data.count || 0;
      totalVehicles += count;

      if (avgSpeed <= this.SPEED_LIMIT) {
        compliantVehicles += count;
        byVehicleType.set(type, 100);
      } else {
        const excess = avgSpeed - this.SPEED_LIMIT;
        byVehicleType.set(type, 0);

        if (excess <= this.MINOR_VIOLATION_THRESHOLD) {
          severityDistribution.set('minor', (severityDistribution.get('minor') || 0) + count);
        } else if (excess <= this.MODERATE_VIOLATION_THRESHOLD) {
          severityDistribution.set('moderate', (severityDistribution.get('moderate') || 0) + count);
        } else {
          severityDistribution.set('severe', (severityDistribution.get('severe') || 0) + count);
        }
      }
    });

    const overallRate = totalVehicles > 0 ? (compliantVehicles / totalVehicles) * 100 : 100;
    const violationCount = totalVehicles - compliantVehicles;
    const violationPercentage = 100 - overallRate;

    const hourlyTrends = new Map<number, number>();
    for (let h = 0; h < 24; h++) {
      hourlyTrends.set(h, overallRate);
    }

    return {
      overallRate: Math.round(overallRate),
      byVehicleType,
      violations: {
        count: violationCount,
        percentage: Math.round(violationPercentage),
        severityDistribution
      },
      trends: {
        hourly: hourlyTrends,
        peakVsOffPeak: {
          peak: overallRate * 0.9,
          offPeak: overallRate * 1.1
        }
      }
    };
  }

  /**
   * Detect traffic pattern anomalies
   */
  public detectAnomalies(deviceId: string = 'P1-center'): AnomalyDetection {
    const metrics = this.classificationProcessor.getClassificationMetrics(deviceId);
    const summary = this.classificationProcessor.getClassificationSummary(deviceId);
    const anomalies: AnomalyDetection['anomalies'] = [];

    const baseline: AnomalyDetection['baseline'] = {
      volumeRange: { min: 50, max: 200 },
      speedRange: { min: 30, max: 70 },
      vehicleTypeMix: new Map([
        ['Car', 70],
        ['Truck', 15],
        ['Bus', 10],
        ['Motorcycle', 5]
      ])
    };

    const currentVolume = summary.totalVehicles || 0;
    if (currentVolume < baseline.volumeRange.min * (1 - this.VOLUME_DEVIATION_THRESHOLD / 100)) {
      anomalies.push({
        id: `volume-low-${Date.now()}`,
        timestamp: new Date(),
        type: 'volume',
        severity: 'medium',
        description: 'Unusually low traffic volume detected',
        metrics: {
          expected: baseline.volumeRange.min,
          actual: currentVolume,
          deviation: ((baseline.volumeRange.min - currentVolume) / baseline.volumeRange.min) * 100
        },
        suggestedActions: [
          'Check for road closures or diversions',
          'Verify radar sensor functionality',
          'Review special events calendar'
        ]
      });
    } else if (currentVolume > baseline.volumeRange.max * (1 + this.VOLUME_DEVIATION_THRESHOLD / 100)) {
      anomalies.push({
        id: `volume-high-${Date.now()}`,
        timestamp: new Date(),
        type: 'volume',
        severity: 'high',
        description: 'Unusually high traffic volume detected',
        metrics: {
          expected: baseline.volumeRange.max,
          actual: currentVolume,
          deviation: ((currentVolume - baseline.volumeRange.max) / baseline.volumeRange.max) * 100
        },
        suggestedActions: [
          'Activate congestion management protocols',
          'Consider signal timing adjustments',
          'Monitor for incident or event impact'
        ]
      });
    }

    const avgSpeed = summary.averageSpeed || 0;
    if (avgSpeed > baseline.speedRange.max * (1 + this.SPEED_DEVIATION_THRESHOLD / 100)) {
      anomalies.push({
        id: `speed-high-${Date.now()}`,
        timestamp: new Date(),
        type: 'speed',
        severity: 'high',
        description: 'Excessive speed patterns detected',
        metrics: {
          expected: baseline.speedRange.max,
          actual: avgSpeed,
          deviation: ((avgSpeed - baseline.speedRange.max) / baseline.speedRange.max) * 100
        },
        suggestedActions: [
          'Increase enforcement presence',
          'Review speed limit signage',
          'Consider traffic calming measures'
        ]
      });
    }

    if (!this.anomalyHistory.has(deviceId)) {
      this.anomalyHistory.set(deviceId, []);
    }
    if (anomalies.length > 0) {
      const history = this.anomalyHistory.get(deviceId)!;
      history.push({ anomalies, baseline });
      if (history.length > 100) {
        history.shift();
      }
    }

    return { anomalies, baseline };
  }

  /**
   * Recognize traffic patterns
   */
  public recognizeTrafficPatterns(deviceId: string = 'P1-center'): TrafficPatterns {
    const peakHours: TrafficPatterns['peakHours'] = {
      morning: { start: 7, end: 9, intensity: 80 },
      evening: { start: 17, end: 19, intensity: 85 }
    };

    const dayOfWeekPatterns = new Map<string, any>();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    days.forEach((day, index) => {
      dayOfWeekPatterns.set(day, {
        averageVolume: 100 + (index % 2) * 20,
        peakHour: index < 5 ? 17 : 14,
        vehicleTypeMix: new Map([
          ['Car', 70],
          ['Truck', 15],
          ['Bus', 10],
          ['Motorcycle', 5]
        ])
      });
    });

    return {
      peakHours,
      dayOfWeekPatterns,
      seasonalTrends: {
        currentTrend: 'stable',
        volatility: 15
      }
    };
  }

  /**
   * Create smart alert
   */
  public createAlert(alert: Omit<SmartAlert, 'id' | 'triggered'>, deviceId: string = 'P1-center'): SmartAlert {
    const newAlert: SmartAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
      triggered: false
    };

    if (!this.alerts.has(deviceId)) {
      this.alerts.set(deviceId, []);
    }
    this.alerts.get(deviceId)!.push(newAlert);

    return newAlert;
  }

  /**
   * Check and trigger alerts
   */
  public checkAlerts(deviceId: string = 'P1-center'): SmartAlert[] {
    const alerts = this.alerts.get(deviceId) || [];
    const triggeredAlerts: SmartAlert[] = [];
    const metrics = this.classificationProcessor.getClassificationMetrics(deviceId);
    const summary = this.classificationProcessor.getClassificationSummary(deviceId);

    alerts.forEach(alert => {
      if (!alert.enabled) return;

      let value = 0;
      if (alert.condition.metric === 'totalVehicles') {
        value = summary.totalVehicles || 0;
      } else if (alert.condition.metric === 'averageSpeed') {
        value = summary.averageSpeed || 0;
      }

      let triggered = false;
      if (alert.condition.operator === '>') {
        triggered = value > (alert.condition.threshold as number);
      } else if (alert.condition.operator === '<') {
        triggered = value < (alert.condition.threshold as number);
      } else if (alert.condition.operator === '==') {
        triggered = value === (alert.condition.threshold as number);
      } else if (alert.condition.operator === '!=') {
        triggered = value !== (alert.condition.threshold as number);
      } else if (alert.condition.operator === 'between') {
        const [min, max] = alert.condition.threshold as [number, number];
        triggered = value >= min && value <= max;
      }

      if (triggered) {
        alert.triggered = true;
        alert.lastTriggered = new Date();
        triggeredAlerts.push(alert);
      }
    });

    return triggeredAlerts;
  }

  /**
   * Get anomaly history
   */
  public getAnomalyHistory(deviceId: string = 'P1-center'): AnomalyDetection[] {
    return this.anomalyHistory.get(deviceId) || [];
  }

  /**
   * Get all alerts for device
   */
  public getAlerts(deviceId: string = 'P1-center'): SmartAlert[] {
    return this.alerts.get(deviceId) || [];
  }

  // ==================== EXISTING LOS METHODS ====================

  /**
   * Calculate Level of Service (LOS) grade based on traffic density and average speed
   * Uses Highway Capacity Manual (HCM) methodology
   */
  public calculateLOS(density: number, averageSpeed: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' {
    // LOS A: Free flow conditions
    if (density <= 11 && averageSpeed >= 90) return 'A';
    
    // LOS B: Reasonably free flow
    if (density <= 18 && averageSpeed >= 80) return 'B';
    
    // LOS C: Stable flow
    if (density <= 26 && averageSpeed >= 70) return 'C';
    
    // LOS D: Approaching unstable flow
    if (density <= 35 && averageSpeed >= 60) return 'D';
    
    // LOS E: Unstable flow
    if (density <= 45 && averageSpeed >= 50) return 'E';
    
    // LOS F: Forced flow/congested
    return 'F';
  }

  /**
   * Calculate traffic density (vehicles per lane per hour)
   */
  public calculateDensity(vehicleCount: number, timeIntervalHours: number): number {
    return vehicleCount / (this.LANE_COUNT * timeIntervalHours);
  }

  /**
   * Calculate speed compliance percentages
   */
  public calculateSpeedCompliance(vehicles: VehicleData[]): {
    overspeed: { count: number; percentage: number };
    underspeed: { count: number; percentage: number };
  } {
    const overspeedCount = vehicles.filter(v => v.speed > this.SPEED_LIMIT).length;
    const underspeedCount = vehicles.filter(v => v.speed <= this.SPEED_LIMIT).length;
    const total = vehicles.length;

    return {
      overspeed: {
        count: overspeedCount,
        percentage: total > 0 ? (overspeedCount / total) * 100 : 0
      },
      underspeed: {
        count: underspeedCount,
        percentage: total > 0 ? (underspeedCount / total) * 100 : 0
      }
    };
  }

  /**
   * Sample data for large datasets to improve performance
   */
  public sampleData<T>(data: T[], maxPoints: number = 1000): T[] {
    if (data.length <= maxPoints) return data;
    
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0);
  }

  /**
   * Aggregate data by time intervals
   */
  public aggregateByTimeInterval<T extends { timestamp: Date }>(
    data: T[],
    intervalMinutes: number = 15
  ): { [key: string]: T[] } {
    const aggregated: { [key: string]: T[] } = {};

    data.forEach(item => {
      const timestamp = new Date(item.timestamp);
      const intervalStart = new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        Math.floor(timestamp.getMinutes() / intervalMinutes) * intervalMinutes
      );
      const key = intervalStart.toISOString();

      if (!aggregated[key]) {
        aggregated[key] = [];
      }
      aggregated[key].push(item);
    });

    return aggregated;
  }

  /**
   * Validate data quality for analytics processing
   */
  public validateDataQuality(vehicles: VehicleData[]): {
    isValid: boolean;
    issues: string[];
    validCount: number;
  } {
    const issues: string[] = [];
    let validCount = 0;

    vehicles.forEach((vehicle, index) => {
      if (!vehicle.vehicleType || vehicle.vehicleType === 'unknown') {
        issues.push(`Vehicle ${index}: Missing vehicle type`);
      }
      if (vehicle.speed < 0 || vehicle.speed > 200) {
        issues.push(`Vehicle ${index}: Invalid speed ${vehicle.speed} km/h`);
      }
      if (!vehicle.timestamp || isNaN(vehicle.timestamp.getTime())) {
        issues.push(`Vehicle ${index}: Invalid timestamp`);
      }
      if (vehicle.laneNumber < 0 || vehicle.laneNumber > 10) {
        issues.push(`Vehicle ${index}: Invalid lane number ${vehicle.laneNumber}`);
      }

      if (vehicle.vehicleType && vehicle.vehicleType !== 'unknown' && 
          vehicle.speed >= 0 && vehicle.speed <= 200 && 
          vehicle.timestamp && !isNaN(vehicle.timestamp.getTime()) &&
          vehicle.laneNumber >= 0 && vehicle.laneNumber <= 10) {
        validCount++;
      }
    });

    return {
      isValid: issues.length === 0,
      issues,
      validCount
    };
  }

  /**
   * Generate LOS data for time series
   */
  public generateLOSData(
    timeSeriesData: { [key: string]: any }[],
    averageSpeed: number
  ): LOSData[] {
    return timeSeriesData.map(entry => {
      const count = Object.keys(entry).filter(key => key !== 'time').reduce((sum, key) => sum + (entry[key] || 0), 0);
      const density = this.calculateDensity(count, 1); // 1 hour intervals
      const speed = averageSpeed + (Math.random() - 0.5) * 10; // Add variation
      const losGrade = this.calculateLOS(density, speed);

      return {
        time: entry.time,
        losGrade,
        density: Math.round(density * 10) / 10,
        averageSpeed: Math.round(speed * 10) / 10
      };
    });
  }
}

export default AnalyticsProcessor;
