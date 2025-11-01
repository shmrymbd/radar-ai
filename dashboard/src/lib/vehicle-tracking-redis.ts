/**
 * Redis-based Vehicle Tracking Storage
 * Stores all vehicle tracking data in Redis instead of in-memory
 */

import { getRedisClient } from './redis';
import { VehicleState, VehiclePosition } from '@/types/tracking';

export class VehicleTrackingRedis {
  private static instance: VehicleTrackingRedis;
  private deviceId: string = 'P1-center'; // Default device

  private constructor() {}

  public static getInstance(): VehicleTrackingRedis {
    if (!VehicleTrackingRedis.instance) {
      VehicleTrackingRedis.instance = new VehicleTrackingRedis();
    }
    return VehicleTrackingRedis.instance;
  }

  /**
   * Set device ID for tracking operations
   */
  public setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
  }

  /**
   * Get Redis key for vehicle state
   */
  private getVehicleStateKey(targetId: string): string {
    return `${this.deviceId}/tracking/vehicle/${targetId}`;
  }

  /**
   * Get Redis key for vehicle history
   */
  private getVehicleHistoryKey(targetId: string): string {
    return `${this.deviceId}/tracking/history/${targetId}`;
  }

  /**
   * Get Redis key for all vehicle IDs
   */
  private getVehicleIdsKey(): string {
    return `${this.deviceId}/tracking/vehicle_ids`;
  }

  /**
   * Store vehicle state in Redis
   */
  public async setVehicleState(targetId: string, vehicle: VehicleState): Promise<void> {
    try {
      const client = await getRedisClient();
      const key = this.getVehicleStateKey(targetId);

      // Store vehicle state as JSON string in hash - use single hSet call with object
      await client.hSet(key, {
        'targetId': vehicle.targetId,
        'position': JSON.stringify(vehicle.position),
        'trajectory': JSON.stringify(vehicle.trajectory),
        'isVisible': vehicle.isVisible ? '1' : '0',
        'lastSeen': vehicle.lastSeen.toISOString(),
        'enterTime': vehicle.enterTime.toISOString()
      });
      
      // Set TTL (5 minutes default)
      await client.expire(key, 300);

      // Add to vehicle IDs set (no TTL - IDs removed explicitly on cleanup)
      await client.sAdd(this.getVehicleIdsKey(), targetId);
    } catch (error) {
      console.error(`Error storing vehicle state for ${targetId}:`, error);
      throw error;
    }
  }

  /**
   * Batch store multiple vehicle states using pipeline for performance
   */
  public async batchSetVehicleStates(vehicles: Map<string, VehicleState>): Promise<void> {
    if (vehicles.size === 0) return;
    
    try {
      const client = await getRedisClient();
      const pipeline = client.multi();
      const vehicleIdsKey = this.getVehicleIdsKey();

      for (const [targetId, vehicle] of vehicles) {
        const key = this.getVehicleStateKey(targetId);
        
        // Batch set hash fields
        pipeline.hSet(key, {
          'targetId': vehicle.targetId,
          'position': JSON.stringify(vehicle.position),
          'trajectory': JSON.stringify(vehicle.trajectory),
          'isVisible': vehicle.isVisible ? '1' : '0',
          'lastSeen': vehicle.lastSeen.toISOString(),
          'enterTime': vehicle.enterTime.toISOString()
        });
        pipeline.expire(key, 300);
        
        // Add to vehicle IDs set (no TTL - IDs removed explicitly on cleanup)
        pipeline.sAdd(vehicleIdsKey, targetId);
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Error batch storing vehicle states:', error);
      throw error;
    }
  }

  /**
   * Get vehicle state from Redis
   */
  public async getVehicleState(targetId: string): Promise<VehicleState | undefined> {
    try {
      const client = await getRedisClient();
      const key = this.getVehicleStateKey(targetId);
      
      const data = await client.hGetAll(key);
      
      if (!data || Object.keys(data).length === 0) {
        return undefined;
      }

      return {
        targetId: data.targetId,
        position: JSON.parse(data.position),
        trajectory: JSON.parse(data.trajectory || '[]'),
        isVisible: data.isVisible === '1',
        lastSeen: new Date(data.lastSeen),
        enterTime: new Date(data.enterTime)
      };
    } catch (error) {
      console.error(`Error getting vehicle state for ${targetId}:`, error);
      return undefined;
    }
  }

  /**
   * Get all vehicle states - optimized with pipeline
   * Filters out orphaned IDs and cleans them up asynchronously
   */
  public async getAllVehicleStates(): Promise<VehicleState[]> {
    try {
      const client = await getRedisClient();
      const vehicleIds = await client.sMembers(this.getVehicleIdsKey());

      if (vehicleIds.length === 0) {
        return [];
      }

      // Use pipeline to fetch all vehicle states in parallel
      const pipeline = client.multi();
      for (const targetId of vehicleIds) {
        pipeline.hGetAll(this.getVehicleStateKey(targetId));
      }

      const results = await pipeline.exec();
      const vehicles: VehicleState[] = [];
      const orphanedIds: string[] = [];

      for (let i = 0; i < results.length; i++) {
        const data = results[i] as Record<string, string> | null;
        const targetId = vehicleIds[i];

        // Filter out null/empty results (expired keys)
        if (!data || Object.keys(data).length === 0) {
          orphanedIds.push(targetId);
          continue;
        }

        try {
          vehicles.push({
            targetId: data.targetId,
            position: JSON.parse(data.position),
            trajectory: JSON.parse(data.trajectory || '[]'),
            isVisible: data.isVisible === '1',
            lastSeen: new Date(data.lastSeen),
            enterTime: new Date(data.enterTime)
          });
        } catch (parseError) {
          console.error(`Error parsing vehicle state for ${targetId}:`, parseError);
          orphanedIds.push(targetId);
        }
      }

      // Cleanup orphaned IDs asynchronously (don't block response)
      if (orphanedIds.length > 0) {
        this.removeOrphanedIds(orphanedIds).catch(err =>
          console.error('Error removing orphaned IDs:', err)
        );
      }

      return vehicles;
    } catch (error) {
      console.error('Error getting all vehicle states:', error);
      return [];
    }
  }

  /**
   * Remove orphaned vehicle IDs from Set (async helper)
   */
  private async removeOrphanedIds(targetIds: string[]): Promise<void> {
    try {
      const client = await getRedisClient();
      const pipeline = client.multi();
      for (const targetId of targetIds) {
        pipeline.sRem(this.getVehicleIdsKey(), targetId);
      }
      await pipeline.exec();
      console.log(`🧹 Removed ${targetIds.length} orphaned vehicle IDs from Set`);
    } catch (error) {
      console.error('Error removing orphaned IDs:', error);
      throw error;
    }
  }

  /**
   * Batch get multiple vehicle states using pipeline
   * Filters out null/empty results from expired keys
   */
  public async batchGetVehicleStates(targetIds: string[]): Promise<Map<string, VehicleState>> {
    if (targetIds.length === 0) {
      return new Map();
    }

    try {
      const client = await getRedisClient();
      const pipeline = client.multi();

      for (const targetId of targetIds) {
        pipeline.hGetAll(this.getVehicleStateKey(targetId));
      }

      const results = await pipeline.exec();
      const vehicles = new Map<string, VehicleState>();
      let hitCount = 0;
      let missCount = 0;

      for (let i = 0; i < results.length; i++) {
        const data = results[i] as Record<string, string> | null;
        const targetId = targetIds[i];

        // Filter out null/empty results (expired keys)
        if (!data || Object.keys(data).length === 0) {
          missCount++;
          continue;
        }

        try {
          vehicles.set(targetId, {
            targetId: data.targetId,
            position: JSON.parse(data.position),
            trajectory: JSON.parse(data.trajectory || '[]'),
            isVisible: data.isVisible === '1',
            lastSeen: new Date(data.lastSeen),
            enterTime: new Date(data.enterTime)
          });
          hitCount++;
        } catch (parseError) {
          console.error(`Error parsing vehicle state for ${targetId}:`, parseError);
          missCount++;
        }
      }

      // Log hit/miss ratio for monitoring
      if (missCount > 0) {
        const hitRate = ((hitCount / targetIds.length) * 100).toFixed(1);
        console.log(`📊 Batch get stats: ${hitCount} hits, ${missCount} misses (${hitRate}% hit rate)`);
      }

      return vehicles;
    } catch (error) {
      console.error('Error batch getting vehicle states:', error);
      return new Map();
    }
  }

  /**
   * Add position to vehicle history (trajectory)
   */
  public async addToVehicleHistory(targetId: string, position: VehiclePosition, maxLength: number = 50): Promise<void> {
    try {
      const client = await getRedisClient();
      const key = this.getVehicleHistoryKey(targetId);
      
      // Add position to list
      await client.lPush(key, JSON.stringify(position));
      
      // Trim to max length
      await client.lTrim(key, 0, maxLength - 1);
      
      // Set TTL (5 minutes)
      await client.expire(key, 300);
    } catch (error) {
      console.error(`Error adding to vehicle history for ${targetId}:`, error);
    }
  }

  /**
   * Batch add positions to vehicle histories using pipeline
   */
  public async batchAddToVehicleHistories(updates: Map<string, VehiclePosition>, maxLength: number = 50): Promise<void> {
    if (updates.size === 0) return;
    
    try {
      const client = await getRedisClient();
      const pipeline = client.multi();
      
      for (const [targetId, position] of updates) {
        const key = this.getVehicleHistoryKey(targetId);
        pipeline.lPush(key, JSON.stringify(position));
        pipeline.lTrim(key, 0, maxLength - 1);
        pipeline.expire(key, 300);
      }
      
      await pipeline.exec();
    } catch (error) {
      console.error('Error batch adding to vehicle histories:', error);
    }
  }

  /**
   * Batch get vehicle histories using pipeline
   */
  public async batchGetVehicleHistories(targetIds: string[]): Promise<Map<string, VehiclePosition[]>> {
    if (targetIds.length === 0) {
      return new Map();
    }

    try {
      const client = await getRedisClient();
      const pipeline = client.multi();
      
      for (const targetId of targetIds) {
        pipeline.lRange(this.getVehicleHistoryKey(targetId), 0, -1);
      }
      
      const results = await pipeline.exec();
      const histories = new Map<string, VehiclePosition[]>();
      
      for (let i = 0; i < results.length; i++) {
        const history = results[i] as string[] | null;
        const targetId = targetIds[i];
        
        if (history && history.length > 0) {
          try {
            histories.set(targetId, history.map((item: string) => JSON.parse(item)));
          } catch (parseError) {
            console.error(`Error parsing vehicle history for ${targetId}:`, parseError);
            histories.set(targetId, []);
          }
        } else {
          histories.set(targetId, []);
        }
      }

      return histories;
    } catch (error) {
      console.error('Error batch getting vehicle histories:', error);
      return new Map();
    }
  }

  /**
   * Get vehicle history (trajectory)
   */
  public async getVehicleHistory(targetId: string): Promise<VehiclePosition[]> {
    try {
      const client = await getRedisClient();
      const key = this.getVehicleHistoryKey(targetId);
      
      const history = await client.lRange(key, 0, -1);
      
      return history.map((item: string) => JSON.parse(item));
    } catch (error) {
      console.error(`Error getting vehicle history for ${targetId}:`, error);
      return [];
    }
  }

  /**
   * Delete vehicle state and history
   */
  public async deleteVehicle(targetId: string): Promise<void> {
    try {
      const client = await getRedisClient();
      const stateKey = this.getVehicleStateKey(targetId);
      const historyKey = this.getVehicleHistoryKey(targetId);

      // Delete state and history keys
      await client.del(stateKey);
      await client.del(historyKey);

      // Remove from vehicle IDs set
      const removed = await client.sRem(this.getVehicleIdsKey(), targetId);

      if (removed > 0) {
        console.log(`🗑️ Deleted vehicle ${targetId} from tracking`);
      }
    } catch (error) {
      console.error(`❌ Error deleting vehicle ${targetId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old vehicles (not seen for maxAge milliseconds)
   * Also removes orphaned IDs (vehicles in Set but with expired state keys)
   */
  public async cleanupOldVehicles(maxAge: number = 300000): Promise<void> {
    try {
      const client = await getRedisClient();
      const vehicleIds = await client.sMembers(this.getVehicleIdsKey());
      const cutoffTime = new Date(Date.now() - maxAge);
      let removedCount = 0;
      let orphanedCount = 0;

      for (const targetId of vehicleIds) {
        // Check if state key exists
        const stateKey = this.getVehicleStateKey(targetId);
        const exists = await client.exists(stateKey);

        if (!exists) {
          // Orphaned ID - remove from Set
          await client.sRem(this.getVehicleIdsKey(), targetId);
          orphanedCount++;
          console.log(`🧹 Removed orphaned vehicle ID: ${targetId}`);
          continue;
        }

        // Check if vehicle is too old
        const vehicle = await this.getVehicleState(targetId);
        if (vehicle && vehicle.lastSeen < cutoffTime) {
          await this.deleteVehicle(targetId);
          removedCount++;
        }
      }

      if (removedCount > 0 || orphanedCount > 0) {
        const totalRemoved = removedCount + orphanedCount;
        const remainingCount = vehicleIds.length - totalRemoved;
        console.log(`🧹 Cleanup complete: ${removedCount} expired vehicles, ${orphanedCount} orphaned IDs removed. ${remainingCount} vehicles remaining.`);
      }
    } catch (error) {
      console.error('Error cleaning up old vehicles:', error);
    }
  }

  /**
   * Get visible vehicles only
   */
  public async getVisibleVehicles(): Promise<VehicleState[]> {
    const allVehicles = await this.getAllVehicleStates();
    return allVehicles.filter(v => v.isVisible);
  }

  /**
   * Clear all tracking data for device
   */
  public async clearAll(): Promise<void> {
    try {
      const client = await getRedisClient();
      const vehicleIds = await client.sMembers(this.getVehicleIdsKey());
      
      // Delete all vehicle states and histories
      for (const targetId of vehicleIds) {
        await this.deleteVehicle(targetId);
      }
      
      // Delete the set itself
      await client.del(this.getVehicleIdsKey());
    } catch (error) {
      console.error('Error clearing all tracking data:', error);
    }
  }
}

