import { ObjectData, VehicleEntry } from '@/types/radar';
import { VehiclePosition, VehicleState, TrackingUpdate, VehicleTrackingData, CoordinateTransform, DETECTION_ZONE } from '@/types/tracking';

export class VehicleTracker {
  private vehicles: Map<string, VehicleState> = new Map();
  private coordinateTransform: CoordinateTransform;
  private maxTrailLength: number = 50;
  private vehicleTimeout: number = 5000; // 5 seconds

  constructor() {
    this.coordinateTransform = {
      radarToVisual: this.radarToVisual.bind(this),
      visualToRadar: this.visualToRadar.bind(this)
    };
  }

  /**
   * Process Object Data (0x01) for vehicle tracking
   */
  public processObjectData(objectData: ObjectData): TrackingUpdate {
    const currentTime = new Date();
    const vehiclePositions: VehiclePosition[] = [];
    const updatedVehicles = new Set<string>();

    // Process each vehicle entry
    for (const entry of objectData.entries) {
      if (this.isVehicleInDetectionZone(entry)) {
        const vehiclePosition = this.createVehiclePosition(entry, currentTime);
        vehiclePositions.push(vehiclePosition);
        
        // Update vehicle state
        this.updateVehicleState(vehiclePosition);
        updatedVehicles.add(entry.targetId);
      }
    }

    // Mark vehicles that are no longer detected as exited
    const exitedVehicles = this.handleExitedVehicles(updatedVehicles, currentTime);
    
    return {
      type: 'vehicle_update',
      timestamp: currentTime.getTime(),
      vehicles: vehiclePositions
    };
  }

  /**
   * Get current vehicle tracking data
   */
  public getTrackingData(): VehicleTrackingData {
    const currentTime = new Date();
    const vehicles = Array.from(this.vehicles.values());
    const vehiclesInZone = vehicles.filter(v => v.isVisible).length;
    
    const speeds = vehicles
      .filter(v => v.isVisible && v.position.speed > 0)
      .map(v => v.position.speed);
    
    const averageSpeed = speeds.length > 0 
      ? speeds.reduce((a, b) => a + b, 0) / speeds.length 
      : 0;

    return {
      timestamp: currentTime,
      vehicles,
      totalVehicles: vehicles.length,
      vehiclesInZone,
      averageSpeed,
      trafficDensity: this.calculateTrafficDensity(vehicles)
    };
  }

  /**
   * Get all visible vehicles
   */
  public getVisibleVehicles(): VehicleState[] {
    return Array.from(this.vehicles.values()).filter(v => v.isVisible);
  }

  /**
   * Get vehicle by target ID
   */
  public getVehicle(targetId: string): VehicleState | undefined {
    return this.vehicles.get(targetId);
  }

  /**
   * Clear all vehicle data
   */
  public clearAllVehicles(): void {
    this.vehicles.clear();
  }

  /**
   * Check if vehicle is within detection zone
   */
  private isVehicleInDetectionZone(entry: VehicleEntry): boolean {
    return entry.xCoordM >= DETECTION_ZONE.minX &&
           entry.xCoordM <= DETECTION_ZONE.maxX &&
           entry.yCoordM >= DETECTION_ZONE.minY &&
           entry.yCoordM <= DETECTION_ZONE.maxY;
  }

  /**
   * Create vehicle position from radar entry
   */
  private createVehiclePosition(entry: VehicleEntry, timestamp: Date): VehiclePosition {
    return {
      targetId: entry.targetId,
      x: entry.xCoordM,
      y: entry.yCoordM,
      length: entry.vehicleLength,
      width: entry.vehicleWidth,
      height: entry.vehicleHeight,
      speed: entry.speedKmh,
      vehicleType: this.getVehicleTypeName(entry.targetType),
      laneNo: entry.laneNo,
      timestamp,
      xSpeed: entry.xSpeed,
      ySpeed: entry.ySpeed,
      acceleration: entry.acceleration
    };
  }

  /**
   * Update vehicle state with new position
   */
  private updateVehicleState(position: VehiclePosition): void {
    const existingVehicle = this.vehicles.get(position.targetId);
    
    if (existingVehicle) {
      // Update existing vehicle
      existingVehicle.previousPosition = existingVehicle.position;
      existingVehicle.position = position;
      existingVehicle.isVisible = true;
      existingVehicle.lastSeen = position.timestamp;
      
      // Add to trajectory
      existingVehicle.trajectory.push(position);
      if (existingVehicle.trajectory.length > this.maxTrailLength) {
        existingVehicle.trajectory.shift();
      }
    } else {
      // Create new vehicle
      const newVehicle: VehicleState = {
        targetId: position.targetId,
        position,
        trajectory: [position],
        isVisible: true,
        lastSeen: position.timestamp,
        enterTime: position.timestamp
      };
      this.vehicles.set(position.targetId, newVehicle);
    }
  }

  /**
   * Handle vehicles that are no longer detected
   */
  private handleExitedVehicles(updatedVehicles: Set<string>, currentTime: Date): VehiclePosition[] {
    const exitedVehicles: VehiclePosition[] = [];
    
    for (const [targetId, vehicle] of this.vehicles.entries()) {
      if (!updatedVehicles.has(targetId)) {
        const timeSinceLastSeen = currentTime.getTime() - vehicle.lastSeen.getTime();
        
        if (timeSinceLastSeen > this.vehicleTimeout) {
          // Mark vehicle as no longer visible
          vehicle.isVisible = false;
          exitedVehicles.push(vehicle.position);
        }
      }
    }
    
    return exitedVehicles;
  }

  /**
   * Get vehicle type name from target type number
   */
  private getVehicleTypeName(targetType: number): string {
    const vehicleTypes: { [key: number]: string } = {
      1: 'car',
      2: 'van',
      3: 'suv',
      4: 'truck',
      5: 'bicycle',
      6: 'motorcycle',
      7: 'bus',
      8: 'large_truck',
      9: 'medium_truck',
      10: 'light_truck',
      11: 'dangerous_goods',
      12: 'engineering_vehicle',
      13: 'pedestrian'
    };
    
    return vehicleTypes[targetType] || 'unknown';
  }

  /**
   * Calculate traffic density
   */
  private calculateTrafficDensity(vehicles: VehicleState[]): number {
    const visibleVehicles = vehicles.filter(v => v.isVisible);
    const detectionArea = (DETECTION_ZONE.maxX - DETECTION_ZONE.minX) * (DETECTION_ZONE.maxY - DETECTION_ZONE.minY);
    return visibleVehicles.length / detectionArea;
  }

  /**
   * Convert radar coordinates to visual coordinates
   */
  private radarToVisual(radarX: number, radarY: number): { x: number; y: number } {
    const scale = 2; // 1 pixel = 0.5m
    const canvasHeight = 600;
    
    return {
      x: (radarX + 15) * scale, // Offset for lane coverage
      y: canvasHeight - (radarY * scale) // Invert Y-axis
    };
  }

  /**
   * Convert visual coordinates to radar coordinates
   */
  private visualToRadar(screenX: number, screenY: number): { x: number; y: number } {
    const scale = 2;
    const canvasHeight = 600;
    
    return {
      x: (screenX / scale) - 15,
      y: (canvasHeight - screenY) / scale
    };
  }

  /**
   * Get coordinate transform utilities
   */
  public getCoordinateTransform(): CoordinateTransform {
    return this.coordinateTransform;
  }
}
