import { WebSocketServer, WebSocket } from 'ws';
import { VehicleTracker } from './vehicle-tracker';
import { RedisStorage } from './redis-storage';
import { TrackingUpdate, VehicleTrackingData } from '@/types/tracking';
import { ObjectData } from '@/types/radar';

const PORT = parseInt(process.env.TRACKING_WEBSOCKET_PORT || '8081', 10);

export class TrackingWebSocketServer {
  private wss: WebSocketServer;
  private vehicleTracker: VehicleTracker;
  private redisStorage: RedisStorage;
  private updateInterval: NodeJS.Timeout | null = null;
  private clients: Set<WebSocket> = new Set();
  private isRunning: boolean = false;
  private vehicleStates: Map<string, VehicleState> = new Map();

  constructor() {
    this.wss = new WebSocketServer({ port: PORT });
    this.vehicleTracker = new VehicleTracker();
    this.redisStorage = RedisStorage.getInstance();
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 Client connected to Tracking WebSocket');
      this.clients.add(ws);

      // Send initial vehicle data
      this.sendInitialData(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Error parsing client message:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected from Tracking WebSocket');
        this.clients.delete(ws);
      });

      ws.on('error', (error: Error) => {
        console.error('Tracking WebSocket client error:', error);
        this.clients.delete(ws);
      });
    });

    this.wss.on('listening', () => {
      console.log(`🚀 Tracking WebSocket server listening on port ${PORT}`);
      this.startPeriodicUpdates();
    });

    this.wss.on('error', (error: Error) => {
      console.error('Tracking WebSocket server error:', error);
    });
  }

  private async sendInitialData(ws: WebSocket) {
    try {
      // Get latest object data from Redis
      const objectData = await this.redisStorage.getLatestObjectData(1);
      
      if (objectData.length > 0) {
        // Convert ProcessedObjectData to ObjectData format for VehicleTracker
        const rawObjectData = this.convertToObjectData(objectData[0]);
        const trackingUpdate = this.vehicleTracker.processObjectData(rawObjectData);
        this.sendMessage(ws, 'initial_tracking_data', trackingUpdate);
      }

      // Send current tracking summary
      const trackingData = this.vehicleTracker.getTrackingData();
      this.sendMessage(ws, 'tracking_summary', trackingData);
    } catch (error) {
      console.error('Error sending initial tracking data:', error);
    }
  }

  private startPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.isRunning = true;
    this.updateInterval = setInterval(async () => {
      if (this.clients.size > 0 && this.isRunning) {
        await this.broadcastTrackingUpdate();
      }
    }, 1000); // 1Hz update rate (1 second intervals) - real-time tracking for control center
  }

  private async broadcastTrackingUpdate(): Promise<void> {
    try {
      // Get latest object data from Redis
      const objectData = await this.redisStorage.getLatestObjectData(1);
      
      if (objectData.length > 0) {
        // Convert ProcessedObjectData to ObjectData format for VehicleTracker
        const rawObjectData = this.convertToObjectData(objectData[0]);
        const trackingUpdate = this.vehicleTracker.processObjectData(rawObjectData);
        
        // Broadcast to all connected clients
        this.clients.forEach(client => {
          this.sendMessage(client, 'tracking_update', trackingUpdate);
        });
      } else {
        // Generate sample data if no data available
        await this.generateSampleData();
      }
      
      // Always generate new data to ensure dynamic movement
      await this.generateSampleData();

      // Send periodic tracking summary (every 1 second)
      if (Date.now() % 1000 < 100) {
        const trackingData = this.vehicleTracker.getTrackingData();
        this.clients.forEach(client => {
          this.sendMessage(client, 'tracking_summary', trackingData);
        });
      }
    } catch (error) {
      console.error('Error broadcasting tracking update:', error);
    }
  }

  private handleClientMessage(ws: WebSocket, data: any) {
    switch (data.type) {
      case 'get_vehicle_details':
        if (data.targetId) {
          const vehicle = this.vehicleTracker.getVehicle(data.targetId);
          this.sendMessage(ws, 'vehicle_details', vehicle);
        }
        break;
      
      case 'get_tracking_data':
        const trackingData = this.vehicleTracker.getTrackingData();
        this.sendMessage(ws, 'tracking_data', trackingData);
        break;
      
      case 'get_visible_vehicles':
        const visibleVehicles = this.vehicleTracker.getVisibleVehicles();
        this.sendMessage(ws, 'visible_vehicles', visibleVehicles);
        break;
      
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private convertToObjectData(processedData: any): any {
    // Convert ProcessedObjectData back to ObjectData format for VehicleTracker
    return {
      deviceId: processedData.deviceId,
      frameType: '0x01' as const,
      timestamp: processedData.timestamp.toISOString(),
      numEntries: processedData.numEntries,
      entries: processedData.entries,
      packetSize: processedData.packetSize
    };
  }

  private sendMessage(ws: WebSocket, type: string, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.clients.delete(ws);
      }
    }
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public getTrackingData(): VehicleTrackingData {
    return this.vehicleTracker.getTrackingData();
  }

  public getVisibleVehicles() {
    return this.vehicleTracker.getVisibleVehicles();
  }

  /**
   * Generate realistic vehicle movement data
   */
  private async generateSampleData(): Promise<void> {
    try {
      const currentTime = new Date();
      const entries = [];
      
      // Get or create vehicle states for realistic movement
      if (!this.vehicleStates) {
        this.initializeVehicleStates();
      }
      
      // Update vehicle positions with realistic movement
      this.updateVehiclePositions();
      
      // Generate entries from current vehicle states
      for (const [targetId, vehicle] of this.vehicleStates) {
        if (this.isVehicleInDetectionZone(vehicle)) {
          entries.push({
            targetId: vehicle.targetId,
            laneNo: vehicle.laneNo,
            targetType: this.getVehicleTypeCode(vehicle.vehicleType),
            color: vehicle.color,
            plateNumber: vehicle.plateNumber,
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
            xSpeed: vehicle.xSpeed,
            ySpeed: vehicle.ySpeed,
            acceleration: vehicle.acceleration
          });
        }
      }

      // Create object data
      const objectData: ObjectData = {
        deviceId: 'test',
        frameType: '0x01' as const,
        timestamp: currentTime.toISOString(),
        numEntries: entries.length,
        entries,
        packetSize: entries.length * 64 + 32
      };

      // Store in Redis
      await this.redisStorage.storeRawObjectData(objectData);
      
      console.log(`🚗 Generated sample data for ${entries.length} vehicles`);
    } catch (error) {
      console.error('Error generating sample data:', error);
    }
  }

  private getLaneXPosition(laneNo: number): number {
    const positions: Record<number, number> = { 11: -3.5, 12: 1.5, 31: -3.5, 32: 1.5 };
    return positions[laneNo] || 0;
  }

  private getVehicleTypeCode(vehicleType: string): number {
    const codes: Record<string, number> = { 'car': 6, 'motorcycle': 1, 'suv': 7, 'truck': 8 };
    return codes[vehicleType] || 6;
  }

  private generatePlateNumber(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let plate = '';
    for (let i = 0; i < 3; i++) plate += letters[Math.floor(Math.random() * letters.length)];
    for (let i = 0; i < 3; i++) plate += numbers[Math.floor(Math.random() * numbers.length)];
    return plate;
  }

  private getVehicleLength(vehicleType: string): number {
    const lengths: Record<string, number> = { 'car': 4.5, 'motorcycle': 2.0, 'suv': 5.0, 'truck': 8.0 };
    return lengths[vehicleType] || 4.5;
  }

  private getVehicleWidth(vehicleType: string): number {
    const widths: Record<string, number> = { 'car': 1.8, 'motorcycle': 1.0, 'suv': 2.0, 'truck': 2.5 };
    return widths[vehicleType] || 1.8;
  }

  private getVehicleHeight(vehicleType: string): number {
    const heights: Record<string, number> = { 'car': 1.5, 'motorcycle': 1.2, 'suv': 1.8, 'truck': 3.0 };
    return heights[vehicleType] || 1.5;
  }

  /**
   * Initialize vehicle states with realistic starting positions
   */
  private initializeVehicleStates(): void {
    const lanes = [11, 12, 31, 32];
    const vehicleTypes = ['car', 'motorcycle', 'suv', 'truck'];
    
    // Create 8-12 vehicles distributed across lanes
    for (let i = 0; i < 10; i++) {
      const targetId = `vehicle_${Date.now()}_${i}`;
      const laneNo = lanes[Math.floor(Math.random() * lanes.length)];
      const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
      
      const vehicle: VehicleState = {
        targetId,
        laneNo,
        x: this.getLaneXPosition(laneNo) + (Math.random() - 0.5) * 1.5,
        y: Math.random() * 300 + 50, // Spread across detection zone
        speed: Math.random() * 30 + 25, // 25-55 km/h
        vehicleType,
        direction: Math.random() > 0.5 ? 1 : -1,
        color: Math.floor(Math.random() * 8),
        plateNumber: this.generatePlateNumber(),
        xSpeed: 0,
        ySpeed: 0,
        acceleration: 0,
        lastUpdate: Date.now(),
        laneChangeTimer: 0,
        speedVariation: Math.random() * 0.1 + 0.05 // 5-15% speed variation
      };
      
      this.vehicleStates.set(targetId, vehicle);
    }
  }

  /**
   * Update vehicle positions with realistic movement
   */
  private updateVehiclePositions(): void {
    const now = Date.now();
    const deltaTime = 5; // 5 seconds between updates
    
    for (const [targetId, vehicle] of this.vehicleStates) {
      // Update position based on speed and direction
      const speedMs = vehicle.speed / 3.6; // Convert km/h to m/s
      vehicle.y += vehicle.direction * speedMs * deltaTime;
      
      // Add realistic speed variation
      const speedChange = (Math.random() - 0.5) * vehicle.speedVariation * vehicle.speed;
      vehicle.speed += speedChange;
      vehicle.speed = Math.max(15, Math.min(80, vehicle.speed)); // Clamp speed
      
      // Add lane changing behavior
      vehicle.laneChangeTimer += deltaTime;
      if (vehicle.laneChangeTimer > 30 && Math.random() < 0.1) { // 10% chance every 30 seconds
        this.performLaneChange(vehicle);
        vehicle.laneChangeTimer = 0;
      }
      
      // Add realistic acceleration
      vehicle.acceleration = (Math.random() - 0.5) * 2;
      vehicle.xSpeed = (Math.random() - 0.5) * 0.5;
      vehicle.ySpeed = vehicle.direction * speedMs;
      
      // Reset vehicle if it goes too far
      if (vehicle.y > 400 || vehicle.y < -100) {
        vehicle.y = vehicle.direction > 0 ? -100 : 400;
        vehicle.speed = Math.random() * 30 + 25;
        vehicle.laneNo = [11, 12, 31, 32][Math.floor(Math.random() * 4)];
        vehicle.x = this.getLaneXPosition(vehicle.laneNo) + (Math.random() - 0.5) * 1.5;
      }
      
      vehicle.lastUpdate = now;
    }
  }

  /**
   * Perform realistic lane change
   */
  private performLaneChange(vehicle: VehicleState): void {
    const currentLane = vehicle.laneNo;
    const availableLanes = [11, 12, 31, 32].filter(lane => lane !== currentLane);
    const newLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    
    vehicle.laneNo = newLane;
    vehicle.x = this.getLaneXPosition(newLane) + (Math.random() - 0.5) * 1.5;
    
    // Slight speed adjustment during lane change
    vehicle.speed += (Math.random() - 0.5) * 5;
    vehicle.speed = Math.max(15, Math.min(80, vehicle.speed));
  }

  /**
   * Check if vehicle is in detection zone
   */
  private isVehicleInDetectionZone(vehicle: VehicleState): boolean {
    return vehicle.y >= 0 && vehicle.y <= 300 && Math.abs(vehicle.x) <= 10;
  }

  public stop(): void {
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.wss.close(() => {
      console.log('Tracking WebSocket server closed');
    });
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
  color: number;
  plateNumber: string;
  xSpeed: number;
  ySpeed: number;
  acceleration: number;
  lastUpdate: number;
  laneChangeTimer: number;
  speedVariation: number;
}

// Start the tracking WebSocket server
if (require.main === module) {
  const trackingServer = new TrackingWebSocketServer();
  
  process.on('SIGINT', () => {
    console.log('Shutting down Tracking WebSocket server...');
    trackingServer.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down Tracking WebSocket server...');
    trackingServer.stop();
    process.exit(0);
  });
}
