/**
 * Vehicle Data Generator
 * Generates realistic vehicle movement data for testing and demonstration
 */

import { RedisStorage } from './redis-storage';
import { ObjectData, VehicleEntry } from '@/types/radar';

export class VehicleDataGenerator {
  private redisStorage: RedisStorage;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private vehicles: Map<string, VehicleState> = new Map();

  constructor() {
    this.redisStorage = RedisStorage.getInstance();
  }

  /**
   * Start generating vehicle data
   */
  public start(deviceId: string, intervalMs: number = 2000): void {
    if (this.isRunning) {
      console.log('Vehicle data generator is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🚗 Starting vehicle data generator for device: ${deviceId}`);

    // Initialize vehicles
    this.initializeVehicles(deviceId);

    // Start periodic updates
    this.intervalId = setInterval(() => {
      this.generateVehicleData(deviceId);
    }, intervalMs);
  }

  /**
   * Stop generating vehicle data
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Vehicle data generator stopped');
  }

  /**
   * Initialize vehicles with starting positions
   */
  private initializeVehicles(deviceId: string): void {
    const lanes = [11, 12, 31, 32];
    const vehicleTypes = ['car', 'motorcycle', 'suv', 'truck'];
    
    // Create 3-5 vehicles per lane
    for (const lane of lanes) {
      const vehicleCount = Math.floor(Math.random() * 3) + 2; // 2-4 vehicles per lane
      
      for (let i = 0; i < vehicleCount; i++) {
        const targetId = `${Date.now()}_${lane}_${i}`;
        const vehicle: VehicleState = {
          targetId,
          laneNo: lane,
          x: this.getLaneXPosition(lane) + (Math.random() - 0.5) * 2, // Add some variation
          y: Math.random() * 200 + 50, // Random Y position
          speed: Math.random() * 40 + 20, // 20-60 km/h
          vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
          direction: Math.random() > 0.5 ? 1 : -1, // Forward or backward
          lastUpdate: Date.now()
        };
        
        this.vehicles.set(targetId, vehicle);
      }
    }
  }

  /**
   * Generate new vehicle data
   */
  private async generateVehicleData(deviceId: string): Promise<void> {
    try {
      const currentTime = new Date();
      const entries: VehicleEntry[] = [];

      // Update vehicle positions
      for (const [targetId, vehicle] of this.vehicles) {
        this.updateVehiclePosition(vehicle);
        
        // Create vehicle entry
        const entry: VehicleEntry = {
          targetId: vehicle.targetId,
          laneNo: vehicle.laneNo,
          targetType: this.getVehicleTypeCode(vehicle.vehicleType),
          color: Math.floor(Math.random() * 8),
          plateNumber: this.generatePlateNumber(),
          xCoordM: vehicle.x,
          yCoordM: vehicle.y,
          speedKmh: vehicle.speed,
          azimuthDeg: vehicle.direction > 0 ? 0 : 180,
          longitude: 0,
          latitude: 0,
          imageX: vehicle.x,
          imageY: vehicle.y,
          vehicleLength: this.getVehicleLength(vehicle.vehicleType),
          vehicleWidth: this.getVehicleWidth(vehicle.vehicleType),
          vehicleHeight: this.getVehicleHeight(vehicle.vehicleType),
          parkingStatus: false,
          xSpeed: vehicle.direction * vehicle.speed * 0.1,
          ySpeed: 0,
          acceleration: (Math.random() - 0.5) * 2
        };

        entries.push(entry);
      }

      // Create object data
      const objectData: ObjectData = {
        deviceId,
        frameType: '0x01',
        timestamp: currentTime.toISOString(),
        numEntries: entries.length,
        entries,
        packetSize: entries.length * 64 + 32
      };

      // Store in Redis
      await this.redisStorage.storeRawObjectData(objectData);
      
      console.log(`🚗 Generated data for ${entries.length} vehicles on device ${deviceId}`);
    } catch (error) {
      console.error('Error generating vehicle data:', error);
    }
  }

  /**
   * Update vehicle position
   */
  private updateVehiclePosition(vehicle: VehicleState): void {
    const now = Date.now();
    const deltaTime = (now - vehicle.lastUpdate) / 1000; // Convert to seconds
    vehicle.lastUpdate = now;

    // Update position based on speed and direction
    vehicle.y += vehicle.direction * vehicle.speed * deltaTime * 0.1; // Scale factor
    
    // Add some random movement
    vehicle.x += (Math.random() - 0.5) * 0.5;
    vehicle.speed += (Math.random() - 0.5) * 2;
    vehicle.speed = Math.max(10, Math.min(80, vehicle.speed)); // Clamp speed

    // Reset vehicle if it goes too far
    if (vehicle.y > 300 || vehicle.y < -50) {
      vehicle.y = vehicle.direction > 0 ? -50 : 300;
      vehicle.speed = Math.random() * 40 + 20;
    }
  }

  /**
   * Get X position for lane
   */
  private getLaneXPosition(laneNo: number): number {
    const lanePositions: Record<number, number> = {
      11: -3.5,
      12: 1.5,
      31: -3.5,
      32: 1.5
    };
    return lanePositions[laneNo] || 0;
  }

  /**
   * Get vehicle type code
   */
  private getVehicleTypeCode(vehicleType: string): number {
    const typeCodes: Record<string, number> = {
      'car': 6,
      'motorcycle': 1,
      'suv': 7,
      'truck': 8
    };
    return typeCodes[vehicleType] || 6;
  }

  /**
   * Generate random plate number
   */
  private generatePlateNumber(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let plate = '';
    
    for (let i = 0; i < 3; i++) {
      plate += letters[Math.floor(Math.random() * letters.length)];
    }
    for (let i = 0; i < 3; i++) {
      plate += numbers[Math.floor(Math.random() * numbers.length)];
    }
    
    return plate;
  }

  /**
   * Get vehicle length
   */
  private getVehicleLength(vehicleType: string): number {
    const lengths: Record<string, number> = {
      'car': 4.5,
      'motorcycle': 2.0,
      'suv': 5.0,
      'truck': 8.0
    };
    return lengths[vehicleType] || 4.5;
  }

  /**
   * Get vehicle width
   */
  private getVehicleWidth(vehicleType: string): number {
    const widths: Record<string, number> = {
      'car': 1.8,
      'motorcycle': 1.0,
      'suv': 2.0,
      'truck': 2.5
    };
    return widths[vehicleType] || 1.8;
  }

  /**
   * Get vehicle height
   */
  private getVehicleHeight(vehicleType: string): number {
    const heights: Record<string, number> = {
      'car': 1.5,
      'motorcycle': 1.2,
      'suv': 1.8,
      'truck': 3.0
    };
    return heights[vehicleType] || 1.5;
  }
}

interface VehicleState {
  targetId: string;
  laneNo: number;
  x: number;
  y: number;
  speed: number;
  vehicleType: string;
  direction: number;
  lastUpdate: number;
}
