/**
 * WebSocket Server for Real-time Traffic Dashboard Updates
 * 
 * This server handles:
 * 1. Client connections for real-time updates
 * 2. Redis data streaming
 * 3. Live dashboard updates
 */

import { WebSocketServer, WebSocket } from 'ws';
import { getRedisClient } from './redis';
import { RedisStorage } from './redis-storage';

export class TrafficWebSocketServer {
  private static instance: TrafficWebSocketServer;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private redisStorage: RedisStorage;
  private isRunning: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;

  public static getInstance(): TrafficWebSocketServer {
    if (!TrafficWebSocketServer.instance) {
      TrafficWebSocketServer.instance = new TrafficWebSocketServer();
    }
    return TrafficWebSocketServer.instance;
  }

  constructor() {
    this.redisStorage = RedisStorage.getInstance();
  }

  /**
   * Start the WebSocket server
   */
  public start(port: number = 8080): void {
    if (this.isRunning) {
      console.log('WebSocket server already running');
      return;
    }

    try {
      this.wss = new WebSocketServer({ port });
      this.isRunning = true;

      this.wss.on('connection', (ws: WebSocket) => {
        console.log('🔌 New client connected to WebSocket');
        this.clients.add(ws);

        // Send initial data
        this.sendInitialData(ws);

        // Handle client messages
        ws.on('message', (message: Buffer) => {
          try {
            const data = JSON.parse(message.toString());
            this.handleClientMessage(ws, data);
          } catch (error) {
            console.error('Error parsing client message:', error);
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          console.log('🔌 Client disconnected from WebSocket');
          this.clients.delete(ws);
        });

        // Handle errors
        ws.on('error', (error) => {
          console.error('WebSocket client error:', error);
          this.clients.delete(ws);
        });
      });

      // Start periodic updates
      this.startPeriodicUpdates();

      console.log(`🚀 WebSocket server started on port ${port}`);
    } catch (error) {
      console.error('Failed to start WebSocket server:', error);
    }
  }

  /**
   * Stop the WebSocket server
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    this.isRunning = false;
    console.log('🛑 WebSocket server stopped');
  }

  /**
   * Send initial data to a new client
   */
  private async sendInitialData(ws: WebSocket): Promise<void> {
    try {
      const dashboardData = await this.redisStorage.getDashboardSummary();
      
      ws.send(JSON.stringify({
        type: 'initial_data',
        data: dashboardData,
        timestamp: new Date().toISOString()
      }));

      console.log('📊 Sent initial dashboard data to client');
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(ws: WebSocket, data: any): void {
    console.log('📨 Received client message:', data);

    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
      
      case 'request_update':
        this.sendDashboardUpdate(ws);
        break;
      
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Start periodic updates to all clients
   */
  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(async () => {
      if (this.clients.size > 0) {
        await this.broadcastUpdate();
      }
    }, 5000); // Update every 5 seconds - more reasonable
  }

  /**
   * Broadcast update to all connected clients
   */
  private async broadcastUpdate(): Promise<void> {
    try {
      const dashboardData = await this.redisStorage.getDashboardSummary();
      
      const message = JSON.stringify({
        type: 'dashboard_update',
        data: dashboardData,
        timestamp: new Date().toISOString()
      });

      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });

      console.log(`📡 Broadcasted update to ${this.clients.size} clients`);
    } catch (error) {
      console.error('Error broadcasting update:', error);
    }
  }

  /**
   * Send dashboard update to a specific client
   */
  private async sendDashboardUpdate(ws: WebSocket): Promise<void> {
    try {
      const dashboardData = await this.redisStorage.getDashboardSummary();
      
      ws.send(JSON.stringify({
        type: 'dashboard_update',
        data: dashboardData,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error sending dashboard update:', error);
    }
  }

  /**
   * Get server status
   */
  public getStatus(): { isRunning: boolean; clients: number; port?: number } {
    return {
      isRunning: this.isRunning,
      clients: this.clients.size,
      port: this.wss ? (this.wss as any).address()?.port : undefined
    };
  }

  /**
   * Broadcast custom message to all clients
   */
  public broadcast(message: any): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

// Auto-start the WebSocket server
const wsServer = TrafficWebSocketServer.getInstance();
wsServer.start(8080);

export { wsServer };