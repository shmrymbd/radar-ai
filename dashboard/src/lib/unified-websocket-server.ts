// Load environment variables from .env.local
// Using require for dotenv in ts-node context
try {
  const dotenv = require('dotenv');
  const { resolve } = require('path');
  dotenv.config({ path: resolve(__dirname, '../../.env.local') });
} catch (e) {
  // dotenv is optional if environment variables are already set
  console.warn('dotenv not available, using process.env directly');
}

import { WebSocketServer, WebSocket } from 'ws';
import { getRedisClient } from './redis';
import { VehicleTracker } from './vehicle-tracker';
import { RedisStorage } from './redis-storage';
import { ClassificationProcessor } from './classification-processor';
import { RedisPubSubService } from './redis-pubsub-service';
import { PassDataMongoDBService } from './passdata-mongodb-service';
import { safeValidateWebSocketMessage, WebSocketMessage } from './websocket-message-schemas';
import { TrackingUpdate, VehicleTrackingData } from '@/types/tracking';
import { ObjectData } from '@/types/radar';
import { ClassificationMetrics, ClassificationSummary } from '@/types/classification';
// Initialize PassData subscriber for MongoDB writes
import './server-init';

const PORT = parseInt(process.env.UNIFIED_WEBSOCKET_PORT || '8080', 10);

interface ClientSubscription {
  ws: WebSocket;
  subscribedChannels: Set<string>;
  deviceId?: string;
  messageCount: number;
  messageResetAt: number;
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

export class UnifiedWebSocketServer {
  private static instance: UnifiedWebSocketServer;
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientSubscription> = new Map();
  private deviceClients: Map<string, Set<WebSocket>> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Service instances
  private vehicleTracker: VehicleTracker;
  private redisStorage: RedisStorage;
  private classificationProcessor: ClassificationProcessor;
  private redisPubSub: RedisPubSubService;
  private mongoService: PassDataMongoDBService;

  // Vehicle tracking state
  private vehicleStates: Map<string, VehicleState> = new Map();
  private isRunning: boolean = false;

  // Global intervals (must be cleared on stop)
  private trackingInterval: NodeJS.Timeout | null = null;
  private classificationInterval: NodeJS.Timeout | null = null;
  private lastTrackingSummary: number = 0; // For throttling tracking summary updates

  public static getInstance(): UnifiedWebSocketServer {
    if (!UnifiedWebSocketServer.instance) {
      UnifiedWebSocketServer.instance = new UnifiedWebSocketServer();
    }
    return UnifiedWebSocketServer.instance;
  }

  private constructor() {
    this.wss = new WebSocketServer({ port: PORT });
    this.vehicleTracker = new VehicleTracker();
    this.redisStorage = RedisStorage.getInstance();
    this.classificationProcessor = ClassificationProcessor.getInstance();
    this.redisPubSub = RedisPubSubService.getInstance();
    this.mongoService = PassDataMongoDBService.getInstance();
    this.setupWebSocketServer();
    this.initializePubSub();
  }

  // Use the singleton Redis client from lib/redis.ts
  private async connectToRedis() {
    try {
      const client = await getRedisClient();
      console.log('✅ Using singleton Redis client in WebSocket server');
      return client;
    } catch (error) {
      console.error('❌ Failed to get Redis client:', error);
      throw error;
    }
  }

  // Initialize Redis pub/sub for real-time PassData and ObjectData updates
  private async initializePubSub() {
    try {
      await this.redisPubSub.initialize();
      console.log('✅ Redis pub/sub service initialized');

      // Register callback to broadcast PassData to WebSocket clients
      this.redisPubSub.onMessage((deviceId, data) => {
        // Broadcast to all clients subscribed to this device
        this.broadcastToDevice(deviceId, {
          type: 'passdata_update',
          deviceId,
          timestamp: new Date().toISOString(),
          data: data
        });

        // Also broadcast to classification channel for real-time dashboard updates
        this.broadcastToChannel('classification', {
          type: 'passdata_update',
          deviceId,
          timestamp: new Date().toISOString(),
          data: data
        });

        console.log(`📤 Broadcasted PassData update for ${deviceId} to WebSocket clients and classification channel`);
      });

      // Register callback for ObjectData (tracking updates) - follows radar transmission rate
      this.redisPubSub.onObjectDataMessage(async (deviceId, data) => {
        try {
          // Set device ID for VehicleTracker
          this.vehicleTracker.setDeviceId(deviceId);
          
          // Convert ProcessedObjectData to ObjectData format for VehicleTracker
          const rawObjectData = this.convertToObjectData(data);
          const trackingUpdate = await this.vehicleTracker.processObjectData(rawObjectData);

          // Broadcast to all clients subscribed to tracking channel
          this.broadcastToChannel('tracking', {
            type: 'tracking_update',
            data: trackingUpdate,
            deviceId,
            timestamp: new Date().toISOString()
          });

          // Also send periodic tracking summary (throttled to avoid spam)
          const now = Date.now();
          if (!this.lastTrackingSummary || (now - this.lastTrackingSummary) >= 1000) {
            const trackingData = await this.vehicleTracker.getTrackingData();
            this.broadcastToChannel('tracking', {
              type: 'tracking_summary',
              data: trackingData,
              deviceId,
              timestamp: new Date().toISOString()
            });
            this.lastTrackingSummary = now;
          }

          console.log(`📤 Broadcasted ObjectData tracking update for ${deviceId} (${data.numEntries || 0} vehicles)`);
        } catch (error) {
          console.error(`❌ Error processing ObjectData for ${deviceId}:`, error);
        }
      });

      // Subscribe to ObjectData keyspace notifications for default device
      // This enables event-driven updates matching radar transmission rate
      try {
        await this.redisPubSub.subscribeToObjectData('P1-center');
        console.log('✅ Subscribed to ObjectData keyspace notifications for P1-center');
      } catch (error) {
        console.error('❌ Failed to subscribe to ObjectData keyspace notifications:', error);
      }

      console.log('✅ Redis pub/sub message handlers registered');
    } catch (error) {
      console.error('❌ Failed to initialize Redis pub/sub:', error);
      // Don't throw - allow WebSocket server to continue working without pub/sub
    }
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 New client connected to Unified WebSocket');
      this.clients.set(ws, {
        ws,
        subscribedChannels: new Set(),
        messageCount: 0,
        messageResetAt: Date.now() + 60000 // Reset after 1 minute
      });

      // Send initial connection acknowledgment
      this.sendMessage(ws, { 
        type: 'connection_established', 
        message: 'Unified WebSocket connected successfully',
        availableChannels: ['dashboard', 'tracking', 'classification']
      });

      ws.on('message', (message: string) => {
        try {
          // Check rate limit first
          if (!this.checkMessageRateLimit(ws)) {
            this.sendMessage(ws, {
              type: 'error',
              message: 'Rate limit exceeded. Maximum 100 messages per minute.'
            });
            return;
          }

          // Parse JSON
          const rawData = JSON.parse(message);

          // Validate message structure with Zod
          const validation = safeValidateWebSocketMessage(rawData);

          if (!validation.success || !validation.data) {
            console.warn('⚠️ Invalid WebSocket message:', validation.error);
            this.sendMessage(ws, {
              type: 'error',
              message: `Invalid message format: ${validation.error || 'Unknown error'}`
            });
            return;
          }

          // Handle validated message (TypeScript now knows data exists)
          this.handleClientMessage(ws, validation.data);
        } catch (error) {
          console.error('❌ Error parsing client message:', error);
          this.sendMessage(ws, {
            type: 'error',
            message: 'Invalid JSON format'
          });
        }
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected from Unified WebSocket');
        this.removeClient(ws);
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket client error:', error);
        this.removeClient(ws);
      });
    });

    this.wss.on('listening', () => {
      console.log(`🚀 Unified WebSocket server listening on port ${PORT}`);
      this.isRunning = true;
      this.startPeriodicUpdates();
    });

    this.wss.on('error', (error: Error) => {
      console.error('Unified WebSocket server error:', error);
    });
  }

  /**
   * Check per-client message rate limiting
   * Maximum 100 messages per minute per client
   */
  private checkMessageRateLimit(ws: WebSocket): boolean {
    const client = this.clients.get(ws);
    if (!client) return false;

    const now = Date.now();

    // Reset counter if window expired
    if (now > client.messageResetAt) {
      client.messageCount = 0;
      client.messageResetAt = now + 60000; // Next minute
    }

    // Check limit
    if (client.messageCount >= 100) {
      console.warn('⚠️ Client exceeded message rate limit');
      return false;
    }

    // Increment counter
    client.messageCount++;
    return true;
  }

  private async handleClientMessage(ws: WebSocket, data: WebSocketMessage) {
    console.log('📨 Received message:', data);

    const client = this.clients.get(ws);
    if (!client) return;

    switch (data.type) {
      // Device management
      case 'subscribe_device':
        this.subscribeClientToDevice(ws, data.deviceId);
        break;
      case 'unsubscribe_device':
        this.unsubscribeClientFromDevice(ws, data.deviceId);
        break;
      case 'get_available_devices':
        this.sendAvailableDevices(ws);
        break;

      // Channel subscriptions
      case 'subscribe_channel':
        await this.subscribeToChannel(ws, data.channel);
        break;
      case 'unsubscribe_channel':
        this.unsubscribeFromChannel(ws, data.channel);
        break;

      // Dashboard data requests
      case 'get_dashboard_data':
        this.sendDashboardData(ws, data.deviceId || 'P1-center');
        break;

      // Tracking data requests
      case 'get_tracking_data':
        this.sendTrackingData(ws);
        break;
      case 'get_vehicle_details':
        if (data.targetId) {
          this.vehicleTracker.getVehicle(data.targetId).then(vehicle => {
            this.sendMessage(ws, { type: 'vehicle_details', data: vehicle });
          });
        }
        break;
      case 'get_visible_vehicles':
        this.vehicleTracker.getVisibleVehicles().then(visibleVehicles => {
          this.sendMessage(ws, { type: 'visible_vehicles', data: visibleVehicles });
        });
        break;

      // Classification data requests
      case 'get_classification_data':
        await this.sendClassificationData(ws);
        break;

      // Health check
      case 'ping':
        this.sendMessage(ws, { type: 'pong', timestamp: Date.now() });
        break;

      default:
        // TypeScript exhaustiveness check - should never reach here
        const _exhaustiveCheck: never = data;
        console.log('Unknown message type received');
    }
  }

  private async subscribeToChannel(ws: WebSocket, channel: string) {
    const client = this.clients.get(ws);
    if (!client) return;

    client.subscribedChannels.add(channel);
    console.log(`📡 Client subscribed to channel: ${channel}`);

    this.sendMessage(ws, {
      type: 'subscription_confirmed',
      channel: channel,
      message: `Subscribed to ${channel} channel`
    });

    // Send initial data for the channel
    switch (channel) {
      case 'dashboard':
        this.sendDashboardData(ws, client.deviceId || 'P1-center');
        break;
      case 'tracking':
        this.sendTrackingData(ws);
        break;
      case 'classification':
        await this.sendClassificationData(ws);
        break;
    }
  }

  private unsubscribeFromChannel(ws: WebSocket, channel: string) {
    const client = this.clients.get(ws);
    if (!client) return;

    client.subscribedChannels.delete(channel);
    console.log(`📡 Client unsubscribed from channel: ${channel}`);

    this.sendMessage(ws, { 
      type: 'unsubscription_confirmed', 
      channel: channel,
      message: `Unsubscribed from ${channel} channel` 
    });
  }

  private async subscribeClientToDevice(ws: WebSocket, deviceId: string) {
    const client = this.clients.get(ws);
    if (!client) return;

    client.deviceId = deviceId;

    // Add client to device's client list
    if (!this.deviceClients.has(deviceId)) {
      this.deviceClients.set(deviceId, new Set());
    }
    this.deviceClients.get(deviceId)!.add(ws);

    console.log(`📡 Client subscribed to device: ${deviceId}`);

    // Subscribe to Redis pub/sub for this device's PassData events
    try {
      await this.redisPubSub.subscribeToPassData(deviceId);
      console.log(`✅ Subscribed to Redis pub/sub for device: ${deviceId}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to Redis pub/sub for ${deviceId}:`, error);
      // Continue with WebSocket subscription even if pub/sub fails
    }

    this.sendMessage(ws, {
      type: 'device_subscription_confirmed',
      deviceId: deviceId,
      message: `Subscribed to device ${deviceId}`
    });

    // Send initial data for this device
    this.sendDashboardData(ws, deviceId);

    // Start device-specific updates if not already running
    this.startDeviceUpdates(deviceId);
  }

  private async unsubscribeClientFromDevice(ws: WebSocket, deviceId: string) {
    const client = this.clients.get(ws);
    if (!client) return;

    client.deviceId = undefined;

    // Remove client from device's client list
    if (this.deviceClients.has(deviceId)) {
      this.deviceClients.get(deviceId)!.delete(ws);

      // If no clients are subscribed to this device, stop updates and unsubscribe from pub/sub
      if (this.deviceClients.get(deviceId)!.size === 0) {
        this.stopDeviceUpdates(deviceId);

        // Unsubscribe from Redis pub/sub for this device
        try {
          await this.redisPubSub.unsubscribe(deviceId);
          console.log(`✅ Unsubscribed from Redis pub/sub for device: ${deviceId}`);
        } catch (error) {
          console.error(`❌ Failed to unsubscribe from Redis pub/sub for ${deviceId}:`, error);
        }
      }
    }

    console.log(`📡 Client unsubscribed from device: ${deviceId}`);

    this.sendMessage(ws, {
      type: 'device_unsubscription_confirmed',
      deviceId: deviceId,
      message: `Unsubscribed from device ${deviceId}`
    });
  }

  private removeClient(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (!client) return;

    // Remove from all device subscriptions
    if (client.deviceId) {
      if (this.deviceClients.has(client.deviceId)) {
        this.deviceClients.get(client.deviceId)!.delete(ws);
        
        if (this.deviceClients.get(client.deviceId)!.size === 0) {
          this.stopDeviceUpdates(client.deviceId);
        }
      }
    }

    this.clients.delete(ws);
  }

  private sendAvailableDevices(ws: WebSocket) {
    const devices = [
      { id: 'P1-center', name: 'P1 Center', status: 'online' },
      { id: 'P3', name: 'P3 Radar', status: 'online' },
      { id: 'P1-o/h', name: 'P1 Overhead', status: 'online' }
    ];

    this.sendMessage(ws, {
      type: 'available_devices',
      devices: devices
    });
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.removeClient(ws);
      }
    }
  }

  private async sendDashboardData(ws: WebSocket, deviceId: string) {
    try {
      const data = await this.getLatestDashboardData(deviceId);
      this.sendMessage(ws, { 
        type: 'dashboard_data', 
        deviceId: deviceId,
        data: data 
      });
    } catch (error) {
      console.error(`Error sending dashboard data for device ${deviceId}:`, error);
    }
  }

  private async sendTrackingData(ws: WebSocket) {
    try {
      const trackingData = await this.vehicleTracker.getTrackingData();
      this.sendMessage(ws, { 
        type: 'tracking_data', 
        data: trackingData 
      });
    } catch (error) {
      console.error('Error sending tracking data:', error);
    }
  }

  private async sendClassificationData(ws: WebSocket) {
    try {
      const client = this.clients.get(ws);
      const deviceId = client?.deviceId || 'P1-center';

      // Query MongoDB for real-time classification data
      const metrics = await this.mongoService.getClassificationMetrics(deviceId);
      const summary = await this.mongoService.getClassificationSummary(deviceId);

      this.sendMessage(ws, {
        type: 'classification_data',
        data: {
          metrics,
          summary,
          deviceId,
          timestamp: new Date().toISOString(),
          source: 'mongodb'
        }
      });
    } catch (error) {
      console.error('Error sending classification data:', error);
    }
  }

  private startDeviceUpdates(deviceId: string) {
    if (this.updateIntervals.has(deviceId)) {
      return; // Already running
    }

    const interval = setInterval(async () => {
      if (this.deviceClients.has(deviceId) && this.deviceClients.get(deviceId)!.size > 0) {
        try {
          const data = await this.getLatestDashboardData(deviceId);
          this.broadcastToDevice(deviceId, { 
            type: 'dashboard_update', 
            deviceId: deviceId,
            data: data 
          });
        } catch (error) {
          console.error(`Error updating device ${deviceId}:`, error);
        }
      }
    }, 1000); // Update every 1 second (1 Hz) - Real-time dashboard updates for Radar Analysis and Lane Status

    this.updateIntervals.set(deviceId, interval);
    console.log(`🔄 Started updates for device: ${deviceId}`);
  }

  private stopDeviceUpdates(deviceId: string) {
    if (this.updateIntervals.has(deviceId)) {
      clearInterval(this.updateIntervals.get(deviceId)!);
      this.updateIntervals.delete(deviceId);
      console.log(`⏹️ Stopped updates for device: ${deviceId}`);
    }
  }

  private broadcastToDevice(deviceId: string, message: any) {
    if (this.deviceClients.has(deviceId)) {
      this.deviceClients.get(deviceId)!.forEach(client => {
        this.sendMessage(client, message);
      });
    }
  }

  private startPeriodicUpdates() {
    // Dashboard updates are handled by device-specific intervals
    console.log('📡 Device-specific dashboard updates will be started when clients subscribe');

    // Start tracking updates
    this.startTrackingUpdates();

    // Start classification updates
    this.startClassificationUpdates();
  }

  private startTrackingUpdates() {
    // Polling interval as fallback - event-driven updates via keyspace notifications
    // handle most updates at the radar's actual transmission rate
    // This fallback ensures updates continue even if keyspace notifications fail
    this.trackingInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.broadcastTrackingUpdate();
      }
    }, 200); // Fallback: Update every 200ms to match ~5Hz radar rate (event-driven updates are primary)
  }

  private async broadcastTrackingUpdate() {
    try {
      // Set device prefix to 'P1-center' for now (TODO: make this device-aware)
      this.redisStorage.setDevicePrefix('P1-center');
      this.vehicleTracker.setDeviceId('P1-center');

      // Get latest object data from Redis
      const objectData = await this.redisStorage.getLatestObjectData(1);

      if (objectData.length > 0) {
        // Convert ProcessedObjectData to ObjectData format for VehicleTracker
        const rawObjectData = this.convertToObjectData(objectData[0]);
        const trackingUpdate = await this.vehicleTracker.processObjectData(rawObjectData);

        // Broadcast to all clients subscribed to tracking
        this.broadcastToChannel('tracking', {
          type: 'tracking_update',
          data: trackingUpdate
        });
      } else {
        // Generate sample data ONLY if no real data available
        await this.generateSampleTrackingData();
      }

      // Send periodic tracking summary
      const trackingData = await this.vehicleTracker.getTrackingData();
      this.broadcastToChannel('tracking', {
        type: 'tracking_summary',
        data: trackingData
      });
    } catch (error) {
      console.error('Error broadcasting tracking update:', error);
    }
  }

  private startClassificationUpdates() {
    this.classificationInterval = setInterval(() => {
      if (this.isRunning) {
        this.broadcastClassificationUpdate();
      }
    }, 3000); // Update every 3 seconds
  }

  private async broadcastClassificationUpdate() {
    try {
      // Broadcast for all active devices
      const activeDevices = Array.from(this.deviceClients.keys());

      // If no active devices, broadcast for default device
      const devices = activeDevices.length > 0 ? activeDevices : ['P1-center'];

      for (const deviceId of devices) {
        // Query MongoDB for real-time classification data
        const metrics = await this.mongoService.getClassificationMetrics(deviceId);
        const summary = await this.mongoService.getClassificationSummary(deviceId);

        this.broadcastToChannel('classification', {
          type: 'classification_update',
          data: {
            metrics,
            summary,
            deviceId,
            timestamp: new Date().toISOString(),
            source: 'mongodb'
          }
        });
      }
    } catch (error) {
      console.error('Error broadcasting classification update:', error);
    }
  }

  private broadcastToChannel(channel: string, message: any) {
    this.clients.forEach((client, ws) => {
      if (client.subscribedChannels.has(channel)) {
        this.sendMessage(ws, message);
      }
    });
  }

  private convertToObjectData(processedData: any): any {
    // Handle both Date objects and ISO string timestamps
    const timestamp = processedData.timestamp instanceof Date
      ? processedData.timestamp.toISOString()
      : (typeof processedData.timestamp === 'string' ? processedData.timestamp : new Date().toISOString());

    return {
      deviceId: processedData.deviceId,
      frameType: '0x01' as const,
      timestamp,
      numEntries: processedData.numEntries,
      entries: processedData.entries,
      packetSize: processedData.packetSize
    };
  }

  private async generateSampleTrackingData(): Promise<void> {
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
        deviceId: 'P1-center',
        frameType: '0x01' as const,
        timestamp: currentTime.toISOString(),
        numEntries: entries.length,
        entries,
        packetSize: entries.length * 64 + 32
      };

      // Store in Redis
      await this.redisStorage.storeRawObjectData(objectData);
      
      console.log(`🚗 Generated sample tracking data for ${entries.length} vehicles`);
    } catch (error) {
      console.error('Error generating sample tracking data:', error);
    }
  }

  private getLaneXPosition(laneNo: number): number {
    const positions: Record<number, number> = { 11: -3.5, 12: 1.5, 31: -3.5, 32: 1.5 };
    return positions[laneNo] || 0;
  }

  private getVehicleTypeCode(vehicleType: string): number {
    // Official ClairWav Communication Protocol V2.1 - Video Integrated Models (Section 2.2.2)
    const codes: Record<string, number> = {
      'other': 0,
      'bicycle': 1,
      'motorcycle': 2,
      'tricycle': 3,
      'bus': 4,
      'van': 5,
      'car': 6,
      'suv': 7,
      'large_truck': 8,
      'medium_truck': 9,
      'light_truck': 10,
      'dangerous_goods': 11,
      'engineering_vehicle': 12,
      'pedestrian': 13,
      'medium_bus': 14
    };
    return codes[vehicleType] || 0;
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

  private initializeVehicleStates(): void {
    const lanes = [11, 12, 31, 32];
    const vehicleTypes = ['car', 'motorcycle', 'suv', 'truck'];
    
    for (let i = 0; i < 10; i++) {
      const targetId = `vehicle_${Date.now()}_${i}`;
      const laneNo = lanes[Math.floor(Math.random() * lanes.length)];
      const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
      
      const vehicle: VehicleState = {
        targetId,
        laneNo,
        x: this.getLaneXPosition(laneNo) + (Math.random() - 0.5) * 1.5,
        y: Math.random() * 300 + 50,
        speed: Math.random() * 30 + 25,
        vehicleType,
        direction: Math.random() > 0.5 ? 1 : -1,
        color: Math.floor(Math.random() * 8),
        plateNumber: this.generatePlateNumber(),
        xSpeed: 0,
        ySpeed: 0,
        acceleration: 0,
        lastUpdate: Date.now(),
        laneChangeTimer: 0,
        speedVariation: Math.random() * 0.1 + 0.05
      };
      
      this.vehicleStates.set(targetId, vehicle);
    }
  }

  private updateVehiclePositions(): void {
    const now = Date.now();
    const deltaTime = 5;
    
    for (const [targetId, vehicle] of this.vehicleStates) {
      const speedMs = vehicle.speed / 3.6;
      vehicle.y += vehicle.direction * speedMs * deltaTime;
      
      const speedChange = (Math.random() - 0.5) * vehicle.speedVariation * vehicle.speed;
      vehicle.speed += speedChange;
      vehicle.speed = Math.max(15, Math.min(80, vehicle.speed));
      
      vehicle.laneChangeTimer += deltaTime;
      if (vehicle.laneChangeTimer > 30 && Math.random() < 0.1) {
        this.performLaneChange(vehicle);
        vehicle.laneChangeTimer = 0;
      }
      
      vehicle.acceleration = (Math.random() - 0.5) * 2;
      vehicle.xSpeed = (Math.random() - 0.5) * 0.5;
      vehicle.ySpeed = vehicle.direction * speedMs;
      
      if (vehicle.y > 400 || vehicle.y < -100) {
        vehicle.y = vehicle.direction > 0 ? -100 : 400;
        vehicle.speed = Math.random() * 30 + 25;
        vehicle.laneNo = [11, 12, 31, 32][Math.floor(Math.random() * 4)];
        vehicle.x = this.getLaneXPosition(vehicle.laneNo) + (Math.random() - 0.5) * 1.5;
      }
      
      vehicle.lastUpdate = now;
    }
  }

  private performLaneChange(vehicle: VehicleState): void {
    const currentLane = vehicle.laneNo;
    const availableLanes = [11, 12, 31, 32].filter(lane => lane !== currentLane);
    const newLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    
    vehicle.laneNo = newLane;
    vehicle.x = this.getLaneXPosition(newLane) + (Math.random() - 0.5) * 1.5;
    
    vehicle.speed += (Math.random() - 0.5) * 5;
    vehicle.speed = Math.max(15, Math.min(80, vehicle.speed));
  }

  private isVehicleInDetectionZone(vehicle: VehicleState): boolean {
    return vehicle.y >= 0 && vehicle.y <= 300 && Math.abs(vehicle.x) <= 10;
  }

  private async getLatestDashboardData(deviceId: string = 'P1-center') {
    const client = await this.connectToRedis();
    if (!client) {
      return {
        timestamp: new Date().toISOString(),
        summary: {
          totalVehicles: 0,
          averageSpeed: 0,
          lanesWithQueues: 0,
          totalVehiclesOnline: 0,
          averageOccupancyRate: 0,
          totalFlowRate: 0,
          trafficDensity: 0,
          alerts: []
        }
      };
    }

    try {
      const objectData = await client.lRange(`${deviceId}/objectdata`, -1, -1);
      const laneStatus = await client.lRange(`${deviceId}/lanestatus`, -1, -1);
      const passEvents = await client.lRange(`${deviceId}/passdata`, -5, -1); // Use lowercase to match actual Redis key

      const parsedObjectData = objectData.length > 0 ? JSON.parse(objectData[0]) : null;
      const parsedLaneStatus = laneStatus.length > 0 ? JSON.parse(laneStatus[0]) : null;
      const parsedPassEvents = passEvents.map((event: string) => {
        const parsed = JSON.parse(event);

        // Transform nested PassData structure to flat structure for UI
        if (parsed.entries && Array.isArray(parsed.entries) && parsed.entries.length > 0) {
          const entry = parsed.entries[0];
          return {
            deviceId: parsed.deviceId,
            timestamp: parsed.timestamp,
            laneNumber: entry.lane?.number || 0,
            crossSectionPosition: entry.crossSection?.position || 0,
            crossSectionSpeed: entry.crossSection?.speed || 0,
            headwayTime: entry.crossSection?.headwayTime || 0,
            occupancyDuration: entry.passing?.occupancyDuration || 0,
            occupancyStatus: entry.passing?.occupancyStatus || 'Unknown',
            vehicleType: typeof entry.vehicleType === 'string' ? entry.vehicleType : (entry.vehicleType?.name || 'unknown')
          };
        }

        // If already flat structure, return as-is
        return parsed;
      });

      const summary = this.calculateSummary(parsedLaneStatus, parsedPassEvents);

      return {
        timestamp: new Date().toISOString(),
        objectData: parsedObjectData,
        laneStatus: parsedLaneStatus,
        recentPassEvents: parsedPassEvents,
        summary
      };
    } catch (error) {
      console.error('❌ Error getting dashboard data:', error);
      return {
        timestamp: new Date().toISOString(),
        summary: {
          totalVehicles: 0,
          averageSpeed: 0,
          lanesWithQueues: 0,
          totalVehiclesOnline: 0,
          averageOccupancyRate: 0,
          totalFlowRate: 0,
          trafficDensity: 0,
          alerts: []
        }
      };
    }
  }

  private calculateSummary(laneStatus: any, passEvents: any[]) {
    let totalVehicles = 0;
    let totalSpeed = 0;
    let speedCount = 0;
    let lanesWithQueues = 0;
    let totalVehiclesOnline = 0;
    let totalOccupancy = 0;
    let occupancyCount = 0;

    if (laneStatus && laneStatus.entries) {
      laneStatus.entries.forEach((entry: any) => {
        if (entry.queue && entry.queue.vehicleCount > 0) {
          lanesWithQueues++;
        }
        if (entry.vehiclesOnline) {
          totalVehiclesOnline += entry.vehiclesOnline;
        }
        if (entry.spaceOccupancyRate !== undefined) {
          totalOccupancy += entry.spaceOccupancyRate;
          occupancyCount++;
        }
      });
    }

    if (passEvents) {
      passEvents.forEach(event => {
        if (event.crossSectionSpeed && event.crossSectionSpeed > 0) {
          totalSpeed += event.crossSectionSpeed;
          speedCount++;
        }
      });
    }

    return {
      totalVehicles: passEvents ? passEvents.length : 0,
      averageSpeed: speedCount > 0 ? Math.round(totalSpeed / speedCount) : 0,
      lanesWithQueues,
      totalVehiclesOnline,
      averageOccupancyRate: occupancyCount > 0 ? Math.round((totalOccupancy / occupancyCount) * 100) / 100 : 0,
      totalFlowRate: 0,
      trafficDensity: 0,
      alerts: []
    };
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public getStatus(): { running: boolean; clients: number; port: number } {
    return {
      running: this.isRunning,
      clients: this.clients.size,
      port: PORT
    };
  }

  public stop(): void {
    this.isRunning = false;

    // Stop all device-specific intervals
    for (const [deviceId, interval] of this.updateIntervals) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    // Clear global intervals
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    if (this.classificationInterval) {
      clearInterval(this.classificationInterval);
      this.classificationInterval = null;
    }

    // Redis connection is managed by the singleton, no need to disconnect here

    this.wss.close(() => {
      console.log('🛑 Unified WebSocket server stopped');
    });
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  console.log('🚀 Starting Unified WebSocket Server...');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 URL: ws://localhost:${PORT}`);

  try {
    const wsServer = UnifiedWebSocketServer.getInstance();
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down Unified WebSocket server...');
      wsServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down Unified WebSocket server...');
      wsServer.stop();
      process.exit(0);
    });

    console.log('✅ Unified WebSocket server started successfully!');
    console.log('📊 All services (Dashboard, Tracking, Classification) available on single port');
    console.log('🔄 Press Ctrl+C to stop the server');

  } catch (error) {
    console.error('❌ Failed to start Unified WebSocket server:', error);
    process.exit(1);
  }
}
