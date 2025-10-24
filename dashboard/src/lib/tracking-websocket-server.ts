import { WebSocketServer, WebSocket } from 'ws';
import { VehicleTracker } from './vehicle-tracker';
import { RedisStorage } from './redis-storage';
import { TrackingUpdate, VehicleTrackingData } from '@/types/tracking';

const PORT = parseInt(process.env.TRACKING_WEBSOCKET_PORT || '8081', 10);

export class TrackingWebSocketServer {
  private wss: WebSocketServer;
  private vehicleTracker: VehicleTracker;
  private redisStorage: RedisStorage;
  private updateInterval: NodeJS.Timeout | null = null;
  private clients: Set<WebSocket> = new Set();
  private isRunning: boolean = false;

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
        // Process the latest object data
        const trackingUpdate = this.vehicleTracker.processObjectData(objectData[0]);
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
    }, 100); // 10Hz update rate (100ms intervals)
  }

  private async broadcastTrackingUpdate(): Promise<void> {
    try {
      // Get latest object data from Redis
      const objectData = await this.redisStorage.getLatestObjectData(1);
      
      if (objectData.length > 0) {
        // Process the latest object data
        const trackingUpdate = this.vehicleTracker.processObjectData(objectData[0]);
        
        // Broadcast to all connected clients
        this.clients.forEach(client => {
          this.sendMessage(client, 'tracking_update', trackingUpdate);
        });
      }

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
