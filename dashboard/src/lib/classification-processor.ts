import { PassData, ProcessedPassData } from '@/types/radar';
import { 
  ClassificationMetrics, 
  VehicleTypeCount, 
  SpeedByType, 
  LaneUtilization, 
  PeakHourAnalysis,
  ClassificationSummary,
  VEHICLE_TYPE_MAP,
  SPEED_RANGES,
  TIME_SLOTS
} from '@/types/classification';

export class ClassificationProcessor {
  private static instance: ClassificationProcessor;
  private classificationData: Map<string, any> = new Map();
  private timeBasedData: Map<string, any> = new Map();

  public static getInstance(): ClassificationProcessor {
    if (!ClassificationProcessor.instance) {
      ClassificationProcessor.instance = new ClassificationProcessor();
    }
    return ClassificationProcessor.instance;
  }

  /**
   * Process PassData for vehicle classification analytics
   */
  public processPassDataForClassification(data: ProcessedPassData): void {
    const vehicleType = this.getVehicleTypeName(data.vehicleType);
    const timestamp = data.timestamp;
    const hour = timestamp.getHours();
    
    // Update real-time classification data
    this.updateClassificationData(vehicleType, data);
    
    // Update time-based aggregation
    this.updateTimeBasedData(vehicleType, data, timestamp);
    
    // Update hourly analysis
    this.updateHourlyAnalysis(vehicleType, data, hour);
  }

  /**
   * Get current classification metrics
   */
  public getClassificationMetrics(): ClassificationMetrics {
    const vehicleTypes = this.calculateVehicleTypeCounts();
    const averageSpeeds = this.calculateSpeedByType();
    const laneUtilization = this.calculateLaneUtilization();
    const peakHours = this.calculatePeakHours();

    return {
      totalVehicles: this.getTotalVehicleCount(),
      vehicleTypes,
      averageSpeeds,
      laneUtilization,
      peakHours,
      timestamp: new Date()
    };
  }

  /**
   * Get classification summary
   */
  public getClassificationSummary(): ClassificationSummary {
    const metrics = this.getClassificationMetrics();
    const totalVehicles = metrics.totalVehicles;
    const uniqueVehicleTypes = metrics.vehicleTypes.length;
    const averageSpeed = this.calculateOverallAverageSpeed();
    const speedViolations = this.calculateSpeedViolations();
    const laneUtilization = this.calculateOverallLaneUtilization();
    const peakHour = this.findPeakHour();

    return {
      totalVehicles,
      uniqueVehicleTypes,
      averageSpeed,
      speedViolations,
      laneUtilization,
      peakHour,
      trafficComposition: metrics.vehicleTypes
    };
  }

  /**
   * Get historical classification data for time range
   */
  public getHistoricalData(startTime: Date, endTime: Date): HistoricalClassificationData[] {
    const historicalData: HistoricalClassificationData[] = [];
    
    // This would typically query Redis for historical data
    // For now, return current data as historical
    const metrics = this.getClassificationMetrics();
    const summary = this.getClassificationSummary();
    
    historicalData.push({
      timestamp: new Date(),
      metrics,
      summary
    });

    return historicalData;
  }

  /**
   * Filter classification data based on criteria
   */
  public filterClassificationData(filters: any): ClassificationMetrics {
    // Implement filtering logic
    return this.getClassificationMetrics();
  }

  /**
   * Export classification data
   */
  public exportClassificationData(format: 'csv' | 'json' | 'excel'): any {
    const metrics = this.getClassificationMetrics();
    const summary = this.getClassificationSummary();
    
    return {
      format,
      data: [metrics],
      filters: {},
      generatedAt: new Date()
    };
  }

  private updateClassificationData(vehicleType: string, data: ProcessedPassData): void {
    const key = `classification_${vehicleType}`;
    const existing = this.classificationData.get(key) || {
      count: 0,
      totalSpeed: 0,
      speeds: [],
      lanes: new Map(),
      timestamps: []
    };

    existing.count++;
    existing.totalSpeed += data.crossSectionSpeed;
    existing.speeds.push(data.crossSectionSpeed);
    existing.lanes.set(data.laneNumber, (existing.lanes.get(data.laneNumber) || 0) + 1);
    existing.timestamps.push(data.timestamp);

    this.classificationData.set(key, existing);
  }

  private updateTimeBasedData(vehicleType: string, data: ProcessedPassData, timestamp: Date): void {
    const timeSlot = this.getTimeSlot(timestamp);
    const key = `time_${timeSlot}_${vehicleType}`;
    
    const existing = this.timeBasedData.get(key) || {
      count: 0,
      totalSpeed: 0,
      speeds: []
    };

    existing.count++;
    existing.totalSpeed += data.crossSectionSpeed;
    existing.speeds.push(data.crossSectionSpeed);

    this.timeBasedData.set(key, existing);
  }

  private updateHourlyAnalysis(vehicleType: string, data: ProcessedPassData, hour: number): void {
    const key = `hour_${hour}_${vehicleType}`;
    
    const existing = this.timeBasedData.get(key) || {
      count: 0,
      totalSpeed: 0,
      speeds: []
    };

    existing.count++;
    existing.totalSpeed += data.crossSectionSpeed;
    existing.speeds.push(data.crossSectionSpeed);

    this.timeBasedData.set(key, existing);
  }

  private calculateVehicleTypeCounts(): VehicleTypeCount[] {
    const vehicleTypes: VehicleTypeCount[] = [];
    const totalVehicles = this.getTotalVehicleCount();

    for (const [key, data] of this.classificationData.entries()) {
      const vehicleType = key.replace('classification_', '');
      const count = data.count;
      const percentage = totalVehicles > 0 ? (count / totalVehicles) * 100 : 0;
      const averageSpeed = data.count > 0 ? data.totalSpeed / data.count : 0;
      
      const speeds = data.speeds.sort((a, b) => a - b);
      const speedRange = {
        min: speeds[0] || 0,
        max: speeds[speeds.length - 1] || 0,
        median: speeds[Math.floor(speeds.length / 2)] || 0
      };

      vehicleTypes.push({
        vehicleType,
        count,
        percentage,
        averageSpeed,
        speedRange
      });
    }

    return vehicleTypes.sort((a, b) => b.count - a.count);
  }

  private calculateSpeedByType(): SpeedByType[] {
    const speedByType: SpeedByType[] = [];

    for (const [key, data] of this.classificationData.entries()) {
      const vehicleType = key.replace('classification_', '');
      const averageSpeed = data.count > 0 ? data.totalSpeed / data.count : 0;
      const speeds = data.speeds;
      
      const speedDistribution = SPEED_RANGES.map(range => {
        const count = speeds.filter(speed => speed >= range.min && speed < range.max).length;
        return {
          range: range.range,
          count,
          percentage: speeds.length > 0 ? (count / speeds.length) * 100 : 0
        };
      });

      const violationCount = speeds.filter(speed => speed > 60).length; // Assuming 60 km/h speed limit
      const violationRate = speeds.length > 0 ? (violationCount / speeds.length) * 100 : 0;

      speedByType.push({
        vehicleType,
        averageSpeed,
        speedDistribution,
        violationCount,
        violationRate
      });
    }

    return speedByType;
  }

  private calculateLaneUtilization(): LaneUtilization[] {
    const laneUtilization: LaneUtilization[] = [];
    const laneMap = new Map<number, any>();

    // Aggregate data by lane
    for (const [key, data] of this.classificationData.entries()) {
      for (const [laneNumber, count] of data.lanes.entries()) {
        if (!laneMap.has(laneNumber)) {
          laneMap.set(laneNumber, {
            totalVehicles: 0,
            vehicleTypes: new Map(),
            totalSpeed: 0,
            speeds: []
          });
        }
        
        const laneData = laneMap.get(laneNumber);
        laneData.totalVehicles += count;
        laneData.vehicleTypes.set(key.replace('classification_', ''), count);
        laneData.totalSpeed += data.totalSpeed;
        laneData.speeds.push(...data.speeds);
      }
    }

    // Convert to LaneUtilization format
    for (const [laneNumber, data] of laneMap.entries()) {
      const vehicleTypes: VehicleTypeCount[] = [];
      for (const [vehicleType, count] of data.vehicleTypes.entries()) {
        vehicleTypes.push({
          vehicleType,
          count,
          percentage: data.totalVehicles > 0 ? (count / data.totalVehicles) * 100 : 0,
          averageSpeed: 0, // Would need to calculate per vehicle type
          speedRange: { min: 0, max: 0, median: 0 }
        });
      }

      const averageSpeed = data.speeds.length > 0 ? 
        data.speeds.reduce((sum, speed) => sum + speed, 0) / data.speeds.length : 0;
      
      const utilizationRate = this.calculateLaneUtilizationRate(laneNumber, data.totalVehicles);
      const occupancyRate = this.calculateOccupancyRate(laneNumber, data.totalVehicles);

      laneUtilization.push({
        laneNumber,
        totalVehicles: data.totalVehicles,
        vehicleTypes,
        utilizationRate,
        averageSpeed,
        occupancyRate
      });
    }

    return laneUtilization.sort((a, b) => a.laneNumber - b.laneNumber);
  }

  private calculatePeakHours(): PeakHourAnalysis[] {
    const peakHours: PeakHourAnalysis[] = [];
    const hourMap = new Map<number, any>();

    // Aggregate data by hour
    for (const [key, data] of this.timeBasedData.entries()) {
      if (key.startsWith('hour_')) {
        const hour = parseInt(key.split('_')[1]);
        const vehicleType = key.split('_')[2];
        
        if (!hourMap.has(hour)) {
          hourMap.set(hour, {
            totalVehicles: 0,
            vehicleTypes: new Map(),
            totalSpeed: 0,
            speeds: []
          });
        }
        
        const hourData = hourMap.get(hour);
        hourData.totalVehicles += data.count;
        hourData.vehicleTypes.set(vehicleType, data.count);
        hourData.totalSpeed += data.totalSpeed;
        hourData.speeds.push(...data.speeds);
      }
    }

    // Convert to PeakHourAnalysis format
    for (const [hour, data] of hourMap.entries()) {
      const vehicleTypes: VehicleTypeCount[] = [];
      for (const [vehicleType, count] of data.vehicleTypes.entries()) {
        vehicleTypes.push({
          vehicleType,
          count,
          percentage: data.totalVehicles > 0 ? (count / data.totalVehicles) * 100 : 0,
          averageSpeed: 0,
          speedRange: { min: 0, max: 0, median: 0 }
        });
      }

      const averageSpeed = data.speeds.length > 0 ? 
        data.speeds.reduce((sum, speed) => sum + speed, 0) / data.speeds.length : 0;
      
      const trafficDensity = this.calculateTrafficDensity(hour, data.totalVehicles);

      peakHours.push({
        hour,
        totalVehicles: data.totalVehicles,
        vehicleTypes,
        averageSpeed,
        trafficDensity
      });
    }

    return peakHours.sort((a, b) => b.totalVehicles - a.totalVehicles);
  }

  private getVehicleTypeName(vehicleTypeCode: number): string {
    return VEHICLE_TYPE_MAP[vehicleTypeCode as keyof typeof VEHICLE_TYPE_MAP] || 'unknown';
  }

  private getTimeSlot(timestamp: Date): string {
    const hour = timestamp.getHours();
    return TIME_SLOTS[hour];
  }

  private getTotalVehicleCount(): number {
    let total = 0;
    for (const data of this.classificationData.values()) {
      total += data.count;
    }
    return total;
  }

  private calculateOverallAverageSpeed(): number {
    let totalSpeed = 0;
    let totalCount = 0;
    
    for (const data of this.classificationData.values()) {
      totalSpeed += data.totalSpeed;
      totalCount += data.count;
    }
    
    return totalCount > 0 ? totalSpeed / totalCount : 0;
  }

  private calculateSpeedViolations(): number {
    let violations = 0;
    for (const data of this.classificationData.values()) {
      violations += data.speeds.filter(speed => speed > 60).length; // Assuming 60 km/h speed limit
    }
    return violations;
  }

  private calculateOverallLaneUtilization(): number {
    // Simplified calculation - would need more sophisticated logic
    return 0.75; // Placeholder
  }

  private findPeakHour(): number {
    const peakHours = this.calculatePeakHours();
    return peakHours.length > 0 ? peakHours[0].hour : 0;
  }

  private calculateLaneUtilizationRate(laneNumber: number, vehicleCount: number): number {
    // Simplified calculation - would need lane capacity data
    return Math.min(vehicleCount / 100, 1); // Placeholder
  }

  private calculateOccupancyRate(laneNumber: number, vehicleCount: number): number {
    // Simplified calculation - would need lane length and vehicle length data
    return Math.min(vehicleCount / 50, 1); // Placeholder
  }

  private calculateTrafficDensity(hour: number, vehicleCount: number): number {
    // Simplified calculation - would need intersection area data
    return vehicleCount / 1000; // Placeholder
  }
}
