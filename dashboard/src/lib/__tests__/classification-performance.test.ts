import { ClassificationProcessor } from '../classification-processor';
import { ProcessedPassData } from '@/types/radar';

describe('ClassificationProcessor Performance Tests', () => {
  let processor: ClassificationProcessor;

  beforeEach(() => {
    processor = ClassificationProcessor.getInstance();
  });

  describe('High Volume Processing', () => {
    it('should handle 1000 vehicles efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const testData: ProcessedPassData = {
          vehicleType: i % 2 === 0 ? 'car' : 'truck',
          timestamp: new Date(Date.now() + i * 1000),
          laneNumber: (i % 4) + 11,
          crossSectionPosition: 25.5 + (i % 10),
          crossSectionSpeed: 40 + (i % 20),
          headwayTime: 2.0 + (i % 3),
          occupancyDuration: 1.5 + (i % 2),
          occupancyStatus: i % 2 === 0 ? 'entering' : 'exiting'
        };

        processor.processPassDataForClassification(testData, 'test');
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process 1000 vehicles in less than 100ms
      expect(processingTime).toBeLessThan(100);

      const metrics = processor.getClassificationMetrics('test');
      expect(metrics.totalVehicles).toBe(1000);
    });

    it('should maintain performance with multiple devices', () => {
      const startTime = performance.now();
      const deviceIds = ['test', 'radar04', 'radar05'];
      
      for (let i = 0; i < 500; i++) {
        const deviceId = deviceIds[i % deviceIds.length];
        const testData: ProcessedPassData = {
          vehicleType: 'car',
          timestamp: new Date(),
          laneNumber: 11,
          crossSectionPosition: 25.5,
          crossSectionSpeed: 45.2,
          headwayTime: 2.1,
          occupancyDuration: 1.8,
          occupancyStatus: 'entering'
        };

        processor.processPassDataForClassification(testData, deviceId);
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process 500 vehicles across 3 devices in less than 50ms
      expect(processingTime).toBeLessThan(50);

      // Verify data isolation
      deviceIds.forEach(deviceId => {
        const metrics = processor.getClassificationMetrics(deviceId);
        expect(metrics.totalVehicles).toBeGreaterThan(0);
      });
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with repeated processing', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process 1000 vehicles
      for (let i = 0; i < 1000; i++) {
        const testData: ProcessedPassData = {
          vehicleType: 'car',
          timestamp: new Date(),
          laneNumber: 11,
          crossSectionPosition: 25.5,
          crossSectionSpeed: 45.2,
          headwayTime: 2.1,
          occupancyDuration: 1.8,
          occupancyStatus: 'entering'
        };

        processor.processPassDataForClassification(testData, 'test');
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Concurrent Processing', () => {
    it('should handle concurrent requests safely', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        const promise = new Promise<void>((resolve) => {
          const testData: ProcessedPassData = {
            vehicleType: 'car',
            timestamp: new Date(),
            laneNumber: 11,
            crossSectionPosition: 25.5,
            crossSectionSpeed: 45.2,
            headwayTime: 2.1,
            occupancyDuration: 1.8,
            occupancyStatus: 'entering'
          };

          processor.processPassDataForClassification(testData, 'test');
          resolve();
        });
        
        promises.push(promise);
      }

      await Promise.all(promises);

      const metrics = processor.getClassificationMetrics('test');
      expect(metrics.totalVehicles).toBe(100);
    });
  });
});
