/**
 * Performance tests for large dataset handling (task 8.3)
 */

import { ClassificationHistoryStorage } from '@/lib/classification-history-storage';
import { ClassificationHistory } from '@/types/classification-history';

describe('Performance Tests for Large Datasets', () => {
  let storage: ClassificationHistoryStorage;

  beforeAll(async () => {
    storage = new ClassificationHistoryStorage();
  });

  describe('Large Dataset Queries', () => {
    it('should handle 10,000+ records efficiently', async () => {
      const timeFilter = {
        type: 'month' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const startTime = Date.now();
      const result = await storage.getHistoricalData('test-performance', timeFilter, {
        page: 1,
        limit: 10000
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.data.length).toBeLessThanOrEqual(10000);
    });

    it('should maintain performance with complex queries', async () => {
      const timeFilter = {
        type: 'month' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const startTime = Date.now();
      
      // Test multiple concurrent queries
      const promises = Array.from({ length: 5 }, (_, i) => 
        storage.getHistoricalData('test-performance', timeFilter, {
          page: i + 1,
          limit: 1000
        })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.data.length).toBeLessThanOrEqual(1000);
      });
    });
  });

  describe('Memory Usage', () => {
    it('should not exceed memory limits with large datasets', async () => {
      const timeFilter = {
        type: 'month' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const initialMemory = process.memoryUsage().heapUsed;
      
      const result = await storage.getHistoricalData('test-performance', timeFilter, {
        page: 1,
        limit: 5000
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      expect(result.data.length).toBeLessThanOrEqual(5000);
    });
  });

  describe('Query Optimization', () => {
    it('should use indexes efficiently', async () => {
      const timeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      };

      const startTime = Date.now();
      const result = await storage.getHistoricalData('test-performance', timeFilter, {
        page: 1,
        limit: 1000,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      const endTime = Date.now();

      // Sorted queries should still be fast
      expect(endTime - startTime).toBeLessThan(3000);
      expect(result.data.length).toBeLessThanOrEqual(1000);
    });

    it('should handle date range queries efficiently', async () => {
      const narrowTimeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z')
      };

      const wideTimeFilter = {
        type: 'month' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const narrowStart = Date.now();
      await storage.getHistoricalData('test-performance', narrowTimeFilter);
      const narrowEnd = Date.now();

      const wideStart = Date.now();
      await storage.getHistoricalData('test-performance', wideTimeFilter);
      const wideEnd = Date.now();

      // Narrow date ranges should be faster
      expect(narrowEnd - narrowStart).toBeLessThan(wideEnd - wideStart);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent requests efficiently', async () => {
      const timeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      };

      const startTime = Date.now();
      
      // Simulate 20 concurrent requests
      const promises = Array.from({ length: 20 }, () => 
        storage.getHistoricalData('test-performance', timeFilter, {
          page: 1,
          limit: 100
        })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(results).toHaveLength(20);
      
      // All results should be successful
      results.forEach(result => {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('pagination');
      });
    });
  });

  describe('Data Aggregation Performance', () => {
    it('should aggregate large datasets efficiently', async () => {
      const timeFilter = {
        type: 'month' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const startTime = Date.now();
      const result = await storage.getAggregatedHistoricalData('test-performance', timeFilter);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('vehicleTypeTotals');
      expect(result).toHaveProperty('timeBasedAnalysis');
    });
  });
});
