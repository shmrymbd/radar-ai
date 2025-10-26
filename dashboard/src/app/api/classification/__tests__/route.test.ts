import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock the ClassificationProcessor
jest.mock('@/lib/classification-processor', () => ({
  ClassificationProcessor: {
    getInstance: jest.fn(() => ({
      getClassificationMetrics: jest.fn(() => ({
        totalVehicles: 100,
        vehicleTypes: [
          { vehicleType: 'car', count: 60, percentage: 60, averageSpeed: 45.2 },
          { vehicleType: 'truck', count: 40, percentage: 40, averageSpeed: 35.8 }
        ],
        laneUtilization: [
          { laneNumber: 11, totalVehicles: 50, utilizationRate: 0.8, averageSpeed: 42.1 },
          { laneNumber: 12, totalVehicles: 50, utilizationRate: 0.7, averageSpeed: 38.9 }
        ],
        peakHours: [
          { hour: 17, totalVehicles: 25, vehicleTypes: [], averageSpeed: 40.5, trafficDensity: 0.8 }
        ]
      })),
      getClassificationSummary: jest.fn(() => ({
        totalVehicles: 100,
        uniqueVehicleTypes: 2,
        averageSpeed: 40.5,
        speedViolations: 5,
        laneUtilization: 0.75,
        peakHour: 17,
        trafficComposition: [
          { vehicleType: 'car', count: 60, percentage: 60, averageSpeed: 45.2 },
          { vehicleType: 'truck', count: 40, percentage: 40, averageSpeed: 35.8 }
        ]
      })),
      filterClassificationData: jest.fn((filters) => ({
        totalVehicles: 50,
        vehicleTypes: [
          { vehicleType: 'car', count: 30, percentage: 60, averageSpeed: 45.2 }
        ],
        laneUtilization: [],
        peakHours: []
      }))
    }))
  }
}));

describe('/api/classification', () => {
  describe('GET', () => {
    it('should return classification data without filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/classification');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.metrics.totalVehicles).toBe(100);
      expect(data.data.metrics.vehicleTypes).toHaveLength(2);
    });

    it('should apply filters when provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/classification?vehicleTypes=car&lanes=11&startTime=2025-01-01&endTime=2025-01-02');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.filters.vehicleTypes).toEqual(['car']);
      expect(data.data.filters.lanes).toEqual([11]);
    });

    it('should handle errors gracefully', async () => {
      // Mock an error
      const mockProcessor = require('@/lib/classification-processor').ClassificationProcessor.getInstance();
      mockProcessor.getClassificationMetrics.mockImplementation(() => {
        throw new Error('Test error');
      });

      const request = new NextRequest('http://localhost:3000/api/classification');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch classification data');
    });
  });

  describe('POST', () => {
    it('should process real-time data updates', async () => {
      const requestBody = {
        type: 'real_time_update',
        data: {
          vehicleType: 'car',
          timestamp: new Date().toISOString(),
          laneNumber: 11,
          crossSectionPosition: 25.5,
          crossSectionSpeed: 45.2,
          headwayTime: 2.1,
          occupancyDuration: 1.8,
          occupancyStatus: 'entering'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/classification', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Real-time data processed successfully');
    });

    it('should handle invalid request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/classification', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
