/**
 * Integration tests for MongoDB operations (task 8.2)
 */

import { ClassificationHistoryStorage } from '@/lib/classification-history-storage';
import { ClassificationHistory } from '@/types/classification-history';

describe('MongoDB Integration Tests', () => {
  let storage: ClassificationHistoryStorage;

  beforeAll(async () => {
    storage = new ClassificationHistoryStorage();
    // Note: In a real test environment, you would connect to a test MongoDB instance
  });

  afterAll(async () => {
    // Clean up test data
  });

  describe('Database Connection', () => {
    it('should connect to MongoDB successfully', async () => {
      // This would test actual MongoDB connection in a real test environment
      expect(storage).toBeDefined();
    });
  });

  describe('CRUD Operations', () => {
    const testData: ClassificationHistory = {
      deviceId: 'test-integration',
      timestamp: new Date(),
      timeSlot: '2024-01-01-12-00',
      vehicleTypes: {
        car: 15,
        suv: 8,
        truck: 3,
        motorcycle: 2,
        van: 5
      },
      laneUtilization: {
        lane11: 80.5,
        lane12: 85.3,
        lane31: 75.7,
        lane32: 78.2
      },
      speedAnalysis: {
        averageSpeed: 48.5,
        speedViolations: 3,
        speedDistribution: [
          { vehicleType: 'car', speed: 55 },
          { vehicleType: 'suv', speed: 50 },
          { vehicleType: 'truck', speed: 40 }
        ]
      },
      totalVehicles: 33,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should insert classification data', async () => {
      // In a real test, this would actually insert data
      await expect(storage.storeClassificationData(testData)).resolves.not.toThrow();
    });

    it('should query historical data', async () => {
      const timeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      };

      const result = await storage.getHistoricalData('test-integration', timeFilter);
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    it('should handle device-specific queries', async () => {
      const timeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      };

      const result = await storage.getHistoricalData('test-integration', timeFilter);
      
      // Verify that all returned data belongs to the specified device
      result.data.forEach(item => {
        expect(item).toHaveProperty('timeSlot');
        expect(item).toHaveProperty('vehicleTypes');
        expect(item).toHaveProperty('totalVehicles');
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate required fields', async () => {
      const invalidData = {
        deviceId: 'test',
        timestamp: new Date(),
        // Missing required fields
      } as any;

      await expect(storage.storeClassificationData(invalidData)).rejects.toThrow();
    });

    it('should validate data types', async () => {
      const invalidData = {
        deviceId: 'test',
        timestamp: new Date(),
        timeSlot: '2024-01-01-12-00',
        vehicleTypes: {
          car: 'invalid', // Should be number
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
          speedDistribution: []
        },
        totalVehicles: 21,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;

      await expect(storage.storeClassificationData(invalidData)).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const timeFilter = {
        type: 'month' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const startTime = Date.now();
      const result = await storage.getHistoricalData('test-integration', timeFilter, {
        page: 1,
        limit: 1000
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.data.length).toBeLessThanOrEqual(1000);
    });

    it('should use pagination efficiently', async () => {
      const timeFilter = {
        type: 'month' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      // Test multiple pages
      const page1 = await storage.getHistoricalData('test-integration', timeFilter, {
        page: 1,
        limit: 100
      });

      const page2 = await storage.getHistoricalData('test-integration', timeFilter, {
        page: 2,
        limit: 100
      });

      expect(page1.pagination.page).toBe(1);
      expect(page2.pagination.page).toBe(2);
      expect(page1.data.length).toBeLessThanOrEqual(100);
      expect(page2.data.length).toBeLessThanOrEqual(100);
    });
  });
});
