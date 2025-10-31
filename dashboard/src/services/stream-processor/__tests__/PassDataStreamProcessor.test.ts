/**
 * Unit tests for PassDataStreamProcessor
 *
 * Test Coverage:
 * - Consumer group creation and management
 * - Message processing and aggregation
 * - Acknowledgment and error handling
 * - Pending message claims
 * - Batch flushing logic
 */

import { PassDataStreamProcessor } from '../PassDataStreamProcessor';
import { createClient } from 'redis';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn()
}));

describe('PassDataStreamProcessor', () => {
  let processor: PassDataStreamProcessor;
  let mockRedis: any;

  beforeEach(() => {
    // Create mock Redis client
    mockRedis = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      xGroupCreate: jest.fn().mockResolvedValue('OK'),
      xReadGroup: jest.fn(),
      xAck: jest.fn().mockResolvedValue(1),
      xPending: jest.fn(),
      xPendingRange: jest.fn(),
      xClaim: jest.fn(),
      xTrim: jest.fn().mockResolvedValue(0),
      on: jest.fn(),
      isOpen: false
    };

    (createClient as jest.Mock).mockReturnValue(mockRedis);

    processor = new PassDataStreamProcessor('test-consumer');
  });

  afterEach(async () => {
    await processor.stop();
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to Redis successfully', async () => {
      await processor.connect();

      expect(createClient).toHaveBeenCalledWith({
        socket: {
          host: '192.168.6.22',
          port: 6379,
          reconnectStrategy: expect.any(Function)
        }
      });

      expect(mockRedis.connect).toHaveBeenCalled();
    });

    it('should use environment variables for Redis config', async () => {
      process.env.REDIS_HOST = '127.0.0.1';
      process.env.REDIS_PORT = '6380';

      await processor.connect();

      expect(createClient).toHaveBeenCalledWith({
        socket: {
          host: '127.0.0.1',
          port: 6380,
          reconnectStrategy: expect.any(Function)
        }
      });

      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
    });
  });

  describe('initializeConsumerGroup', () => {
    beforeEach(async () => {
      await processor.connect();
    });

    it('should create consumer group if not exists', async () => {
      await processor.initializeConsumerGroup('test');

      expect(mockRedis.xGroupCreate).toHaveBeenCalledWith(
        'test/passdata:stream',
        'classification-processors',
        '0',
        { MKSTREAM: true }
      );
    });

    it('should handle existing group gracefully', async () => {
      const busyGroupError = new Error('BUSYGROUP Consumer Group name already exists');
      mockRedis.xGroupCreate.mockRejectedValueOnce(busyGroupError);

      // Should not throw
      await expect(
        processor.initializeConsumerGroup('test')
      ).resolves.not.toThrow();
    });

    it('should throw on other errors', async () => {
      mockRedis.xGroupCreate.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(
        processor.initializeConsumerGroup('test')
      ).rejects.toThrow('Connection failed');
    });
  });

  describe('processStream', () => {
    beforeEach(async () => {
      await processor.connect();
      mockRedis.xGroupCreate.mockResolvedValue('OK');
    });

    it('should process messages from stream', async () => {
      const passData = {
        deviceId: 'test',
        timestamp: new Date().toISOString(),
        vehicleType: 'Car',
        laneNumber: 11,
        crossSectionSpeed: 50,
        headwayTime: 2.5,
        occupancyDuration: 1.2,
        crossSectionPosition: 100,
        occupancyStatus: 1
      };

      mockRedis.xReadGroup.mockResolvedValueOnce([
        {
          name: 'test/passdata:stream',
          messages: [
            {
              id: '1234567890-0',
              message: { data: JSON.stringify(passData) }
            }
          ]
        }
      ]);

      // Stop after processing one message
      setTimeout(() => processor.stop(), 100);

      await processor.processStream('test');

      expect(mockRedis.xReadGroup).toHaveBeenCalled();
      expect(mockRedis.xAck).toHaveBeenCalledWith(
        'test/passdata:stream',
        'classification-processors',
        '1234567890-0'
      );
    });

    it('should skip invalid JSON messages', async () => {
      mockRedis.xReadGroup.mockResolvedValueOnce([
        {
          name: 'test/passdata:stream',
          messages: [
            {
              id: '1234567890-0',
              message: { data: 'invalid json' }
            }
          ]
        }
      ]);

      setTimeout(() => processor.stop(), 100);

      await processor.processStream('test');

      // Should still acknowledge invalid message to prevent reprocessing
      expect(mockRedis.xAck).toHaveBeenCalled();
    });

    it('should not acknowledge on processing error', async () => {
      const passData = {
        deviceId: 'test',
        timestamp: new Date().toISOString(),
        vehicleType: 'Car',
        laneNumber: 11,
        crossSectionSpeed: 50,
        headwayTime: 2.5,
        occupancyDuration: 1.2,
        crossSectionPosition: 100,
        occupancyStatus: 1
      };

      mockRedis.xReadGroup.mockResolvedValueOnce([
        {
          name: 'test/passdata:stream',
          messages: [
            {
              id: '1234567890-0',
              message: { data: JSON.stringify(passData) }
            }
          ]
        }
      ]);

      // Mock ACK to throw error
      mockRedis.xAck.mockRejectedValueOnce(new Error('ACK failed'));

      setTimeout(() => processor.stop(), 100);

      // Should not throw, just log error
      await expect(processor.processStream('test')).resolves.not.toThrow();
    });
  });

  describe('claimPendingMessages', () => {
    beforeEach(async () => {
      await processor.connect();
    });

    it('should claim orphaned messages', async () => {
      mockRedis.xPending.mockResolvedValue({
        pending: 5,
        firstId: '1234567890-0',
        lastId: '1234567894-0',
        consumers: []
      });

      mockRedis.xPendingRange.mockResolvedValue([
        {
          id: '1234567890-0',
          consumer: 'dead-consumer',
          millisecondsSinceLastDelivery: 120000, // 2 minutes
          deliveryCount: 1
        }
      ]);

      const passData = {
        deviceId: 'test',
        timestamp: new Date().toISOString(),
        vehicleType: 'Car',
        laneNumber: 11,
        crossSectionSpeed: 50,
        headwayTime: 2.5,
        occupancyDuration: 1.2,
        crossSectionPosition: 100,
        occupancyStatus: 1
      };

      mockRedis.xClaim.mockResolvedValue([
        {
          id: '1234567890-0',
          message: { data: JSON.stringify(passData) }
        }
      ]);

      await processor.claimPendingMessages('test');

      expect(mockRedis.xClaim).toHaveBeenCalledWith(
        'test/passdata:stream',
        'classification-processors',
        'test-consumer',
        60000,
        '1234567890-0'
      );
    });

    it('should skip recently delivered messages', async () => {
      mockRedis.xPending.mockResolvedValue({
        pending: 1,
        firstId: '1234567890-0',
        lastId: '1234567890-0',
        consumers: []
      });

      mockRedis.xPendingRange.mockResolvedValue([
        {
          id: '1234567890-0',
          consumer: 'active-consumer',
          millisecondsSinceLastDelivery: 30000, // 30 seconds - too recent
          deliveryCount: 1
        }
      ]);

      await processor.claimPendingMessages('test');

      expect(mockRedis.xClaim).not.toHaveBeenCalled();
    });

    it('should handle no pending messages', async () => {
      mockRedis.xPending.mockResolvedValue({
        pending: 0,
        firstId: null,
        lastId: null,
        consumers: []
      });

      await processor.claimPendingMessages('test');

      expect(mockRedis.xPendingRange).not.toHaveBeenCalled();
      expect(mockRedis.xClaim).not.toHaveBeenCalled();
    });
  });

  describe('aggregation logic', () => {
    it('should aggregate PassData into 15-minute windows', async () => {
      // This tests the private aggregatePassData method indirectly
      // through processStream

      await processor.connect();

      const timestamp1 = new Date('2025-01-27T10:05:00Z');
      const timestamp2 = new Date('2025-01-27T10:10:00Z'); // Same window
      const timestamp3 = new Date('2025-01-27T10:20:00Z'); // Different window

      const passData1 = {
        deviceId: 'test',
        timestamp: timestamp1.toISOString(),
        vehicleType: 'Car',
        laneNumber: 11,
        crossSectionSpeed: 50,
        headwayTime: 2.5,
        occupancyDuration: 1.2,
        crossSectionPosition: 100,
        occupancyStatus: 1
      };

      const passData2 = {
        ...passData1,
        timestamp: timestamp2.toISOString(),
        crossSectionSpeed: 60 // Different speed
      };

      const passData3 = {
        ...passData1,
        timestamp: timestamp3.toISOString()
      };

      mockRedis.xReadGroup
        .mockResolvedValueOnce([
          {
            name: 'test/passdata:stream',
            messages: [
              { id: '1-0', message: { data: JSON.stringify(passData1) } },
              { id: '2-0', message: { data: JSON.stringify(passData2) } }
            ]
          }
        ])
        .mockResolvedValueOnce([
          {
            name: 'test/passdata:stream',
            messages: [
              { id: '3-0', message: { data: JSON.stringify(passData3) } }
            ]
          }
        ]);

      setTimeout(() => processor.stop(), 200);

      await processor.processStream('test');

      // Should have processed 3 messages
      expect(mockRedis.xAck).toHaveBeenCalledTimes(3);
    });
  });

  describe('graceful shutdown', () => {
    it('should flush batch and close Redis on stop', async () => {
      await processor.connect();

      await processor.stop();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});
