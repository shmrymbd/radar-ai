/**
 * Vehicle Tracker
 * Handles vehicle tracking and movement calculations
 * Uses Redis for all data storage (no in-memory cache)
 */

import { ObjectData, VehicleEntry } from '../types/radar';
import { VehiclePosition, VehicleState, TrackingUpdate, VehicleTrackingData, CoordinateTransform, DETECTION_ZONE, TrailConfig } from '../types/tracking';
import { VehicleTrackingRedis } from './vehicle-tracking-redis';

export class VehicleTracker {
  private trackingRedis: VehicleTrackingRedis;
  private trailConfig: TrailConfig;
  private deviceId: string = 'P1-center';

  constructor(trailConfig?: Partial<TrailConfig>, deviceId?: string) {
    this.trailConfig = {
      length: trailConfig?.length || 50,
      opacity: trailConfig?.opacity || 0.8,
      fadeDuration: trailConfig?.fadeDuration || 5000,
      colorMode: trailConfig?.colorMode || 'vehicle',
      thickness: trailConfig?.thickness || 2,
      smoothness: trailConfig?.smoothness || 0.5,
      persistence: trailConfig?.persistence || false
    };
    
    if (deviceId) {
      this.deviceId = deviceId;
    }
    
    this.trackingRedis = VehicleTrackingRedis.getInstance();
    this.trackingRedis.setDeviceId(this.deviceId);
    
    console.log(`🚗 VehicleTracker initialized with Redis storage (device: ${this.deviceId})`);
  }

  /**
   * Set device ID for tracking
   */
  public setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
    this.trackingRedis.setDeviceId(deviceId);
  }

  /**
   * Process ObjectData and update vehicle tracking
   */
  public async processObjectData(objectData: ObjectData): Promise<TrackingUpdate> {
    const currentTime = new Date();
    const vehicles: VehicleState[] = [];

    // Process each vehicle entry
    for (const entry of objectData.entries) {
      const vehiclePosition: VehiclePosition = {
        targetId: entry.targetId,
        x: entry.xCoordM,
        y: entry.yCoordM,
        length: entry.vehicleLength,
        width: entry.vehicleWidth,
        height: entry.vehicleHeight,
        speed: entry.speedKmh,
        vehicleType: this.getVehicleTypeName(entry.targetType),
        laneNo: entry.laneNo,
        timestamp: new Date(objectData.timestamp),
        xSpeed: entry.xSpeed,
        ySpeed: entry.ySpeed,
        acceleration: entry.acceleration
      };

      // Get existing vehicle state from Redis
      const existingVehicle = await this.trackingRedis.getVehicleState(entry.targetId);
      const trajectory = existingVehicle ? await this.trackingRedis.getVehicleHistory(entry.targetId) : [];

      // Update vehicle state
      const vehicleState: VehicleState = {
        targetId: entry.targetId,
        position: vehiclePosition,
        trajectory: trajectory,
        isVisible: this.isVehicleInDetectionZone(vehiclePosition),
        lastSeen: currentTime,
        enterTime: existingVehicle?.enterTime || currentTime
      };

      // Update vehicle history in Redis
      await this.trackingRedis.addToVehicleHistory(entry.targetId, vehiclePosition, this.trailConfig.length);
      
      // Update vehicle state in Redis
      await this.trackingRedis.setVehicleState(entry.targetId, vehicleState);
      vehicles.push(vehicleState);
    }

    return {
      type: 'vehicle_update' as const,
      vehicles: vehicles.map(v => v.position),
      timestamp: currentTime.getTime()
    };
  }

  /**
   * Get current tracking data
   */
  public async getTrackingData(): Promise<VehicleTrackingData> {
    const allVehicles = await this.trackingRedis.getAllVehicleStates();
    const visibleVehicles = allVehicles.filter(v => v.isVisible);
    
    const averageSpeed = visibleVehicles.length > 0 
      ? visibleVehicles.reduce((sum, v) => sum + v.position.speed, 0) / visibleVehicles.length 
      : 0;
    
    return {
      timestamp: new Date(),
      vehicles: visibleVehicles,
      totalVehicles: allVehicles.length,
      vehiclesInZone: visibleVehicles.length,
      averageSpeed,
      trafficDensity: visibleVehicles.length / 100 // vehicles per 100m
    };
  }

  /**
   * Get visible vehicles
   */
  public async getVisibleVehicles(): Promise<VehicleState[]> {
    return await this.trackingRedis.getVisibleVehicles();
  }

  /**
   * Get specific vehicle by ID
   */
  public async getVehicle(targetId: string): Promise<VehicleState | undefined> {
    return await this.trackingRedis.getVehicleState(targetId);
  }

  /**
   * Check if vehicle is in detection zone
   */
  private isVehicleInDetectionZone(position: VehiclePosition): boolean {
    return position.x >= DETECTION_ZONE.minX && 
           position.x <= DETECTION_ZONE.maxX &&
           position.y >= DETECTION_ZONE.minY && 
           position.y <= DETECTION_ZONE.maxY;
  }

  /**
   * Convert vehicle type code to name
   */
  private getVehicleTypeName(typeCode: number): string {
    // Official ClairWav Communication Protocol V2.1 - Video Integrated Models (Section 2.2.2)
    const typeMap: Record<number, string> = {
      0: 'other',
      1: 'bicycle',
      2: 'motorcycle',
      3: 'tricycle',
      4: 'bus',
      5: 'van',
      6: 'car',
      7: 'suv',
      8: 'large_truck',
      9: 'medium_truck',
      10: 'light_truck',
      11: 'dangerous_goods',
      12: 'engineering_vehicle',
      13: 'pedestrian',
      14: 'medium_bus'
    };

    return typeMap[typeCode] || 'other';
  }

  /**
   * Update trail configuration
   */
  public updateTrailConfig(newConfig: Partial<TrailConfig>): void {
    this.trailConfig = { ...this.trailConfig, ...newConfig };
    console.log('🚗 VehicleTracker trail config updated:', this.trailConfig);
  }

  /**
   * Get current trail configuration
   */
  public getTrailConfig(): TrailConfig {
    return { ...this.trailConfig };
  }

  /**
   * Clean up old vehicles
   */
  public async cleanupOldVehicles(maxAge: number = 300000): Promise<void> { // 5 minutes
    await this.trackingRedis.cleanupOldVehicles(maxAge);
  }
}