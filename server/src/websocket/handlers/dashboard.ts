/**
 * WebSocket Dashboard Handler
 * Handles dashboard data requests and real-time updates
 */

import { WebSocket } from 'ws';
import { RedisStorage } from '../../services/redis/storage';
import { createLogger } from '../../utils/logger';

const logger = createLogger('dashboard-handler');

export class DashboardHandler {
  private redisStorage: RedisStorage;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.redisStorage = RedisStorage.getInstance();
  }

  /**
   * Handle get dashboard data request
   */
  public async handleGetDashboardData(
    ws: WebSocket,
    deviceId: string,
    sendMessage: (ws: WebSocket, message: any) => void
  ): Promise<void> {
    try {
      const data = await this.getLatestDashboardData(deviceId);
      sendMessage(ws, {
        type: 'dashboard_data',
        deviceId: deviceId,
        data: data,
      });
    } catch (error) {
      logger.error('Error sending dashboard data', { deviceId, error });
      sendMessage(ws, {
        type: 'error',
        message: 'Failed to get dashboard data',
      });
    }
  }

  /**
   * Get latest dashboard data for device
   */
  private async getLatestDashboardData(deviceId: string) {
    try {
      this.redisStorage.setDevicePrefix(deviceId);
      return await this.redisStorage.getDashboardSummary();
    } catch (error) {
      logger.error('Error getting latest dashboard data', { deviceId, error });
      return null;
    }
  }

  /**
   * Start periodic dashboard updates for device
   */
  public startDeviceUpdates(
    deviceId: string,
    broadcastCallback: (deviceId: string, data: any) => void
  ): void {
    if (this.updateIntervals.has(deviceId)) {
      return; // Already running
    }

    const interval = setInterval(async () => {
      try {
        const data = await this.getLatestDashboardData(deviceId);
        if (data) {
          broadcastCallback(deviceId, {
            type: 'dashboard_update',
            deviceId: deviceId,
            data: data,
          });
        }
      } catch (error) {
        logger.error('Error in device update interval', { deviceId, error });
      }
    }, 1000); // Update every 1 second for real-time updates

    this.updateIntervals.set(deviceId, interval);
    logger.info('Started dashboard updates for device', { deviceId });
  }

  /**
   * Stop periodic dashboard updates for device
   */
  public stopDeviceUpdates(deviceId: string): void {
    if (this.updateIntervals.has(deviceId)) {
      clearInterval(this.updateIntervals.get(deviceId)!);
      this.updateIntervals.delete(deviceId);
      logger.info('Stopped dashboard updates for device', { deviceId });
    }
  }

  /**
   * Get available devices
   */
  public getAvailableDevices(): Array<{ id: string; name: string; status: string }> {
    return [
      { id: 'P1-center', name: 'P1 Center', status: 'online' },
      { id: 'P3', name: 'P3 Radar', status: 'online' },
      { id: 'P1-o/h', name: 'P1 Overhead', status: 'online' },
    ];
  }

  /**
   * Cleanup all intervals on shutdown
   */
  public cleanup(): void {
    for (const [deviceId, interval] of this.updateIntervals) {
      clearInterval(interval);
      logger.info('Cleaned up dashboard updates', { deviceId });
    }
    this.updateIntervals.clear();
  }
}
