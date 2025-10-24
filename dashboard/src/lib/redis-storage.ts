import { getRedisClient } from './redis';
import { ProcessedObjectData, ProcessedLaneStatus, ProcessedPassData, ProcessedTrafficData, ProcessedRegionData } from './radar-processor';

export class RedisStorage {
  private static instance: RedisStorage;
  private keyPrefix: string;
  
  public static getInstance(): RedisStorage {
    if (!RedisStorage.instance) {
      RedisStorage.instance = new RedisStorage();
    }
    return RedisStorage.instance;
  }

  constructor() {
    this.keyPrefix = process.env.REDIS_KEY_PREFIX || 'Radar04';
  }

  /**
   * Store Object Data (0x01) in Redis
   */
  public async storeObjectData(data: ProcessedObjectData): Promise<void> {
    try {
      const key = `${this.keyPrefix}/objectdata`;
      const value = JSON.stringify(data);
      
      // Store with TTL of 1 hour (3600 seconds)
      await redisClient.lpush(key, value);
      await redisClient.expire(key, 3600);
      
      // Keep only last 1000 entries
      await redisClient.ltrim(key, 0, 999);
      
      console.log(`Stored Object Data: ${data.numEntries} vehicles`);
    } catch (error) {
      console.error('Error storing Object Data:', error);
      throw error;
    }
  }

  /**
   * Store Lane Status (0x04) in Redis
   */
  public async storeLaneStatus(data: ProcessedLaneStatus): Promise<void> {
    try {
      const key = `${this.keyPrefix}/lanestatus`;
      const value = JSON.stringify(data);
      
      // Store with TTL of 1 hour
      await redisClient.lpush(key, value);
      await redisClient.expire(key, 3600);
      
      // Keep only last 1000 entries
      await redisClient.ltrim(key, 0, 999);
      
      console.log(`Stored Lane Status: ${data.numEntries} lanes`);
    } catch (error) {
      console.error('Error storing Lane Status:', error);
      throw error;
    }
  }

  /**
   * Store Pass Data (0x05) in Redis
   */
  public async storePassData(data: ProcessedPassData): Promise<void> {
    try {
      const key = `${this.keyPrefix}/passdata`;
      const value = JSON.stringify(data);
      
      // Store with TTL of 2 hours (7200 seconds) - events are less frequent
      await redisClient.lpush(key, value);
      await redisClient.expire(key, 7200);
      
      // Keep only last 500 entries
      await redisClient.ltrim(key, 0, 499);
      
      console.log(`Stored Pass Data: Lane ${data.laneNumber}`);
    } catch (error) {
      console.error('Error storing Pass Data:', error);
      throw error;
    }
  }

  /**
   * Store Traffic Data (0x03) in Redis
   */
  public async storeTrafficData(data: ProcessedTrafficData): Promise<void> {
    try {
      const key = `${this.keyPrefix}/trafficdata`;
      const value = JSON.stringify(data);
      
      // Store with TTL of 24 hours (86400 seconds) - statistical data
      await redisClient.lpush(key, value);
      await redisClient.expire(key, 86400);
      
      // Keep only last 100 entries
      await redisClient.ltrim(key, 0, 99);
      
      console.log(`Stored Traffic Data: Lane ${data.targetLane}`);
    } catch (error) {
      console.error('Error storing Traffic Data:', error);
      throw error;
    }
  }

  /**
   * Store Region Data (0x02) in Redis
   */
  public async storeRegionData(data: ProcessedRegionData): Promise<void> {
    try {
      const key = `${this.keyPrefix}/regiondata`;
      const value = JSON.stringify(data);
      
      // Store with TTL of 24 hours
      await redisClient.lpush(key, value);
      await redisClient.expire(key, 86400);
      
      // Keep only last 100 entries
      await redisClient.ltrim(key, 0, 99);
      
      console.log(`Stored Region Data: Direction ${data.direction}`);
    } catch (error) {
      console.error('Error storing Region Data:', error);
      throw error;
    }
  }

  /**
   * Get latest Object Data from Redis
   */
  public async getLatestObjectData(limit: number = 10): Promise<ProcessedObjectData[]> {
    try {
      const redisClient = await getRedisClient();
      const key = `${this.keyPrefix}/objectdata`;
      // Get the latest entries from the end of the list
      const data = await redisClient.lRange(key, -limit, -1);
      return data.map(item => JSON.parse(item));
    } catch (error) {
      console.error('Error getting Object Data:', error);
      return [];
    }
  }

  /**
   * Get latest Lane Status from Redis
   */
  public async getLatestLaneStatus(limit: number = 10): Promise<ProcessedLaneStatus[]> {
    try {
      const redisClient = await getRedisClient();
      const key = `${this.keyPrefix}/lanestatus`;
      // Get the latest entries from the end of the list
      const data = await redisClient.lRange(key, -limit, -1);
      return data.map(item => JSON.parse(item));
    } catch (error) {
      console.error('Error getting Lane Status:', error);
      return [];
    }
  }

  /**
   * Get latest Pass Data from Redis
   */
  public async getLatestPassData(limit: number = 10): Promise<ProcessedPassData[]> {
    try {
      const redisClient = await getRedisClient();
      const key = `${this.keyPrefix}/passdata`;
      // Get the latest entries from the end of the list
      const data = await redisClient.lRange(key, -limit, -1);
      
      // Process the raw radar data into the expected format
      const processedData: ProcessedPassData[] = [];
      
      for (const item of data) {
        const rawData = JSON.parse(item);
        
        // Extract data from the raw radar structure
        if (rawData.entries && rawData.entries.length > 0) {
          for (const entry of rawData.entries) {
            processedData.push({
              deviceId: rawData.deviceId,
              timestamp: new Date(entry.passing?.time || rawData.timestamp),
              laneNumber: entry.lane?.number || 0,
              crossSectionPosition: entry.crossSection?.position || 0,
              crossSectionSpeed: entry.crossSection?.speed || 0,
              headwayTime: entry.crossSection?.headwayTime || 0,
              occupancyDuration: entry.passing?.occupancyDuration || 0,
              occupancyStatus: entry.passing?.occupancyStatus || 'unknown',
              vehicleType: entry.vehicleType?.name || 'unknown'
            });
          }
        }
      }
      
      return processedData;
    } catch (error) {
      console.error('Error getting Pass Data:', error);
      return [];
    }
  }

  /**
   * Get latest Traffic Data from Redis
   */
  public async getLatestTrafficData(limit: number = 10): Promise<ProcessedTrafficData[]> {
    try {
      const redisClient = await getRedisClient();
      const key = `${this.keyPrefix}/trafficdata`;
      // Get the latest entries from the end of the list
      const data = await redisClient.lRange(key, -limit, -1);
      return data.map(item => JSON.parse(item));
    } catch (error) {
      console.error('Error getting Traffic Data:', error);
      return [];
    }
  }

  /**
   * Get latest Region Data from Redis
   */
  public async getLatestRegionData(limit: number = 10): Promise<ProcessedRegionData[]> {
    try {
      const redisClient = await getRedisClient();
      const key = `${this.keyPrefix}/regiondata`;
      // Get the latest entries from the end of the list
      const data = await redisClient.lRange(key, -limit, -1);
      return data.map(item => JSON.parse(item));
    } catch (error) {
      console.error('Error getting Region Data:', error);
      return [];
    }
  }

  /**
   * Get real-time dashboard summary
   */
  public async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const [objectData, laneStatus, passData, trafficData, regionData] = await Promise.all([
        this.getLatestObjectData(1),
        this.getLatestLaneStatus(1),
        this.getLatestPassData(5),
        this.getLatestTrafficData(1),
        this.getLatestRegionData(1)
      ]);

      return {
        timestamp: new Date(),
        objectData: objectData[0] || null,
        laneStatus: laneStatus[0] || null,
        recentPassEvents: passData,
        trafficData: trafficData[0] || null,
        regionData: regionData[0] || null,
        summary: this.calculateDashboardSummary(objectData[0], laneStatus[0], trafficData[0])
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  private calculateDashboardSummary(
    objectData: ProcessedObjectData | null,
    laneStatus: ProcessedLaneStatus | null,
    trafficData: ProcessedTrafficData | null
  ): DashboardSummaryData {
    // Handle the actual data structure from Redis
    let totalVehicles = 0;
    let averageSpeed = 0;
    let lanesWithQueues = 0;
    let totalVehiclesOnline = 0;
    let averageOccupancyRate = 0;
    let totalFlowRate = 0;
    let trafficDensity = 0;
    const alerts: string[] = [];

    // Process Object Data
    if (objectData) {
      totalVehicles = objectData.numEntries || 0;
      if (objectData.entries && objectData.entries.length > 0) {
        const speeds = objectData.entries
          .filter(entry => entry.speedKmh > 0)
          .map(entry => entry.speedKmh);
        averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
      }
    }

    // Process Lane Status
    if (laneStatus && laneStatus.entries) {
      lanesWithQueues = laneStatus.entries.filter(entry => entry.queue.length > 0).length;
      totalVehiclesOnline = laneStatus.entries.reduce((sum, entry) => sum + entry.vehiclesOnline, 0);
      
      const occupancyRates = laneStatus.entries
        .filter(entry => entry.spaceOccupancyRate > 0)
        .map(entry => entry.spaceOccupancyRate);
      averageOccupancyRate = occupancyRates.length > 0 
        ? occupancyRates.reduce((a, b) => a + b, 0) / occupancyRates.length 
        : 0;

      // Generate alerts for high occupancy or long queues
      laneStatus.entries.forEach(entry => {
        if (entry.spaceOccupancyRate > 80) {
          alerts.push(`High occupancy on Lane ${entry.lane.number}: ${entry.spaceOccupancyRate}%`);
        }
        if (entry.queue.length > 50) {
          alerts.push(`Long queue on Lane ${entry.lane.number}: ${entry.queue.length}m`);
        }
      });
    }

    // Process Traffic Data
    if (trafficData) {
      totalFlowRate = trafficData.vehicleFlowRate || 0;
      trafficDensity = trafficData.trafficDensity || 0;
    }

    return {
      totalVehicles,
      averageSpeed,
      lanesWithQueues,
      totalVehiclesOnline,
      averageOccupancyRate,
      totalFlowRate,
      trafficDensity,
      alerts
    };
  }

  /**
   * Clear all radar data from Redis
   */
  public async clearAllData(): Promise<void> {
    try {
      const keys = [
        `${this.keyPrefix}/objectdata`,
        `${this.keyPrefix}/lanestatus`,
        `${this.keyPrefix}/passdata`,
        `${this.keyPrefix}/trafficdata`,
        `${this.keyPrefix}/regiondata`
      ];

      await Promise.all(keys.map(key => redisClient.del(key)));
      console.log('Cleared all radar data from Redis');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  /**
   * Get Redis connection status
   */
  public async getConnectionStatus(): Promise<boolean> {
    try {
      await redisClient.ping();
      return true;
    } catch (error) {
      console.error('Redis connection error:', error);
      return false;
    }
  }
}

// Dashboard summary types
export interface DashboardSummary {
  timestamp: Date;
  objectData: ProcessedObjectData | null;
  laneStatus: ProcessedLaneStatus | null;
  recentPassEvents: ProcessedPassData[];
  trafficData: ProcessedTrafficData | null;
  regionData: ProcessedRegionData | null;
  summary: DashboardSummaryData;
}

export interface DashboardSummaryData {
  totalVehicles: number;
  averageSpeed: number;
  lanesWithQueues: number;
  totalVehiclesOnline: number;
  averageOccupancyRate: number;
  totalFlowRate: number;
  trafficDensity: number;
  alerts: string[];
}
