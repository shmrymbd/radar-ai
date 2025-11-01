/**
 * Unit tests for Vehicle Tracking TTL Bug Fix
 * Tests edge cases related to vehicle ID Set management and orphaned ID cleanup
 */

import { VehicleTrackingRedis } from '../lib/vehicle-tracking-redis';
import { getRedisClient } from '../lib/redis';
import { VehicleState, VehiclePosition } from '../types/tracking';

// Mock Redis client
jest.mock('../lib/redis');

describe('VehicleTrackingRedis - TTL Edge Cases', () => {
  let tracking: VehicleTrackingRedis;
  let mockRedisClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Redis client
    mockRedisClient = {
      hSet: jest.fn().mockResolvedValue(1),
      hGetAll: jest.fn().mockResolvedValue({}),
      expire: jest.fn().mockResolvedValue(1),
      sAdd: jest.fn().mockResolvedValue(1),
      sRem: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(1),
      lPush: jest.fn().mockResolvedValue(1),
      lTrim: jest.fn().mockResolvedValue('OK'),
      lRange: jest.fn().mockResolvedValue([]),
      multi: jest.fn().mockReturnValue({
        hSet: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        sAdd: jest.fn().mockReturnThis(),
        sRem: jest.fn().mockReturnThis(),
        hGetAll: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    (getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);

    tracking = VehicleTrackingRedis.getInstance();
    tracking.setDeviceId('test-device');
  });

  describe('Test: Vehicle state expires but ID remains in Set', () => {
    it('should detect and remove orphaned vehicle ID when state key is expired', async () => {
      const vehicleIds = ['vehicle-1', 'vehicle-2', 'vehicle-3'];

      // Mock: vehicle-2 has expired (state key doesn't exist)
      mockRedisClient.sMembers.mockResolvedValue(vehicleIds);
      mockRedisClient.exists.mockImplementation((key: string) => {
        if (key.includes('vehicle-2')) {
          return Promise.resolve(0); // Key doesn't exist (expired)
        }
        return Promise.resolve(1); // Key exists
      });

      // Mock vehicle states for vehicle-1 and vehicle-3
      const mockVehicleData = {
        targetId: 'vehicle-1',
        position: JSON.stringify({ x: 10, y: 20 }),
        trajectory: JSON.stringify([]),
        isVisible: '1',
        lastSeen: new Date().toISOString(),
        enterTime: new Date().toISOString(),
      };

      mockRedisClient.hGetAll.mockImplementation((key: string) => {
        if (key.includes('vehicle-2')) {
          return Promise.resolve({}); // Empty (expired)
        }
        return Promise.resolve(mockVehicleData);
      });

      // Run cleanup
      await tracking.cleanupOldVehicles(300000);

      // Verify orphaned ID was removed
      expect(mockRedisClient.sRem).toHaveBeenCalledWith(
        'test-device/tracking/vehicle_ids',
        'vehicle-2'
      );
    });

    it('should handle multiple orphaned IDs in a single cleanup run', async () => {
      const vehicleIds = ['v1', 'v2', 'v3', 'v4', 'v5'];

      mockRedisClient.sMembers.mockResolvedValue(vehicleIds);

      // Mock: v2, v4 are orphaned (expired)
      mockRedisClient.exists.mockImplementation((key: string) => {
        if (key.includes('v2') || key.includes('v4')) {
          return Promise.resolve(0);
        }
        return Promise.resolve(1);
      });

      await tracking.cleanupOldVehicles(300000);

      // Should remove both orphaned IDs
      expect(mockRedisClient.sRem).toHaveBeenCalledWith(
        'test-device/tracking/vehicle_ids',
        'v2'
      );
      expect(mockRedisClient.sRem).toHaveBeenCalledWith(
        'test-device/tracking/vehicle_ids',
        'v4'
      );
    });
  });

  describe('Test: getAllVehicleStates() handles missing keys gracefully', () => {
    it('should filter out vehicles with expired state keys', async () => {
      const vehicleIds = ['vehicle-1', 'vehicle-2', 'vehicle-3'];
      mockRedisClient.sMembers.mockResolvedValue(vehicleIds);

      const validVehicleData = {
        targetId: 'vehicle-1',
        position: JSON.stringify({ x: 10, y: 20, targetId: 'vehicle-1', timestamp: new Date() }),
        trajectory: JSON.stringify([]),
        isVisible: '1',
        lastSeen: new Date().toISOString(),
        enterTime: new Date().toISOString(),
      };

      // Mock pipeline execution: vehicle-2 returns empty (expired)
      const mockPipeline = {
        hGetAll: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          validVehicleData,    // vehicle-1: valid
          {},                  // vehicle-2: expired (empty)
          validVehicleData,    // vehicle-3: valid
        ]),
      };

      mockRedisClient.multi.mockReturnValue(mockPipeline);

      const vehicles = await tracking.getAllVehicleStates();

      // Should return only 2 vehicles (vehicle-2 filtered out)
      expect(vehicles).toHaveLength(2);
    });

    it('should asynchronously remove orphaned IDs detected during getAllVehicleStates', async () => {
      const vehicleIds = ['vehicle-orphaned'];
      mockRedisClient.sMembers.mockResolvedValue(vehicleIds);

      // Mock pipeline returning empty result (expired key)
      const mockPipeline = {
        hGetAll: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{}]),
      };

      mockRedisClient.multi.mockReturnValue(mockPipeline);

      // Mock the cleanup pipeline
      const mockCleanupPipeline = {
        sRem: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([1]),
      };

      // First call returns query pipeline, second call returns cleanup pipeline
      mockRedisClient.multi
        .mockReturnValueOnce(mockPipeline)
        .mockReturnValueOnce(mockCleanupPipeline);

      await tracking.getAllVehicleStates();

      // Wait for async cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify orphaned ID cleanup was attempted
      expect(mockCleanupPipeline.sRem).toHaveBeenCalled();
    });

    it('should handle parse errors gracefully and mark vehicles as orphaned', async () => {
      const vehicleIds = ['vehicle-bad-json'];
      mockRedisClient.sMembers.mockResolvedValue(vehicleIds);

      const badVehicleData = {
        targetId: 'vehicle-bad-json',
        position: 'invalid-json{{{',  // Invalid JSON
        trajectory: '[]',
        isVisible: '1',
        lastSeen: new Date().toISOString(),
        enterTime: new Date().toISOString(),
      };

      const mockPipeline = {
        hGetAll: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([badVehicleData]),
      };

      mockRedisClient.multi.mockReturnValue(mockPipeline);

      const vehicles = await tracking.getAllVehicleStates();

      // Should return empty array (parse error filtered out)
      expect(vehicles).toHaveLength(0);
    });
  });

  describe('Test: cleanupOldVehicles() removes orphaned IDs', () => {
    it('should check EXISTS before attempting to read vehicle state', async () => {
      const vehicleIds = ['vehicle-1'];
      mockRedisClient.sMembers.mockResolvedValue(vehicleIds);
      mockRedisClient.exists.mockResolvedValue(0); // Key doesn't exist

      await tracking.cleanupOldVehicles(300000);

      // Should call EXISTS
      expect(mockRedisClient.exists).toHaveBeenCalledWith(
        'test-device/tracking/vehicle/vehicle-1'
      );

      // Should remove orphaned ID
      expect(mockRedisClient.sRem).toHaveBeenCalledWith(
        'test-device/tracking/vehicle_ids',
        'vehicle-1'
      );
    });

    it('should remove old vehicles even if they exist in Redis', async () => {
      const vehicleIds = ['old-vehicle'];
      const oldTimestamp = new Date(Date.now() - 400000).toISOString(); // 6.6 minutes ago

      mockRedisClient.sMembers.mockResolvedValue(vehicleIds);
      mockRedisClient.exists.mockResolvedValue(1); // Key exists

      const oldVehicleData = {
        targetId: 'old-vehicle',
        position: JSON.stringify({ x: 10, y: 20, targetId: 'old-vehicle', timestamp: new Date() }),
        trajectory: JSON.stringify([]),
        isVisible: '1',
        lastSeen: oldTimestamp,  // Old timestamp
        enterTime: oldTimestamp,
      };

      mockRedisClient.hGetAll.mockResolvedValue(oldVehicleData);

      await tracking.cleanupOldVehicles(300000); // 5 minutes

      // Should delete the old vehicle
      expect(mockRedisClient.del).toHaveBeenCalled();
      expect(mockRedisClient.sRem).toHaveBeenCalled();
    });

    it('should not remove recent vehicles', async () => {
      const vehicleIds = ['recent-vehicle'];
      const recentTimestamp = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

      mockRedisClient.sMembers.mockResolvedValue(vehicleIds);
      mockRedisClient.exists.mockResolvedValue(1);

      const recentVehicleData = {
        targetId: 'recent-vehicle',
        position: JSON.stringify({ x: 10, y: 20, targetId: 'recent-vehicle', timestamp: new Date() }),
        trajectory: JSON.stringify([]),
        isVisible: '1',
        lastSeen: recentTimestamp,
        enterTime: recentTimestamp,
      };

      mockRedisClient.hGetAll.mockResolvedValue(recentVehicleData);

      // Clear previous calls
      mockRedisClient.del.mockClear();
      mockRedisClient.sRem.mockClear();

      await tracking.cleanupOldVehicles(300000);

      // Should NOT delete recent vehicles
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('Test: deleteVehicle() removes both state and Set membership', () => {
    it('should remove vehicle state, history, and Set membership atomically', async () => {
      const targetId = 'vehicle-to-delete';

      mockRedisClient.sRem.mockResolvedValue(1); // Successfully removed from Set

      await tracking.deleteVehicle(targetId);

      // Should delete state key
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'test-device/tracking/vehicle/vehicle-to-delete'
      );

      // Should delete history key
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'test-device/tracking/history/vehicle-to-delete'
      );

      // Should remove from Set
      expect(mockRedisClient.sRem).toHaveBeenCalledWith(
        'test-device/tracking/vehicle_ids',
        'vehicle-to-delete'
      );
    });

    it('should log when vehicle is successfully deleted', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockRedisClient.sRem.mockResolvedValue(1);

      await tracking.deleteVehicle('test-vehicle');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deleted vehicle test-vehicle')
      );

      consoleSpy.mockRestore();
    });

    it('should throw error on failure', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(tracking.deleteVehicle('failing-vehicle')).rejects.toThrow();
    });
  });

  describe('Test: Set TTL is not applied', () => {
    it('should not set TTL on vehicle_ids Set when adding vehicle', async () => {
      const mockVehicle: VehicleState = {
        targetId: 'test-vehicle',
        position: {
          targetId: 'test-vehicle',
          x: 10,
          y: 20,
          length: 4.5,
          width: 1.8,
          height: 1.5,
          speed: 50,
          vehicleType: 'car',
          laneNo: 11,
          timestamp: new Date(),
          xSpeed: 0,
          ySpeed: 13.9,
          acceleration: 0,
        },
        trajectory: [],
        isVisible: true,
        lastSeen: new Date(),
        enterTime: new Date(),
      };

      await tracking.setVehicleState('test-vehicle', mockVehicle);

      // Should add to Set
      expect(mockRedisClient.sAdd).toHaveBeenCalledWith(
        'test-device/tracking/vehicle_ids',
        'test-vehicle'
      );

      // Should NOT set TTL on Set (verify expire is only called once for state key, not for Set)
      const expireCalls = mockRedisClient.expire.mock.calls;
      const setExpireCalls = expireCalls.filter((call: any[]) =>
        call[0].includes('vehicle_ids')
      );
      expect(setExpireCalls).toHaveLength(0);
    });

    it('should not set TTL on vehicle_ids Set in batch operations', async () => {
      const vehicles = new Map<string, VehicleState>();
      vehicles.set('v1', {
        targetId: 'v1',
        position: { targetId: 'v1', x: 10, y: 20, length: 4.5, width: 1.8, height: 1.5, speed: 50, vehicleType: 'car', laneNo: 11, timestamp: new Date(), xSpeed: 0, ySpeed: 13.9, acceleration: 0 },
        trajectory: [],
        isVisible: true,
        lastSeen: new Date(),
        enterTime: new Date(),
      });

      const mockPipeline = {
        hSet: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        sAdd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockRedisClient.multi.mockReturnValue(mockPipeline);

      await tracking.batchSetVehicleStates(vehicles);

      // Verify expire was NOT called with vehicle_ids key
      const expireCalls = mockPipeline.expire.mock.calls;
      const setExpireCalls = expireCalls.filter((call: any[]) =>
        call[0] && call[0].includes('vehicle_ids')
      );
      expect(setExpireCalls).toHaveLength(0);
    });
  });
});
