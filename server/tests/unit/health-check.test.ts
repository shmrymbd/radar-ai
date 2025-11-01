/**
 * Unit Tests for Health Check Service
 */

import { HealthCheckService } from '../../src/services/health/health-check';

// Mock dependencies
jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(),
  isRedisConnected: jest.fn(),
}));

jest.mock('../../src/config/mongodb', () => ({
  getMongoClient: jest.fn(),
  isMongoConnected: jest.fn(),
}));

describe('HealthCheckService', () => {
  let healthCheck: HealthCheckService;

  beforeEach(() => {
    healthCheck = HealthCheckService.getInstance();
  });

  describe('isAlive', () => {
    it('should return true indicating server is alive', async () => {
      const result = await healthCheck.isAlive();
      expect(result).toBe(true);
    });
  });

  describe('isReady', () => {
    it('should return true when services are healthy', async () => {
      const { getRedisClient, isRedisConnected } = require('../../src/config/redis');
      const { getMongoClient, isMongoConnected } = require('../../src/config/mongodb');

      // Mock Redis
      isRedisConnected.mockReturnValue(true);
      getRedisClient.mockResolvedValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      });

      // Mock MongoDB
      isMongoConnected.mockReturnValue(true);
      getMongoClient.mockReturnValue({
        db: jest.fn().mockReturnValue({
          command: jest.fn().mockResolvedValue({ ok: 1 }),
        }),
      });

      const result = await healthCheck.isReady();
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const { isRedisConnected } = require('../../src/config/redis');

      isRedisConnected.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const result = await healthCheck.isReady();
      expect(result).toBe(false);
    });
  });

  describe('check', () => {
    it('should return health check result with all services', async () => {
      const result = await healthCheck.check();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('services');
      expect(result.services).toHaveProperty('redis');
      expect(result.services).toHaveProperty('mongodb');
      expect(result.services).toHaveProperty('websocket');
    });

    it('should calculate uptime correctly', async () => {
      const result = await healthCheck.check();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof result.uptime).toBe('number');
    });
  });
});
