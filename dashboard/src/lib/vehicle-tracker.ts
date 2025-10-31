/**
 * Vehicle Tracker
 * Handles vehicle tracking and movement calculations
 */

import { ObjectData, VehicleEntry } from '../types/radar';
import { VehiclePosition, VehicleState, TrackingUpdate, VehicleTrackingData, CoordinateTransform, DETECTION_ZONE, TrailConfig } from '../types/tracking';

export class VehicleTracker {
  private vehicles: Map<string, VehicleState> = new Map();
  private vehicleHistory: Map<string, VehiclePosition[]> = new Map();
  private trailConfig: TrailConfig;

  constructor(trailConfig?: Partial<TrailConfig>) {
    this.trailConfig = {
      length: trailConfig?.length || 50,
      opacity: trailConfig?.opacity || 0.8,
      fadeDuration: trailConfig?.fadeDuration || 5000,
      colorMode: trailConfig?.colorMode || 'vehicle',
      thickness: trailConfig?.thickness || 2,
      smoothness: trailConfig?.smoothness || 0.5,
      persistence: trailConfig?.persistence || false
    };
    console.log('🚗 VehicleTracker initialized with trail config:', this.trailConfig);
  }

  /**
   * Process ObjectData and update vehicle tracking
   */
  public processObjectData(objectData: ObjectData): TrackingUpdate {
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

      // Update vehicle state
      const vehicleState: VehicleState = {
        targetId: entry.targetId,
        position: vehiclePosition,
        trajectory: this.getVehicleTrajectory(entry.targetId),
        isVisible: this.isVehicleInDetectionZone(vehiclePosition),
        lastSeen: currentTime,
        enterTime: this.getVehicleEnterTime(entry.targetId, currentTime)
      };

      // Update vehicle history
      this.updateVehicleHistory(entry.targetId, vehiclePosition);
      
      // Update vehicle state
      this.vehicles.set(entry.targetId, vehicleState);
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
  public getTrackingData(): VehicleTrackingData {
    const allVehicles = Array.from(this.vehicles.values());
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
  public getVisibleVehicles(): VehicleState[] {
    return Array.from(this.vehicles.values()).filter(v => v.isVisible);
  }

  /**
   * Get specific vehicle by ID
   */
  public getVehicle(targetId: string): VehicleState | undefined {
    return this.vehicles.get(targetId);
  }

  /**
   * Get vehicle trajectory
   */
  private getVehicleTrajectory(targetId: string): VehiclePosition[] {
    return this.vehicleHistory.get(targetId) || [];
  }

  /**
   * Update vehicle history
   */
  private updateVehicleHistory(targetId: string, position: VehiclePosition): void {
    const history = this.vehicleHistory.get(targetId) || [];
    history.push(position);
    
    // Keep only recent history based on trail configuration
    if (history.length > this.trailConfig.length) {
      history.shift();
    }
    
    this.vehicleHistory.set(targetId, history);
  }

  /**
   * Get vehicle enter time
   */
  private getVehicleEnterTime(targetId: string, currentTime: Date): Date {
    const existingVehicle = this.vehicles.get(targetId);
    return existingVehicle?.enterTime || currentTime;
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
  public cleanupOldVehicles(maxAge: number = 300000): void { // 5 minutes
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - maxAge);
    
    for (const [targetId, vehicle] of Array.from(this.vehicles.entries())) {
      if (vehicle.lastSeen < cutoffTime) {
        this.vehicles.delete(targetId);
        this.vehicleHistory.delete(targetId);
      }
    }
  }
}