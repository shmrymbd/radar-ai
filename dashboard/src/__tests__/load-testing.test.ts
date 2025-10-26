/**
 * Load testing for concurrent chart requests (task 8.6)
 */

import { ClassificationHistoryStorage } from '@/lib/classification-history-storage';

describe('Load Testing for Concurrent Chart Requests', () => {
  let storage: ClassificationHistoryStorage;

  beforeAll(async () => {
    storage = new ClassificationHistoryStorage();
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 50 concurrent requests efficiently', async () => {
      const timeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      };

      const startTime = Date.now();
      
      // Create 50 concurrent requests
      const requests = Array.from({ length: 50 }, (_, i) => 
        storage.getHistoricalData('test-load', timeFilter, {
          page: (i % 10) + 1, // Distribute across 10 pages
          limit: 100
        })
      );

      const results = await Promise.all(requests);
      const endTime = Date.now();

      // Validate all requests completed successfully
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('pagination');
        expect(result.data).toBeInstanceOf(Array);
      });

      // Validate performance (should complete within 30 seconds)
      expect(endTime - startTime).toBeLessThan(30000);
      
      // Validate response times are reasonable
      const avgResponseTime = (endTime - startTime) / 50;
      expect(avgResponseTime).toBeLessThan(1000); // Average response time under 1 second
    });

    it('should handle mixed request types concurrently', async () => {
      const timeFilter = {
        type: 'month' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const startTime = Date.now();
      
      // Create mixed request types
      const requests = [
        // Historical data requests
        ...Array.from({ length: 20 }, () => 
          storage.getHistoricalData('test-load', timeFilter, { page: 1, limit: 100 })
        ),
        // Aggregated data requests
        ...Array.from({ length: 10 }, () => 
          storage.getAggregatedHistoricalData('test-load', timeFilter)
        ),
        // Different page requests
        ...Array.from({ length: 20 }, (_, i) => 
          storage.getHistoricalData('test-load', timeFilter, { 
            page: (i % 5) + 1, 
            limit: 50 
          })
        )
      ];

      const results = await Promise.all(requests);
      const endTime = Date.now();

      // Validate all requests completed
      expect(results).toHaveLength(50);
      
      // Validate performance
      expect(endTime - startTime).toBeLessThan(45000); // 45 seconds max
    });

    it('should handle burst requests without degradation', async () => {
      const timeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      };

      // Test multiple bursts
      const burstResults = [];
      
      for (let burst = 0; burst < 5; burst++) {
        const burstStartTime = Date.now();
        
        // Create burst of 20 requests
        const burstRequests = Array.from({ length: 20 }, () => 
          storage.getHistoricalData('test-load', timeFilter, { page: 1, limit: 100 })
        );
        
        const burstResults_data = await Promise.all(burstRequests);
        const burstEndTime = Date.now();
        
        burstResults.push({
          burst,
          duration: burstEndTime - burstStartTime,
          successCount: burstResults_data.filter(r => r.data.length >= 0).length
        });
        
        // Small delay between bursts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Validate all bursts completed successfully
      expect(burstResults).toHaveLength(5);
      burstResults.forEach((result, index) => {
        expect(result.successCount).toBe(20);
        expect(result.duration).toBeLessThan(10000); // Each burst under 10 seconds
        
        // Performance should not degrade significantly
        if (index > 0) {
          const performanceRatio = result.duration / burstResults[0].duration;
          expect(performanceRatio).toBeLessThan(2); // No more than 2x slower
        }
      });
    });
  });

  describe('Memory Usage Under Load', () => {
    it('should maintain stable memory usage under concurrent load', async () => {
      const timeFilter = {
        type: 'month' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create 100 concurrent requests
      const requests = Array.from({ length: 100 }, (_, i) => 
        storage.getHistoricalData('test-load', timeFilter, {
          page: (i % 20) + 1,
          limit: 100
        })
      );

      const results = await Promise.all(requests);
      const finalMemory = process.memoryUsage().heapUsed;
      
      const memoryIncrease = finalMemory - initialMemory;
      
      // Validate all requests completed
      expect(results).toHaveLength(100);
      
      // Validate memory usage is reasonable (less than 200MB increase)
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024);
      
      // Validate memory usage per request is reasonable
      const memoryPerRequest = memoryIncrease / 100;
      expect(memoryPerRequest).toBeLessThan(2 * 1024 * 1024); // Less than 2MB per request
    });
  });

  describe('Error Handling Under Load', () => {
    it('should handle errors gracefully under concurrent load', async () => {
      const timeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      };

      // Create mix of valid and invalid requests
      const requests = [
        // Valid requests
        ...Array.from({ length: 40 }, () => 
          storage.getHistoricalData('test-load', timeFilter, { page: 1, limit: 100 })
        ),
        // Requests with invalid device IDs
        ...Array.from({ length: 10 }, () => 
          storage.getHistoricalData('invalid-device', timeFilter, { page: 1, limit: 100 })
        )
      ];

      const results = await Promise.allSettled(requests);
      
      // Validate results
      expect(results).toHaveLength(50);
      
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      const failedResults = results.filter(r => r.status === 'rejected');
      
      // Most requests should succeed
      expect(successfulResults.length).toBeGreaterThan(40);
      
      // Some requests may fail (invalid device)
      expect(failedResults.length).toBeLessThanOrEqual(10);
      
      // Validate successful results
      successfulResults.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveProperty('data');
          expect(result.value).toHaveProperty('pagination');
        }
      });
    });
  });

  describe('Performance Scaling', () => {
    it('should maintain performance with increasing concurrent requests', async () => {
      const timeFilter = {
        type: '24hrs' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      };

      const concurrencyLevels = [10, 25, 50, 100];
      const performanceResults = [];

      for (const concurrency of concurrencyLevels) {
        const startTime = Date.now();
        
        const requests = Array.from({ length: concurrency }, () => 
          storage.getHistoricalData('test-load', timeFilter, { page: 1, limit: 100 })
        );
        
        const results = await Promise.all(requests);
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        const avgResponseTime = duration / concurrency;
        
        performanceResults.push({
          concurrency,
          totalDuration: duration,
          avgResponseTime,
          successCount: results.length
        });
        
        // Validate all requests completed
        expect(results).toHaveLength(concurrency);
      }

      // Validate performance scaling
      performanceResults.forEach((result, index) => {
        expect(result.successCount).toBe(concurrencyLevels[index]);
        
        // Average response time should not increase dramatically
        if (index > 0) {
          const responseTimeRatio = result.avgResponseTime / performanceResults[0].avgResponseTime;
          expect(responseTimeRatio).toBeLessThan(5); // No more than 5x slower
        }
      });
    });
  });

  describe('Resource Cleanup Under Load', () => {
    it('should properly clean up resources after concurrent requests', async () => {
      const timeFilter = {
        type: 'month' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many concurrent requests
      const requests = Array.from({ length: 200 }, (_, i) => 
        storage.getHistoricalData('test-load', timeFilter, {
          page: (i % 50) + 1,
          limit: 50
        })
      );

      const results = await Promise.all(requests);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Validate all requests completed
      expect(results).toHaveLength(200);
      
      // Validate memory cleanup (should be reasonable)
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
      
      // Memory increase should be proportional to request count
      const memoryPerRequest = memoryIncrease / 200;
      expect(memoryPerRequest).toBeLessThan(2.5 * 1024 * 1024); // Less than 2.5MB per request
    });
  });
});
