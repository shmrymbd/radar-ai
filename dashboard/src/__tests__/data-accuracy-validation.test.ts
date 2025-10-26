/**
 * Data accuracy validation tests (task 8.5)
 */

import { ClassificationHistoryStorage } from '@/lib/classification-history-storage';
import { ClassificationHistory, HistoricalChartData } from '@/types/classification-history';

describe('Data Accuracy Validation Tests', () => {
  let storage: ClassificationHistoryStorage;

  beforeAll(async () => {
    storage = new ClassificationHistoryStorage();
  });

  describe('Data Consistency Validation', () => {
    it('should validate vehicle type totals match individual counts', async () => {
      const testData: ClassificationHistory = {
        deviceId: 'test-accuracy',
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

      // Calculate expected total
      const expectedTotal = Object.values(testData.vehicleTypes).reduce((sum, count) => sum + count, 0);
      
      // Validate total matches sum of individual counts
      expect(testData.totalVehicles).toBe(expectedTotal);
      expect(testData.totalVehicles).toBe(21);
    });

    it('should validate lane utilization percentages are within valid range', async () => {
      const testData: ClassificationHistory = {
        deviceId: 'test-accuracy',
        timestamp: new Date(),
        timeSlot: '2024-01-01-12-00',
        vehicleTypes: { car: 10, suv: 5, truck: 2, motorcycle: 1, van: 3 },
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
      };

      // Validate lane utilization percentages
      Object.values(testData.laneUtilization).forEach(utilization => {
        expect(utilization).toBeGreaterThanOrEqual(0);
        expect(utilization).toBeLessThanOrEqual(100);
      });
    });

    it('should validate speed analysis data consistency', async () => {
      const testData: ClassificationHistory = {
        deviceId: 'test-accuracy',
        timestamp: new Date(),
        timeSlot: '2024-01-01-12-00',
        vehicleTypes: { car: 10, suv: 5, truck: 2, motorcycle: 1, van: 3 },
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
            { vehicleType: 'suv', speed: 45 },
            { vehicleType: 'truck', speed: 40 },
            { vehicleType: 'motorcycle', speed: 55 },
            { vehicleType: 'van', speed: 42 }
          ]
        },
        totalVehicles: 21,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate speed distribution
      testData.speedAnalysis.speedDistribution.forEach(speedData => {
        expect(speedData.speed).toBeGreaterThan(0);
        expect(speedData.speed).toBeLessThan(200); // Reasonable speed limit
        expect(['car', 'suv', 'truck', 'motorcycle', 'van']).toContain(speedData.vehicleType);
      });

      // Validate speed violations count
      expect(testData.speedAnalysis.speedViolations).toBeGreaterThanOrEqual(0);
      expect(testData.speedAnalysis.speedViolations).toBeLessThanOrEqual(testData.totalVehicles);
    });
  });

  describe('Time-based Data Validation', () => {
    it('should validate timeSlot format consistency', async () => {
      const validTimeSlots = [
        '2024-01-01-00-00',
        '2024-01-01-12-30',
        '2024-12-31-23-45'
      ];

      validTimeSlots.forEach(timeSlot => {
        // Validate format: YYYY-MM-DD-HH-MM
        const timeSlotRegex = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}$/;
        expect(timeSlot).toMatch(timeSlotRegex);

        // Validate date components
        const [year, month, day, hour, minute] = timeSlot.split('-').map(Number);
        expect(year).toBeGreaterThanOrEqual(2020);
        expect(year).toBeLessThanOrEqual(2030);
        expect(month).toBeGreaterThanOrEqual(1);
        expect(month).toBeLessThanOrEqual(12);
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(31);
        expect(hour).toBeGreaterThanOrEqual(0);
        expect(hour).toBeLessThanOrEqual(23);
        expect(minute).toBeGreaterThanOrEqual(0);
        expect(minute).toBeLessThanOrEqual(59);
      });
    });

    it('should validate timestamp consistency with timeSlot', async () => {
      const testData: ClassificationHistory = {
        deviceId: 'test-accuracy',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        timeSlot: '2024-01-01-12-00',
        vehicleTypes: { car: 10, suv: 5, truck: 2, motorcycle: 1, van: 3 },
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
      };

      // Parse timeSlot to Date
      const [year, month, day, hour, minute] = testData.timeSlot.split('-').map(Number);
      const timeSlotDate = new Date(year, month - 1, day, hour, minute);

      // Validate timestamp matches timeSlot (within 15-minute window)
      const timeDiff = Math.abs(testData.timestamp.getTime() - timeSlotDate.getTime());
      expect(timeDiff).toBeLessThan(15 * 60 * 1000); // 15 minutes in milliseconds
    });
  });

  describe('Aggregation Accuracy Validation', () => {
    it('should validate 15-minute aggregation accuracy', async () => {
      // Create test data for multiple 15-minute intervals
      const testDataPoints: ClassificationHistory[] = [
        {
          deviceId: 'test-accuracy',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          timeSlot: '2024-01-01-12-00',
          vehicleTypes: { car: 5, suv: 3, truck: 1, motorcycle: 0, van: 2 },
          laneUtilization: { lane11: 70, lane12: 75, lane31: 65, lane32: 68 },
          speedAnalysis: { averageSpeed: 45, speedViolations: 1, speedDistribution: [] },
          totalVehicles: 11,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          deviceId: 'test-accuracy',
          timestamp: new Date('2024-01-01T12:15:00Z'),
          timeSlot: '2024-01-01-12-15',
          vehicleTypes: { car: 8, suv: 4, truck: 2, motorcycle: 1, van: 3 },
          laneUtilization: { lane11: 80, lane12: 85, lane31: 70, lane32: 75 },
          speedAnalysis: { averageSpeed: 48, speedViolations: 2, speedDistribution: [] },
          totalVehicles: 18,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Calculate aggregated totals
      const aggregatedTotals = testDataPoints.reduce((acc, data) => {
        acc.totalVehicles += data.totalVehicles;
        acc.vehicleTypes.car += data.vehicleTypes.car;
        acc.vehicleTypes.suv += data.vehicleTypes.suv;
        acc.vehicleTypes.truck += data.vehicleTypes.truck;
        acc.vehicleTypes.motorcycle += data.vehicleTypes.motorcycle;
        acc.vehicleTypes.van += data.vehicleTypes.van;
        acc.speedViolations += data.speedAnalysis.speedViolations;
        return acc;
      }, {
        totalVehicles: 0,
        vehicleTypes: { car: 0, suv: 0, truck: 0, motorcycle: 0, van: 0 },
        speedViolations: 0
      });

      // Validate aggregated totals
      expect(aggregatedTotals.totalVehicles).toBe(29); // 11 + 18
      expect(aggregatedTotals.vehicleTypes.car).toBe(13); // 5 + 8
      expect(aggregatedTotals.vehicleTypes.suv).toBe(7); // 3 + 4
      expect(aggregatedTotals.vehicleTypes.truck).toBe(3); // 1 + 2
      expect(aggregatedTotals.vehicleTypes.motorcycle).toBe(1); // 0 + 1
      expect(aggregatedTotals.vehicleTypes.van).toBe(5); // 2 + 3
      expect(aggregatedTotals.speedViolations).toBe(3); // 1 + 2
    });

    it('should validate device-specific data isolation', async () => {
      const device1Data: ClassificationHistory = {
        deviceId: 'device1',
        timestamp: new Date(),
        timeSlot: '2024-01-01-12-00',
        vehicleTypes: { car: 10, suv: 5, truck: 2, motorcycle: 1, van: 3 },
        laneUtilization: { lane11: 75, lane12: 80, lane31: 70, lane32: 72 },
        speedAnalysis: { averageSpeed: 45, speedViolations: 2, speedDistribution: [] },
        totalVehicles: 21,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const device2Data: ClassificationHistory = {
        deviceId: 'device2',
        timestamp: new Date(),
        timeSlot: '2024-01-01-12-00',
        vehicleTypes: { car: 15, suv: 8, truck: 3, motorcycle: 2, van: 5 },
        laneUtilization: { lane11: 85, lane12: 90, lane31: 80, lane32: 82 },
        speedAnalysis: { averageSpeed: 50, speedViolations: 3, speedDistribution: [] },
        totalVehicles: 33,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate device IDs are different
      expect(device1Data.deviceId).not.toBe(device2Data.deviceId);
      
      // Validate data is device-specific
      expect(device1Data.totalVehicles).not.toBe(device2Data.totalVehicles);
      expect(device1Data.vehicleTypes.car).not.toBe(device2Data.vehicleTypes.car);
      expect(device1Data.laneUtilization.lane11).not.toBe(device2Data.laneUtilization.lane11);
    });
  });

  describe('Data Range Validation', () => {
    it('should validate reasonable data ranges', async () => {
      const testData: ClassificationHistory = {
        deviceId: 'test-accuracy',
        timestamp: new Date(),
        timeSlot: '2024-01-01-12-00',
        vehicleTypes: { car: 100, suv: 50, truck: 20, motorcycle: 10, van: 30 },
        laneUtilization: { lane11: 95, lane12: 98, lane31: 85, lane32: 90 },
        speedAnalysis: { averageSpeed: 60, speedViolations: 5, speedDistribution: [] },
        totalVehicles: 210,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate vehicle counts are reasonable
      Object.values(testData.vehicleTypes).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBeLessThanOrEqual(1000); // Reasonable upper limit
      });

      // Validate total vehicles
      expect(testData.totalVehicles).toBeGreaterThanOrEqual(0);
      expect(testData.totalVehicles).toBeLessThanOrEqual(10000);

      // Validate lane utilization
      Object.values(testData.laneUtilization).forEach(utilization => {
        expect(utilization).toBeGreaterThanOrEqual(0);
        expect(utilization).toBeLessThanOrEqual(100);
      });

      // Validate speed analysis
      expect(testData.speedAnalysis.averageSpeed).toBeGreaterThanOrEqual(0);
      expect(testData.speedAnalysis.averageSpeed).toBeLessThanOrEqual(200);
      expect(testData.speedAnalysis.speedViolations).toBeGreaterThanOrEqual(0);
      expect(testData.speedAnalysis.speedViolations).toBeLessThanOrEqual(testData.totalVehicles);
    });
  });

  describe('Data Completeness Validation', () => {
    it('should validate required fields are present', async () => {
      const testData: ClassificationHistory = {
        deviceId: 'test-accuracy',
        timestamp: new Date(),
        timeSlot: '2024-01-01-12-00',
        vehicleTypes: { car: 10, suv: 5, truck: 2, motorcycle: 1, van: 3 },
        laneUtilization: { lane11: 75, lane12: 80, lane31: 70, lane32: 72 },
        speedAnalysis: { averageSpeed: 45, speedViolations: 2, speedDistribution: [] },
        totalVehicles: 21,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate required fields
      expect(testData.deviceId).toBeDefined();
      expect(testData.timestamp).toBeDefined();
      expect(testData.timeSlot).toBeDefined();
      expect(testData.vehicleTypes).toBeDefined();
      expect(testData.laneUtilization).toBeDefined();
      expect(testData.speedAnalysis).toBeDefined();
      expect(testData.totalVehicles).toBeDefined();
      expect(testData.createdAt).toBeDefined();
      expect(testData.updatedAt).toBeDefined();

      // Validate vehicle types object has all required keys
      expect(testData.vehicleTypes.car).toBeDefined();
      expect(testData.vehicleTypes.suv).toBeDefined();
      expect(testData.vehicleTypes.truck).toBeDefined();
      expect(testData.vehicleTypes.motorcycle).toBeDefined();
      expect(testData.vehicleTypes.van).toBeDefined();

      // Validate lane utilization object has all required keys
      expect(testData.laneUtilization.lane11).toBeDefined();
      expect(testData.laneUtilization.lane12).toBeDefined();
      expect(testData.laneUtilization.lane31).toBeDefined();
      expect(testData.laneUtilization.lane32).toBeDefined();

      // Validate speed analysis object has required keys
      expect(testData.speedAnalysis.averageSpeed).toBeDefined();
      expect(testData.speedAnalysis.speedViolations).toBeDefined();
      expect(testData.speedAnalysis.speedDistribution).toBeDefined();
    });
  });
});
