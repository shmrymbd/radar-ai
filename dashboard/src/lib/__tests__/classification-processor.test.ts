import { ClassificationProcessor } from '../classification-processor';
import { ProcessedPassData } from '@/types/radar';

describe('ClassificationProcessor', () => {
  let processor: ClassificationProcessor;

  beforeEach(() => {
    processor = ClassificationProcessor.getInstance();
  });

  describe('processPassDataForClassification', () => {
    it('should process vehicle data correctly', () => {
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
      
      const metrics = processor.getClassificationMetrics('test');
      expect(metrics.totalVehicles).toBe(1);
      expect(metrics.vehicleTypes).toHaveLength(1);
      expect(metrics.vehicleTypes[0].vehicleType).toBe('car');
    });

    it('should handle multiple vehicle types', () => {
      const carData: ProcessedPassData = {
        vehicleType: 'car',
        timestamp: new Date(),
        laneNumber: 11,
        crossSectionPosition: 25.5,
        crossSectionSpeed: 45.2,
        headwayTime: 2.1,
        occupancyDuration: 1.8,
        occupancyStatus: 'entering'
      };

      const truckData: ProcessedPassData = {
        vehicleType: 'truck',
        timestamp: new Date(),
        laneNumber: 12,
        crossSectionPosition: 30.0,
        crossSectionSpeed: 35.8,
        headwayTime: 3.2,
        occupancyDuration: 2.5,
        occupancyStatus: 'exiting'
      };

      processor.processPassDataForClassification(carData, 'test');
      processor.processPassDataForClassification(truckData, 'test');
      
      const metrics = processor.getClassificationMetrics('test');
      expect(metrics.totalVehicles).toBe(2);
      expect(metrics.vehicleTypes).toHaveLength(2);
    });

    it('should maintain device-specific data isolation', () => {
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
      processor.processPassDataForClassification(testData, 'radar04');
      
      const testMetrics = processor.getClassificationMetrics('test');
      const radar04Metrics = processor.getClassificationMetrics('radar04');
      
      expect(testMetrics.totalVehicles).toBe(1);
      expect(radar04Metrics.totalVehicles).toBe(1);
    });
  });

  describe('getClassificationMetrics', () => {
    it('should return empty metrics for unknown device', () => {
      const metrics = processor.getClassificationMetrics('unknown');
      expect(metrics.totalVehicles).toBe(0);
      expect(metrics.vehicleTypes).toHaveLength(0);
    });

    it('should calculate vehicle type percentages correctly', () => {
      const carData: ProcessedPassData = {
        vehicleType: 'car',
        timestamp: new Date(),
        laneNumber: 11,
        crossSectionPosition: 25.5,
        crossSectionSpeed: 45.2,
        headwayTime: 2.1,
        occupancyDuration: 1.8,
        occupancyStatus: 'entering'
      };

      const truckData: ProcessedPassData = {
        vehicleType: 'truck',
        timestamp: new Date(),
        laneNumber: 12,
        crossSectionPosition: 30.0,
        crossSectionSpeed: 35.8,
        headwayTime: 3.2,
        occupancyDuration: 2.5,
        occupancyStatus: 'exiting'
      };

      processor.processPassDataForClassification(carData, 'test');
      processor.processPassDataForClassification(truckData, 'test');
      
      const metrics = processor.getClassificationMetrics('test');
      expect(metrics.vehicleTypes[0].percentage).toBe(50);
      expect(metrics.vehicleTypes[1].percentage).toBe(50);
    });
  });

  describe('getClassificationSummary', () => {
    it('should return comprehensive summary data', () => {
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
      
      const summary = processor.getClassificationSummary('test');
      expect(summary.totalVehicles).toBe(1);
      expect(summary.uniqueVehicleTypes).toBe(1);
      expect(summary.averageSpeed).toBe(45.2);
    });
  });
});
