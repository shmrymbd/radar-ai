import { PassData, ProcessedPassData } from '@/types/radar';
import {
  ClassificationMetrics,
  VehicleTypeCount,
  SpeedByType,
  LaneUtilization,
  PeakHourAnalysis,
  ClassificationSummary,
  HistoricalClassificationData,
  VEHICLE_TYPE_MAP,
  SPEED_RANGES,
  TIME_SLOTS
} from '@/types/classification';
import { ClassificationHistoryStorage } from './classification-history-storage';
import { ClassificationHistory } from '@/types/classification-history';
import { formatUTC8TimeSlot, getUTC8Hour } from './timezone';

// Note: The Redis poller must be started separately to avoid circular dependencies
// It will continuously poll Redis for PassData and feed it to this processor

// Global storage for classification data (in-memory) - organized by device
let globalClassificationData: Map<string, Map<string, any>> = new Map();
let globalTimeBasedData: Map<string, Map<string, any>> = new Map();

export class ClassificationProcessor {
  private static instance: ClassificationProcessor;
  private classificationData: Map<string, Map<string, any>>;
  private timeBasedData: Map<string, Map<string, any>>;
  private historyStorage: ClassificationHistoryStorage;
  private aggregationTimer: NodeJS.Timeout | null = null;

  public static getInstance(): ClassificationProcessor {
    if (!ClassificationProcessor.instance) {
      ClassificationProcessor.instance = new ClassificationProcessor();
    }
    return ClassificationProcessor.instance;
  }

  private constructor() {
    this.classificationData = globalClassificationData;
    this.timeBasedData = globalTimeBasedData;
    this.historyStorage = new ClassificationHistoryStorage();
    this.initializeHistoryStorage();
    this.startAggregationTimer();
  }

  /**
   * Process PassData for vehicle classification analytics
   * Uses ALL available fields from packet 0x05 (PassData)
   */
  public processPassDataForClassification(data: ProcessedPassData, deviceId: string = 'test'): void {
    // vehicleType is already a string from ProcessedPassData
    const vehicleType = data.vehicleType;
    const timestamp = data.timestamp;
    const hour = getUTC8Hour(timestamp);
    
    console.log(`Processing vehicle: ${vehicleType} at ${timestamp.toISOString()} for device: ${deviceId}`);
    console.log(`Using all PassData fields: lane=${data.laneNumber}, position=${data.crossSectionPosition}, speed=${data.crossSectionSpeed}, headway=${data.headwayTime}, occupancy=${data.occupancyDuration}, status=${data.occupancyStatus}`);
    
    // Update real-time classification data
    this.updateClassificationData(vehicleType, data, deviceId);
    
    // Update time-based aggregation
    this.updateTimeBasedData(vehicleType, data, timestamp, deviceId);
    
    // Update hourly analysis
    this.updateHourlyAnalysis(vehicleType, data, hour, deviceId);
    
    // NEW: Update headway analysis (using headwayTime)
    this.updateHeadwayAnalysis(data, deviceId);
    
    // NEW: Update occupancy analysis (using occupancyDuration and occupancyStatus)
    this.updateOccupancyAnalysis(data, deviceId);
    
    // NEW: Update position analysis (using crossSectionPosition)
    this.updatePositionAnalysis(data, deviceId);
    
    console.log(`Total vehicles after processing for device ${deviceId}: ${this.getTotalVehicleCount(deviceId)}`);
  }

  /**
   * Initialize MongoDB connection for historical storage
   */
  private async initializeHistoryStorage(): Promise<void> {
    try {
      await this.historyStorage.connect();
      console.log('✅ Classification history storage initialized');
    } catch (error) {
      console.error('❌ Failed to initialize history storage:', error);
    }
  }

  /**
   * Start 15-minute aggregation timer
   */
  private startAggregationTimer(): void {
    // Run aggregation every 15 minutes
    this.aggregationTimer = setInterval(() => {
      this.performAggregation();
    }, 15 * 60 * 1000); // 15 minutes in milliseconds
    
    console.log('✅ Started 15-minute aggregation timer for historical data');
  }

  /**
   * Manually trigger aggregation (public method for API calls)
   */
  public async triggerManualAggregation(): Promise<void> {
    console.log('🔄 Manual aggregation triggered');
    await this.performAggregation();
  }

  /**
   * Perform 15-minute data aggregation and store in MongoDB
   */
  private async performAggregation(): Promise<void> {
    try {
      const now = new Date();
      const timeSlot = this.formatTimeSlot(now);

      console.log(`🔄 Performing 15-minute aggregation for time slot: ${timeSlot}`);

      // Get all device IDs that have data
      const deviceIds = Array.from(this.classificationData.keys());

      for (const deviceId of deviceIds) {
        await this.aggregateDeviceData(deviceId, timeSlot, now);
      }

      console.log('✅ Completed 15-minute aggregation');
    } catch (error) {
      console.error('❌ Error during aggregation:', error);
    }
  }

  /**
   * Aggregate data for a specific device and time slot
   */
  private async aggregateDeviceData(deviceId: string, timeSlot: string, timestamp: Date): Promise<void> {
    try {
      const deviceData = this.classificationData.get(deviceId);
      if (!deviceData) return;

      // Calculate vehicle type counts
      const vehicleTypes = {
        car: deviceData.get('car') || 0,
        suv: deviceData.get('suv') || 0,
        truck: deviceData.get('truck') || 0,
        motorcycle: deviceData.get('motorcycle') || 0,
        van: deviceData.get('van') || 0
      };

      // Calculate lane utilization
      const laneUtilization = {
        lane11: deviceData.get('lane11') || 0,
        lane12: deviceData.get('lane12') || 0,
        lane31: deviceData.get('lane31') || 0,
        lane32: deviceData.get('lane32') || 0
      };

      // Calculate speed analysis
      const speedData = deviceData.get('speedData') || [];
      const averageSpeed = speedData.length > 0 
        ? speedData.reduce((sum: number, speed: number) => sum + speed, 0) / speedData.length 
        : 0;
      
      const speedViolations = deviceData.get('speedViolations') || 0;

      // Create historical data object
      const historicalData: ClassificationHistory = {
        deviceId,
        timestamp,
        timeSlot,
        vehicleTypes,
        laneUtilization,
        speedAnalysis: {
          averageSpeed,
          speedViolations,
          speedDistribution: this.calculateSpeedDistribution(speedData)
        },
        totalVehicles: Object.values(vehicleTypes).reduce((sum, count) => sum + count, 0),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in MongoDB
      await this.historyStorage.storeClassificationData(historicalData);
      
      // Reset device data for next aggregation period
      this.resetDeviceData(deviceId);
      
    } catch (error) {
      console.error(`❌ Error aggregating data for device ${deviceId}:`, error);
    }
  }

  /**
   * Format timestamp into time slot string (YYYY-MM-DD-HH-MM) in UTC+8
   */
  private formatTimeSlot(timestamp: Date): string {
    return formatUTC8TimeSlot(timestamp);
  }

  /**
   * Calculate speed distribution for histogram charts
   */
  private calculateSpeedDistribution(speeds: number[]): any[] {
    const ranges = [
      { min: 0, max: 20, count: 0 },
      { min: 20, max: 40, count: 0 },
      { min: 40, max: 60, count: 0 },
      { min: 60, max: 80, count: 0 },
      { min: 80, max: 100, count: 0 },
      { min: 100, max: 200, count: 0 }
    ];

    speeds.forEach(speed => {
      const range = ranges.find(r => speed >= r.min && speed < r.max);
      if (range) range.count++;
    });

    const total = speeds.length;
    return ranges.map(range => ({
      ...range,
      percentage: total > 0 ? (range.count / total) * 100 : 0
    }));
  }

  /**
   * Reset device data after aggregation
   */
  private resetDeviceData(deviceId: string): void {
    const deviceData = this.classificationData.get(deviceId);
    if (deviceData) {
      deviceData.clear();
    }
  }

  /**
   * Get historical data for charting with pagination support
   */
  public async getHistoricalChartData(
    deviceId: string,
    timeFilter: any,
    options?: {
      page?: number;
      limit?: number;
      sortBy?: 'timestamp' | 'totalVehicles';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<any> {
    try {
      return await this.historyStorage.getHistoricalData(deviceId, timeFilter, options);
    } catch (error) {
      console.error('❌ Error getting historical data:', error);
      return {
        data: [],
        pagination: {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }

  /**
   * Get aggregated historical data
   */
  public async getAggregatedHistoricalData(deviceId: string, timeFilter: any): Promise<any> {
    try {
      return await this.historyStorage.getAggregatedData(deviceId, timeFilter);
    } catch (error) {
      console.error('❌ Error getting aggregated data:', error);
    }
  }

  // Data pre-aggregation for common queries (task 7.6)
  private preAggregatedData: Map<string, Map<string, any>> = new Map();
  private preAggregationTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize pre-aggregation for common queries
   */
  private initializePreAggregation(deviceId: string): void {
    if (this.preAggregationTimers.has(deviceId)) {
      return; // Already initialized
    }

    // Pre-aggregate data every 5 minutes for common queries
    const timer = setInterval(async () => {
      try {
        await this.performPreAggregation(deviceId);
      } catch (error) {
        console.error(`❌ Error in pre-aggregation for device ${deviceId}:`, error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    this.preAggregationTimers.set(deviceId, timer);
    
    // Perform initial aggregation
    this.performPreAggregation(deviceId);
  }

  /**
   * Perform pre-aggregation for common query patterns
   */
  private async performPreAggregation(deviceId: string): Promise<void> {
    const now = new Date();
    const commonTimeFilters = [
      {
        name: '24hrs',
        startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        endDate: now
      },
      {
        name: 'yesterday',
        startDate: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      },
      {
        name: 'week',
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate: now
      },
      {
        name: 'month',
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now
      }
    ];

    const aggregatedData = new Map<string, any>();

    for (const timeFilter of commonTimeFilters) {
      try {
        // Get historical data for this time period
        const historicalData = await this.historyStorage.getHistoricalData(
          deviceId,
          {
            type: timeFilter.name as any,
            startDate: timeFilter.startDate,
            endDate: timeFilter.endDate
          },
          { page: 1, limit: 1000 }
        );

        // Pre-calculate common aggregations
        const aggregations = {
          totalVehicles: historicalData.data.reduce((sum, d) => sum + d.totalVehicles, 0),
          vehicleTypeTotals: {
            car: historicalData.data.reduce((sum, d) => sum + d.vehicleTypes.car, 0),
            suv: historicalData.data.reduce((sum, d) => sum + d.vehicleTypes.suv, 0),
            truck: historicalData.data.reduce((sum, d) => sum + d.vehicleTypes.truck, 0),
            motorcycle: historicalData.data.reduce((sum, d) => sum + d.vehicleTypes.motorcycle, 0),
            van: historicalData.data.reduce((sum, d) => sum + d.vehicleTypes.van, 0)
          },
          averageSpeed: historicalData.data.length > 0 
            ? historicalData.data.reduce((sum, d) => sum + d.averageSpeed, 0) / historicalData.data.length 
            : 0,
          totalSpeedViolations: historicalData.data.reduce((sum, d) => sum + d.speedViolations, 0),
          peakHour: this.calculatePeakHour(historicalData.data),
          hourlyDistribution: this.calculateHourlyDistribution(historicalData.data),
          laneUtilization: this.calculateLaneUtilization(historicalData.data),
          timestamp: new Date().toISOString()
        };

        aggregatedData.set(timeFilter.name, aggregations);
      } catch (error) {
        console.error(`❌ Error pre-aggregating ${timeFilter.name} data:`, error);
      }
    }

    this.preAggregatedData.set(deviceId, aggregatedData);
    console.log(`✅ Pre-aggregation completed for device ${deviceId}`);
  }

  /**
   * Calculate peak hour from historical data
   */
  private calculatePeakHour(data: any[]): { hour: number; count: number } {
    const hourlyCounts = new Map<number, number>();
    
    data.forEach(d => {
      const hour = new Date(d.timeSlot.split('-').slice(0, 4).join('-')).getHours();
      hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + d.totalVehicles);
    });

    let peakHour = 0;
    let maxCount = 0;
    
    hourlyCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    });

    return { hour: peakHour, count: maxCount };
  }

  /**
   * Calculate hourly distribution
   */
  private calculateHourlyDistribution(data: any[]): Map<number, number> {
    const hourlyDistribution = new Map<number, number>();
    
    for (let hour = 0; hour < 24; hour++) {
      hourlyDistribution.set(hour, 0);
    }
    
    data.forEach(d => {
      const hour = new Date(d.timeSlot.split('-').slice(0, 4).join('-')).getHours();
      hourlyDistribution.set(hour, (hourlyDistribution.get(hour) || 0) + d.totalVehicles);
    });

    return hourlyDistribution;
  }

  /**
   * Calculate lane utilization averages
   */
  private calculateLaneUtilization(data: any[]): any {
    const lanes = ['lane11', 'lane12', 'lane31', 'lane32'];
    const laneUtilization: any = {};
    
    lanes.forEach(lane => {
      const totalUtilization = data.reduce((sum, d) => 
        sum + (d.laneUtilization?.[lane] || 0), 0
      );
      laneUtilization[lane] = data.length > 0 ? totalUtilization / data.length : 0;
    });

    return laneUtilization;
  }

  /**
   * Get pre-aggregated data for common queries
   */
  public getPreAggregatedData(deviceId: string, timePeriod: string): any | null {
    const deviceData = this.preAggregatedData.get(deviceId);
    if (!deviceData) {
      return null;
    }

    return deviceData.get(timePeriod) || null;
  }

  /**
   * Check if pre-aggregated data is available and fresh
   */
  public isPreAggregatedDataFresh(deviceId: string, timePeriod: string, maxAgeMinutes: number = 10): boolean {
    const data = this.getPreAggregatedData(deviceId, timePeriod);
    if (!data || !data.timestamp) {
      return false;
    }

    const dataAge = Date.now() - new Date(data.timestamp).getTime();
    return dataAge < (maxAgeMinutes * 60 * 1000);
  }

  /**
   * Cleanup method to stop timers and close connections
   */
  public async cleanup(): Promise<void> {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    
    try {
      await this.historyStorage.disconnect();
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Get current classification metrics
   * @param deviceId - Required device ID to scope metrics
   */
  public getClassificationMetrics(deviceId: string): ClassificationMetrics {
    const vehicleTypes = this.calculateVehicleTypeCounts(deviceId);
    const averageSpeeds = this.calculateSpeedByType(deviceId);
    const laneUtilization = this.calculateLaneUtilization(deviceId);
    const peakHours = this.calculatePeakHours(deviceId);

    return {
      totalVehicles: this.getTotalVehicleCount(deviceId),
      vehicleTypes,
      averageSpeeds,
      laneUtilization,
      peakHours,
      timestamp: new Date()
    };
  }

  /**
   * Get classification summary
   * @param deviceId - Required device ID to scope summary
   */
  public getClassificationSummary(deviceId: string): ClassificationSummary {
    const metrics = this.getClassificationMetrics(deviceId);
    const totalVehicles = metrics.totalVehicles;
    const uniqueVehicleTypes = metrics.vehicleTypes.length;
    const averageSpeed = this.calculateOverallAverageSpeed(deviceId);
    const speedViolations = this.calculateSpeedViolations(deviceId);
    const laneUtilization = this.calculateOverallLaneUtilization(deviceId);
    const peakHour = this.findPeakHour(deviceId);

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
   * @param deviceId - Required device ID to scope data
   */
  public getHistoricalData(deviceId: string, startTime: Date, endTime: Date): HistoricalClassificationData[] {
    const historicalData: HistoricalClassificationData[] = [];

    // This would typically query Redis for historical data
    // For now, return current data as historical
    const metrics = this.getClassificationMetrics(deviceId);
    const summary = this.getClassificationSummary(deviceId);

    historicalData.push({
      timestamp: new Date(),
      metrics,
      summary
    });

    return historicalData;
  }

  /**
   * Filter classification data based on criteria
   * @param deviceId - Required device ID to scope data
   */
  public filterClassificationData(deviceId: string, filters: any): ClassificationMetrics {
    // Implement filtering logic
    return this.getClassificationMetrics(deviceId);
  }

  /**
   * Export classification data
   * @param deviceId - Required device ID to scope export
   */
  public exportClassificationData(deviceId: string, format: 'csv' | 'json' | 'excel'): any {
    const metrics = this.getClassificationMetrics(deviceId);
    const summary = this.getClassificationSummary(deviceId);

    return {
      format,
      data: [metrics],
      filters: {},
      generatedAt: new Date()
    };
  }

  private updateClassificationData(vehicleType: string, data: ProcessedPassData, deviceId: string): void {
    // Ensure device data exists
    if (!this.classificationData.has(deviceId)) {
      this.classificationData.set(deviceId, new Map());
    }
    
    const deviceData = this.classificationData.get(deviceId)!;
    const key = `classification_${vehicleType}`;
    const existing = deviceData.get(key) || {
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

    deviceData.set(key, existing);
  }

  private updateTimeBasedData(vehicleType: string, data: ProcessedPassData, timestamp: Date, deviceId: string): void {
    // Ensure device data exists
    if (!this.timeBasedData.has(deviceId)) {
      this.timeBasedData.set(deviceId, new Map());
    }
    
    const deviceData = this.timeBasedData.get(deviceId)!;
    const timeSlot = this.getTimeSlot(timestamp);
    const key = `time_${timeSlot}_${vehicleType}`;
    
    const existing = deviceData.get(key) || {
      count: 0,
      totalSpeed: 0,
      speeds: []
    };

    existing.count++;
    existing.totalSpeed += data.crossSectionSpeed;
    existing.speeds.push(data.crossSectionSpeed);

    deviceData.set(key, existing);
  }

  private updateHourlyAnalysis(vehicleType: string, data: ProcessedPassData, hour: number, deviceId: string): void {
    // Ensure device data exists
    if (!this.timeBasedData.has(deviceId)) {
      this.timeBasedData.set(deviceId, new Map());
    }
    
    const deviceData = this.timeBasedData.get(deviceId)!;
    const key = `hour_${hour}_${vehicleType}`;
    
    const existing = deviceData.get(key) || {
      count: 0,
      totalSpeed: 0,
      speeds: []
    };

    existing.count++;
    existing.totalSpeed += data.crossSectionSpeed;
    existing.speeds.push(data.crossSectionSpeed);

    deviceData.set(key, existing);
  }

  private calculateVehicleTypeCounts(deviceId: string): VehicleTypeCount[] {
    const vehicleTypes: VehicleTypeCount[] = [];
    const totalVehicles = this.getTotalVehicleCount(deviceId);
    
    const deviceData = this.classificationData.get(deviceId);
    if (!deviceData) {
      console.log(`No device data found for deviceId: ${deviceId}`);
      return vehicleTypes;
    }
    
    console.log(`Processing device data for ${deviceId}, entries: ${deviceData.size}`);

    for (const [key, data] of deviceData.entries()) {
      const vehicleType = key.replace('classification_', '');
      const count = data.count;
      const percentage = totalVehicles > 0 ? (count / totalVehicles) * 100 : 0;
      const averageSpeed = data.count > 0 ? data.totalSpeed / data.count : 0;
      
      const speeds = data.speeds ? data.speeds.sort((a: number, b: number) => a - b) : [];
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

  private calculateSpeedByType(deviceId: string): SpeedByType[] {
    const speedByType: SpeedByType[] = [];
    const deviceData = this.classificationData.get(deviceId);
    if (!deviceData) {
      return speedByType;
    }

    for (const [key, data] of deviceData.entries()) {
      const vehicleType = key.replace('classification_', '');
      const averageSpeed = data.count > 0 ? data.totalSpeed / data.count : 0;
      const speeds = data.speeds;
      
      const speedDistribution = SPEED_RANGES.map(range => {
        const count = speeds ? speeds.filter((speed: number) => speed >= range.min && speed < range.max).length : 0;
        return {
          range: range.range,
          count,
          percentage: speeds && speeds.length > 0 ? (count / speeds.length) * 100 : 0
        };
      });

      const violationCount = speeds ? speeds.filter((speed: number) => speed > 60).length : 0; // Assuming 60 km/h speed limit
      const violationRate = speeds && speeds.length > 0 ? (violationCount / speeds.length) * 100 : 0;

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

  private calculateLaneUtilization(deviceId: string): LaneUtilization[] {
    const laneUtilization: LaneUtilization[] = [];
    const laneMap = new Map<number, any>();
    const deviceData = this.classificationData.get(deviceId);
    if (!deviceData) {
      return laneUtilization;
    }

    // Aggregate data by lane
    for (const [key, data] of deviceData.entries()) {
      if (!data.lanes) {
        console.log(`No lanes data for key: ${key}`);
        continue;
      }
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
        data.speeds.reduce((sum: number, speed: number) => sum + speed, 0) / data.speeds.length : 0;
      
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

  private calculatePeakHours(deviceId: string): PeakHourAnalysis[] {
    const peakHours: PeakHourAnalysis[] = [];
    const hourMap = new Map<number, any>();
    const deviceData = this.timeBasedData.get(deviceId);
    if (!deviceData) {
      console.log(`No time-based data found for calculatePeakHours: ${deviceId}`);
      return peakHours;
    }
    
    console.log(`Processing time-based data for ${deviceId}, entries: ${deviceData.size}`);

    // Aggregate data by hour
    try {
      for (const [key, data] of deviceData.entries()) {
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
        data.speeds.reduce((sum: number, speed: number) => sum + speed, 0) / data.speeds.length : 0;
      
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
    } catch (error) {
      console.error(`Error in calculatePeakHours for ${deviceId}:`, error);
      return peakHours;
    }
  }

  private getVehicleTypeName(vehicleTypeCode: number): string {
    return VEHICLE_TYPE_MAP[vehicleTypeCode as keyof typeof VEHICLE_TYPE_MAP] || 'unknown';
  }

  private getTimeSlot(timestamp: Date): string {
    const hour = timestamp.getHours();
    return TIME_SLOTS[hour] || '00:00-01:00';
  }

  private getTotalVehicleCount(deviceId: string): number {
    const deviceData = this.classificationData.get(deviceId);
    if (!deviceData) {
      console.log(`No device data found for getTotalVehicleCount: ${deviceId}`);
      return 0;
    }
    
    let total = 0;
    for (const data of deviceData.values()) {
      if (data && typeof data.count === 'number') {
        total += data.count;
      }
    }
    console.log(`Total vehicles for ${deviceId}: ${total}`);
    return total;
  }

  private calculateOverallAverageSpeed(deviceId: string): number {
    const deviceData = this.classificationData.get(deviceId);
    if (!deviceData) {
      return 0;
    }
    
    let totalSpeed = 0;
    let totalCount = 0;
    
    for (const data of deviceData.values()) {
      totalSpeed += data.totalSpeed;
      totalCount += data.count;
    }
    
    return totalCount > 0 ? totalSpeed / totalCount : 0;
  }

  private calculateSpeedViolations(deviceId: string): number {
    const deviceData = this.classificationData.get(deviceId);
    if (!deviceData) {
      return 0;
    }
    
    let violations = 0;
    for (const data of deviceData.values()) {
      violations += data.speeds ? data.speeds.filter((speed: number) => speed > 60).length : 0; // Assuming 60 km/h speed limit
    }
    return violations;
  }

  private calculateOverallLaneUtilization(deviceId: string): number {
    // Simplified calculation - would need more sophisticated logic
    return 0.75; // Placeholder
  }

  private findPeakHour(deviceId: string): number {
    console.log(`Finding peak hour for device: ${deviceId}`);
    const peakHours = this.calculatePeakHours(deviceId);
    console.log(`Peak hours found: ${peakHours.length}`);
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

  /**
   * NEW: Analyze headway patterns using headwayTime
   */
  private updateHeadwayAnalysis(data: ProcessedPassData, deviceId: string): void {
    // Ensure device data exists
    if (!this.classificationData.has(deviceId)) {
      this.classificationData.set(deviceId, new Map());
    }
    
    const deviceData = this.classificationData.get(deviceId)!;
    const headwayKey = 'headway_analysis';
    const existing = deviceData.get(headwayKey) || {
      totalHeadwayTime: 0,
      headwayCount: 0,
      headwayTimes: [],
      averageHeadway: 0,
      minHeadway: Infinity,
      maxHeadway: 0
    };

    if (data.headwayTime > 0) {
      existing.totalHeadwayTime += data.headwayTime;
      existing.headwayCount++;
      existing.headwayTimes.push(data.headwayTime);
      existing.averageHeadway = existing.totalHeadwayTime / existing.headwayCount;
      existing.minHeadway = Math.min(existing.minHeadway, data.headwayTime);
      existing.maxHeadway = Math.max(existing.maxHeadway, data.headwayTime);
    }

    deviceData.set(headwayKey, existing);
  }

  /**
   * NEW: Analyze occupancy patterns using occupancyDuration and occupancyStatus
   */
  private updateOccupancyAnalysis(data: ProcessedPassData, deviceId: string): void {
    // Ensure device data exists
    if (!this.classificationData.has(deviceId)) {
      this.classificationData.set(deviceId, new Map());
    }
    
    const deviceData = this.classificationData.get(deviceId)!;
    const occupancyKey = 'occupancy_analysis';
    const existing = deviceData.get(occupancyKey) || {
      totalOccupancyDuration: 0,
      occupancyCount: 0,
      enteringCount: 0,
      exitingCount: 0,
      averageOccupancyDuration: 0,
      occupancyDurations: []
    };

    existing.totalOccupancyDuration += data.occupancyDuration;
    existing.occupancyCount++;
    existing.occupancyDurations.push(data.occupancyDuration);
    existing.averageOccupancyDuration = existing.totalOccupancyDuration / existing.occupancyCount;

    if (data.occupancyStatus === 'entering') {
      existing.enteringCount++;
    } else if (data.occupancyStatus === 'exiting') {
      existing.exitingCount++;
    }

    deviceData.set(occupancyKey, existing);
  }

  /**
   * NEW: Analyze position patterns using crossSectionPosition
   */
  private updatePositionAnalysis(data: ProcessedPassData, deviceId: string): void {
    // Ensure device data exists
    if (!this.classificationData.has(deviceId)) {
      this.classificationData.set(deviceId, new Map());
    }
    
    const deviceData = this.classificationData.get(deviceId)!;
    const positionKey = 'position_analysis';
    const existing = deviceData.get(positionKey) || {
      totalPosition: 0,
      positionCount: 0,
      positions: [],
      averagePosition: 0,
      minPosition: Infinity,
      maxPosition: 0
    };

    existing.totalPosition += data.crossSectionPosition;
    existing.positionCount++;
    existing.positions.push(data.crossSectionPosition);
    existing.averagePosition = existing.totalPosition / existing.positionCount;
    existing.minPosition = Math.min(existing.minPosition, data.crossSectionPosition);
    existing.maxPosition = Math.max(existing.maxPosition, data.crossSectionPosition);

    deviceData.set(positionKey, existing);
  }

  /**
   * Get enhanced metrics including all PassData fields analysis
   * @param deviceId - Required device ID to scope metrics
   */
  public getEnhancedClassificationMetrics(deviceId: string): any {
    const baseMetrics = this.getClassificationMetrics(deviceId);
    const deviceData = this.classificationData.get(deviceId);

    if (!deviceData) {
      return {
        ...baseMetrics,
        headwayAnalysis: { averageHeadway: 0, minHeadway: 0, maxHeadway: 0, totalHeadwayTime: 0, headwayCount: 0 },
        occupancyAnalysis: { averageOccupancyDuration: 0, enteringCount: 0, exitingCount: 0, totalOccupancyDuration: 0, occupancyCount: 0 },
        positionAnalysis: { averagePosition: 0, minPosition: 0, maxPosition: 0, totalPosition: 0, positionCount: 0 }
      };
    }

    const headwayAnalysis = deviceData.get('headway_analysis') as any || {};
    const occupancyAnalysis = deviceData.get('occupancy_analysis') as any || {};
    const positionAnalysis = deviceData.get('position_analysis') as any || {};

    return {
      ...baseMetrics,
      headwayAnalysis: {
        averageHeadway: headwayAnalysis.averageHeadway || 0,
        minHeadway: headwayAnalysis.minHeadway === Infinity ? 0 : headwayAnalysis.minHeadway,
        maxHeadway: headwayAnalysis.maxHeadway || 0,
        totalHeadwayTime: headwayAnalysis.totalHeadwayTime || 0,
        headwayCount: headwayAnalysis.headwayCount || 0
      },
      occupancyAnalysis: {
        averageOccupancyDuration: occupancyAnalysis.averageOccupancyDuration || 0,
        enteringCount: occupancyAnalysis.enteringCount || 0,
        exitingCount: occupancyAnalysis.exitingCount || 0,
        totalOccupancyDuration: occupancyAnalysis.totalOccupancyDuration || 0,
        occupancyCount: occupancyAnalysis.occupancyCount || 0
      },
      positionAnalysis: {
        averagePosition: positionAnalysis.averagePosition || 0,
        minPosition: positionAnalysis.minPosition === Infinity ? 0 : positionAnalysis.minPosition,
        maxPosition: positionAnalysis.maxPosition || 0,
        totalPosition: positionAnalysis.totalPosition || 0,
        positionCount: positionAnalysis.positionCount || 0
      }
    };
  }
}
