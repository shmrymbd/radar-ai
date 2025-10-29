/**
 * Lane Configuration Service
 *
 * Manages lane names and configurations stored in MongoDB
 */

import { connectToDatabase } from './mongodb';
import {
  DeviceLaneConfig,
  LaneConfig,
  DEFAULT_LANE_THRESHOLDS,
  DEFAULT_LANE_ALERTS,
  DEFAULT_DISPLAY_OPTIONS
} from '@/types/lane-config';

export class LaneConfigService {
  private static instance: LaneConfigService;
  private collectionName = 'lane_configurations';

  public static getInstance(): LaneConfigService {
    if (!LaneConfigService.instance) {
      LaneConfigService.instance = new LaneConfigService();
    }
    return LaneConfigService.instance;
  }

  /**
   * Get lane configuration for a device
   */
  async getLaneConfig(deviceId: string): Promise<DeviceLaneConfig | null> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(this.collectionName);

      const config = await collection.findOne({ deviceId });

      if (!config) {
        return null;
      }

      return {
        _id: config._id.toString(),
        deviceId: config.deviceId,
        lanes: config.lanes,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      };
    } catch (error) {
      console.error('Error getting lane config:', error);
      throw error;
    }
  }

  /**
   * Create or update lane configuration for a device
   */
  async saveLaneConfig(deviceId: string, lanes: LaneConfig[]): Promise<DeviceLaneConfig> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(this.collectionName);

      const now = new Date();
      const existingConfig = await collection.findOne({ deviceId });

      if (existingConfig) {
        // Update existing configuration
        await collection.updateOne(
          { deviceId },
          {
            $set: {
              lanes,
              updatedAt: now
            }
          }
        );

        return {
          _id: existingConfig._id.toString(),
          deviceId,
          lanes,
          createdAt: existingConfig.createdAt,
          updatedAt: now
        };
      } else {
        // Create new configuration
        const result = await collection.insertOne({
          deviceId,
          lanes,
          createdAt: now,
          updatedAt: now
        });

        return {
          _id: result.insertedId.toString(),
          deviceId,
          lanes,
          createdAt: now,
          updatedAt: now
        };
      }
    } catch (error) {
      console.error('Error saving lane config:', error);
      throw error;
    }
  }

  /**
   * Delete lane configuration for a device
   */
  async deleteLaneConfig(deviceId: string): Promise<boolean> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(this.collectionName);

      const result = await collection.deleteOne({ deviceId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting lane config:', error);
      throw error;
    }
  }

  /**
   * Get custom name for a lane, or default to "Lane {number}"
   */
  async getLaneName(deviceId: string, laneNumber: number): Promise<string> {
    try {
      const config = await this.getLaneConfig(deviceId);

      if (config) {
        const laneConfig = config.lanes.find(l => l.laneNumber === laneNumber);
        if (laneConfig && laneConfig.customName) {
          return laneConfig.customName;
        }
      }

      return `Lane ${laneNumber}`;
    } catch (error) {
      console.error('Error getting lane name:', error);
      return `Lane ${laneNumber}`;
    }
  }

  /**
   * Create default lane configuration from detected lanes
   */
  async createDefaultConfig(deviceId: string, laneNumbers: number[]): Promise<DeviceLaneConfig> {
    const lanes: LaneConfig[] = laneNumbers.map(num => ({
      laneNumber: num,
      customName: `Lane ${num}`,
      enabled: true,
      thresholds: { ...DEFAULT_LANE_THRESHOLDS },
      alerts: { ...DEFAULT_LANE_ALERTS },
      displayOptions: { ...DEFAULT_DISPLAY_OPTIONS }
    }));

    return this.saveLaneConfig(deviceId, lanes);
  }
}
