/**
 * WebSocket Tracking Handler
 * Handles vehicle tracking real-time updates
 */

import { WebSocket } from 'ws';
import { VehicleTracker } from '../../services/tracking/vehicle-tracker';
import { RedisPubSubService } from '../../services/redis/pubsub';
import { ObjectData } from '../../types/radar';
import { createLogger } from '../../utils/logger';

const logger = createLogger('tracking-handler');

export class TrackingHandler {
  private vehicleTracker: VehicleTracker;
  private redisPubSub: RedisPubSubService;

  constructor() {
    this.vehicleTracker = new VehicleTracker();
    this.redisPubSub = RedisPubSubService.getInstance();
  }

  /**
   * Initialize tracking handler with pub/sub
   */
  public async initialize(): Promise<void> {
    try {
      // Subscribe to ObjectData keyspace notifications for real-time updates
      await this.redisPubSub.subscribeToObjectData('P1-center');
      logger.info('Subscribed to ObjectData keyspace notifications');
    } catch (error) {
      logger.error('Failed to subscribe to ObjectData', { error });
    }
  }

  /**
   * Set device ID for tracking
   */
  public setDeviceId(deviceId: string): void {
    this.vehicleTracker.setDeviceId(deviceId);
  }

  /**
   * Handle get tracking data request
   */
  public async handleGetTrackingData(ws: WebSocket, sendMessage: (ws: WebSocket, message: any) => void): Promise<void> {
    try {
      const trackingData = await this.vehicleTracker.getTrackingData();
      sendMessage(ws, {
        type: 'tracking_data',
        data: trackingData,
      });
    } catch (error) {
      logger.error('Error sending tracking data', { error });
      sendMessage(ws, {
        type: 'error',
        message: 'Failed to get tracking data',
      });
    }
  }

  /**
   * Handle get vehicle details request
   */
  public async handleGetVehicleDetails(
    ws: WebSocket,
    targetId: string,
    sendMessage: (ws: WebSocket, message: any) => void
  ): Promise<void> {
    try {
      const vehicle = await this.vehicleTracker.getVehicle(targetId);
      sendMessage(ws, {
        type: 'vehicle_details',
        data: vehicle,
      });
    } catch (error) {
      logger.error('Error getting vehicle details', { targetId, error });
      sendMessage(ws, {
        type: 'error',
        message: 'Failed to get vehicle details',
      });
    }
  }

  /**
   * Handle get visible vehicles request
   */
  public async handleGetVisibleVehicles(
    ws: WebSocket,
    sendMessage: (ws: WebSocket, message: any) => void
  ): Promise<void> {
    try {
      const visibleVehicles = await this.vehicleTracker.getVisibleVehicles();
      sendMessage(ws, {
        type: 'visible_vehicles',
        data: visibleVehicles,
      });
    } catch (error) {
      logger.error('Error getting visible vehicles', { error });
      sendMessage(ws, {
        type: 'error',
        message: 'Failed to get visible vehicles',
      });
    }
  }

  /**
   * Register callback for ObjectData updates
   */
  public onObjectDataUpdate(
    callback: (deviceId: string, trackingUpdate: any, trackingData: any) => void
  ): void {
    this.redisPubSub.onObjectDataMessage(async (deviceId, data) => {
      try {
        logger.debug('ObjectData received', {
          deviceId,
          numVehicles: data.numEntries || 0,
        });

        // Set device ID
        this.vehicleTracker.setDeviceId(deviceId);

        // Convert to ObjectData format
        const objectData: ObjectData = {
          deviceId: data.deviceId,
          frameType: '0x01',
          timestamp: data.timestamp,
          numEntries: data.numEntries,
          entries: data.entries || [],
          packetSize: data.packetSize || 0,
        };

        // Process tracking update
        const trackingUpdate = await this.vehicleTracker.processObjectData(objectData);

        // Get tracking summary
        const trackingData = await this.vehicleTracker.getTrackingData();

        // Invoke callback
        callback(deviceId, trackingUpdate, trackingData);
      } catch (error) {
        logger.error('Error processing ObjectData', { deviceId, error });
      }
    });
  }

  /**
   * Cleanup old vehicles periodically
   */
  public async cleanupOldVehicles(maxAge: number = 300000): Promise<void> {
    await this.vehicleTracker.cleanupOldVehicles(maxAge);
  }
}
