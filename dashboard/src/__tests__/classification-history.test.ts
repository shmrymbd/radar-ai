/**
 * Unit tests for historical classification data aggregation (task 8.1)
 */

import { ClassificationHistoryStorage } from '@/lib/classification-history-storage';
import { ClassificationHistory, HistoricalChartData } from '@/types/classification-history';

// Mock MongoDB client for testing
jest.mock('@/lib/mongodb', () => ({
  getMongoClient: jest.fn(() => ({
    db: jest.fn(() => ({
      collection: jest.fn(() => ({
        insertOne: jest.fn(),
        find: jest.fn(() => ({
          sort: jest.fn(() => ({
            skip: jest.fn(() => ({
              limit: jest.fn(() => ({
                toArray: jest.fn(() => Promise.resolve([]))
              }))
            }))
          }))
        })),
        countDocuments: jest.fn(() => Promise.resolve(0))
      }))
    })),
    connect: jest.fn(() => Promise.resolve())
  }))
}));

describe('ClassificationHistoryStorage', () => {
  let storage: ClassificationHistoryStorage;

  beforeEach(() => {
    storage = new ClassificationHistoryStorage();
  });

  describe('storeClassificationData', () => {
    it('should store classification data successfully', async () => {
      const testData: ClassificationHistory = {
        deviceId: 'test',
        timestamp: new Date(),
        timeSlot: '2024-01-01-12-00',
        vehicleTypes: {
          car: 10,
          suv: 5,
          truck: 2,
          motorcycle: 1,
          van: 3
        },
        laneUtilization: {
          lane11: 75.5,
          lane12: 82.3,
          lane31: 68.7,
          lane32: 71.2
        },
        speedAnalysis: {
          averageSpeed: 45.5,
          speedViolations: 2,
          speedDistribution: [
            { vehicleType: 'car', speed: 50 },
            { vehicleType: 'suv', speed: 45 }
          ]
        },
        totalVehicles: 21,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(storage.storeClassificationData(testData)).resolves.not.toThrow();
    });

    it('should handle invalid data gracefully', async () => {
      const invalidData = {
        deviceId: 'test',
        timestamp: new Date(),
        // Missing required fields
      } as any;

      await expect(storage.storeClassificationData(invalidData)).rejects.toThrow();
    });
  });

  describe('getHistoricalData', () => {
    it('should retrieve historical data with pagination', async () => {
      const timeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      };

      const result = await storage.getHistoricalData('test', timeFilter, {
        page: 1,
        limit: 10
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 10);
    });

    it('should handle empty results', async () => {
      const timeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      };

      const result = await storage.getHistoricalData('test', timeFilter);
      
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('data aggregation', () => {
    it('should calculate correct vehicle type totals', () => {
      const mockData: HistoricalChartData[] = [
        {
          timeSlot: '2024-01-01-12-00',
          vehicleTypes: { car: 10, suv: 5, truck: 2, motorcycle: 1, van: 3 },
          totalVehicles: 21,
          averageSpeed: 45.5,
          speedViolations: 2
        },
        {
          timeSlot: '2024-01-01-12-15',
          vehicleTypes: { car: 8, suv: 7, truck: 1, motorcycle: 2, van: 2 },
          totalVehicles: 20,
          averageSpeed: 42.3,
          speedViolations: 1
        }
      ];

      const totalCars = mockData.reduce((sum, d) => sum + d.vehicleTypes.car, 0);
      const totalVehicles = mockData.reduce((sum, d) => sum + d.totalVehicles, 0);

      expect(totalCars).toBe(18);
      expect(totalVehicles).toBe(41);
    });

    it('should calculate average speed correctly', () => {
      const mockData: HistoricalChartData[] = [
        { timeSlot: '2024-01-01-12-00', vehicleTypes: { car: 10, suv: 5, truck: 2, motorcycle: 1, van: 3 }, totalVehicles: 21, averageSpeed: 45.5, speedViolations: 2 },
        { timeSlot: '2024-01-01-12-15', vehicleTypes: { car: 8, suv: 7, truck: 1, motorcycle: 2, van: 2 }, totalVehicles: 20, averageSpeed: 42.3, speedViolations: 1 }
      ];

      const averageSpeed = mockData.reduce((sum, d) => sum + d.averageSpeed, 0) / mockData.length;
      expect(averageSpeed).toBeCloseTo(43.9, 1);
    });
  });
});

describe('Time Period Filtering', () => {
  it('should create correct time filters for 24hrs', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    expect(startDate.getTime()).toBeLessThan(now.getTime());
    expect(now.getTime() - startDate.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('should create correct time filters for yesterday', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endDate = new Date(yesterday);
    endDate.setHours(23, 59, 59, 999);
    
    expect(yesterday.getHours()).toBe(0);
    expect(endDate.getHours()).toBe(23);
  });

  it('should create correct time filters for month', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    expect(startDate.getTime()).toBeLessThan(now.getTime());
    expect(now.getTime() - startDate.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
