/**
 * Unified WebSocket Server
 * Integrates tracking, classification, and dashboard real-time updates
 */

import { WebSocketServer, WebSocket } from 'ws';
import { config } from '../config/env';
import { createLogger } from '../utils/logger';
import { RateLimiter } from './middleware/rate-limiter';
import { ErrorHandler } from './middleware/error-handler';
import { safeValidateWebSocketMessage, WebSocketMessage } from './message-schemas';
import { TrackingHandler } from './handlers/tracking';
import { ClassificationHandler } from './handlers/classification';
import { DashboardHandler } from './handlers/dashboard';
import { RedisPubSubService } from '../services/redis/pubsub';

const logger = createLogger('websocket-server');

interface ClientSubscription {
  ws: WebSocket;
  subscribedChannels: Set<string>;
  deviceId?: string;
}

export class UnifiedWebSocketServer {
  private static instance: UnifiedWebSocketServer;
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientSubscription> = new Map();
  private deviceClients: Map<string, Set<WebSocket>> = new Map();

  // Middleware
  private rateLimiter: RateLimiter;
  private errorHandler: ErrorHandler;

  // Handlers
  private trackingHandler: TrackingHandler;
  private classificationHandler: ClassificationHandler;
  private dashboardHandler: DashboardHandler;

  // Services
  private redisPubSub: RedisPubSubService;

  private isRunning: boolean = false;

  public static getInstance(): UnifiedWebSocketServer {
    if (!UnifiedWebSocketServer.instance) {
      UnifiedWebSocketServer.instance = new UnifiedWebSocketServer();
    }
    return UnifiedWebSocketServer.instance;
  }

  private constructor() {
    const port = config.port;

    this.wss = new WebSocketServer({ port });
    this.rateLimiter = new RateLimiter();
    this.errorHandler = new ErrorHandler();
    this.trackingHandler = new TrackingHandler();
    this.classificationHandler = new ClassificationHandler();
    this.dashboardHandler = new DashboardHandler();
    this.redisPubSub = RedisPubSubService.getInstance();

    this.setupWebSocketServer();
    this.initializeHandlers();
  }

  /**
   * Initialize all handlers and pub/sub
   */
  private async initializeHandlers(): Promise<void> {
    try {
      // Initialize pub/sub
      await this.redisPubSub.initialize();
      logger.info('Redis pub/sub service initialized');

      // Initialize tracking handler
      await this.trackingHandler.initialize();

      // Initialize classification handler
      await this.classificationHandler.initialize();

      // Register tracking update callback
      this.trackingHandler.onObjectDataUpdate((deviceId, trackingUpdate, trackingData) => {
        // Broadcast to tracking channel
        this.broadcastToChannel('tracking', {
          type: 'tracking_update',
          data: trackingUpdate,
          deviceId,
          timestamp: new Date().toISOString(),
        });

        this.broadcastToChannel('tracking', {
          type: 'tracking_summary',
          data: trackingData,
          deviceId,
          timestamp: new Date().toISOString(),
        });
      });

      // Register classification update callback
      this.classificationHandler.onPassDataUpdate((deviceId, data, metrics, summary) => {
        // Broadcast to classification channel
        this.broadcastToChannel('classification', {
          type: 'passdata_update',
          deviceId,
          timestamp: new Date().toISOString(),
          data: data,
        });

        this.broadcastToChannel('classification', {
          type: 'classification_update',
          data: {
            metrics,
            summary,
            deviceId,
            timestamp: new Date().toISOString(),
            source: 'realtime_passdata',
          },
        });
      });

      // Subscribe to PassData for default device
      try {
        await this.redisPubSub.subscribeToPassData('P1-center');
        logger.info('Subscribed to PassData for P1-center');
      } catch (error) {
        logger.error('Failed to subscribe to PassData', { error });
      }

      logger.info('All handlers initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize handlers', { error });
    }
  }

  /**
   * Setup WebSocket server event handlers
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New client connected');

      this.clients.set(ws, {
        ws,
        subscribedChannels: new Set(),
      });

      // Send initial connection acknowledgment
      this.sendMessage(ws, {
        type: 'connection_established',
        message: 'Unified WebSocket connected successfully',
        availableChannels: ['dashboard', 'tracking', 'classification'],
      });

      // Handle incoming messages
      ws.on('message', (message: string) => {
        this.handleMessage(ws, message);
      });

      // Handle client disconnect
      ws.on('close', () => {
        logger.info('Client disconnected');
        this.removeClient(ws);
      });

      // Handle errors
      ws.on('error', (error: Error) => {
        this.errorHandler.handleConnectionError(ws, error);
        this.removeClient(ws);
      });
    });

    this.wss.on('listening', () => {
      logger.info(`WebSocket server listening on port ${config.port}`);
      this.isRunning = true;
    });

    this.wss.on('error', (error: Error) => {
      logger.error('WebSocket server error', { error: error.message });
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(ws: WebSocket, message: string): void {
    // Check rate limit
    if (!this.rateLimiter.checkLimit(ws)) {
      this.errorHandler.handleRateLimitError(ws);
      return;
    }

    try {
      // Parse JSON
      const rawData = JSON.parse(message);

      // Validate message
      const validation = safeValidateWebSocketMessage(rawData);

      if (!validation.success || !validation.data) {
        this.errorHandler.handleValidationError(ws, validation.error || 'Unknown validation error');
        return;
      }

      // Handle validated message
      this.handleClientMessage(ws, validation.data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.errorHandler.handleParseError(ws, error);
      } else {
        this.errorHandler.handleProcessingError(ws, error as Error);
      }
    }
  }

  /**
   * Route client message to appropriate handler
   */
  private async handleClientMessage(ws: WebSocket, data: WebSocketMessage): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    logger.debug('Received message', { type: data.type });

    try {
      switch (data.type) {
        // Device management
        case 'subscribe_device':
          await this.subscribeClientToDevice(ws, data.deviceId);
          break;

        case 'unsubscribe_device':
          await this.unsubscribeClientFromDevice(ws, data.deviceId);
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

        // Dashboard
        case 'get_dashboard_data':
          await this.dashboardHandler.handleGetDashboardData(
            ws,
            data.deviceId || client.deviceId || 'P1-center',
            this.sendMessage.bind(this)
          );
          break;

        // Tracking
        case 'get_tracking_data':
          await this.trackingHandler.handleGetTrackingData(ws, this.sendMessage.bind(this));
          break;

        case 'get_vehicle_details':
          await this.trackingHandler.handleGetVehicleDetails(ws, data.targetId, this.sendMessage.bind(this));
          break;

        case 'get_visible_vehicles':
          await this.trackingHandler.handleGetVisibleVehicles(ws, this.sendMessage.bind(this));
          break;

        // Classification
        case 'get_classification_data':
          await this.classificationHandler.handleGetClassificationData(
            ws,
            client.deviceId || 'P1-center',
            this.sendMessage.bind(this)
          );
          break;

        // Health check
        case 'ping':
          this.sendMessage(ws, { type: 'pong', timestamp: Date.now() });
          break;

        default:
          // TypeScript exhaustiveness check
          const _exhaustiveCheck: never = data;
          logger.warn('Unknown message type received');
      }
    } catch (error) {
      this.errorHandler.handleProcessingError(ws, error as Error, data.type);
    }
  }

  /**
   * Subscribe client to channel
   */
  private async subscribeToChannel(ws: WebSocket, channel: string): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    client.subscribedChannels.add(channel);
    logger.info('Client subscribed to channel', { channel });

    this.sendMessage(ws, {
      type: 'subscription_confirmed',
      channel: channel,
      message: `Subscribed to ${channel} channel`,
    });

    // Send initial data for the channel
    switch (channel) {
      case 'dashboard':
        await this.dashboardHandler.handleGetDashboardData(
          ws,
          client.deviceId || 'P1-center',
          this.sendMessage.bind(this)
        );
        break;

      case 'tracking':
        await this.trackingHandler.handleGetTrackingData(ws, this.sendMessage.bind(this));
        break;

      case 'classification':
        await this.classificationHandler.handleGetClassificationData(
          ws,
          client.deviceId || 'P1-center',
          this.sendMessage.bind(this)
        );
        break;
    }
  }

  /**
   * Unsubscribe client from channel
   */
  private unsubscribeFromChannel(ws: WebSocket, channel: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    client.subscribedChannels.delete(channel);
    logger.info('Client unsubscribed from channel', { channel });

    this.sendMessage(ws, {
      type: 'unsubscription_confirmed',
      channel: channel,
      message: `Unsubscribed from ${channel} channel`,
    });
  }

  /**
   * Subscribe client to device
   */
  private async subscribeClientToDevice(ws: WebSocket, deviceId: string): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    client.deviceId = deviceId;

    // Add client to device's client list
    if (!this.deviceClients.has(deviceId)) {
      this.deviceClients.set(deviceId, new Set());
    }
    this.deviceClients.get(deviceId)!.add(ws);

    logger.info('Client subscribed to device', { deviceId });

    // Subscribe to Redis pub/sub for this device
    try {
      await this.redisPubSub.subscribeToPassData(deviceId);
      logger.info('Subscribed to Redis pub/sub for device', { deviceId });
    } catch (error) {
      logger.error('Failed to subscribe to Redis pub/sub', { deviceId, error });
    }

    this.sendMessage(ws, {
      type: 'device_subscription_confirmed',
      deviceId: deviceId,
      message: `Subscribed to device ${deviceId}`,
    });

    // Send initial dashboard data
    await this.dashboardHandler.handleGetDashboardData(ws, deviceId, this.sendMessage.bind(this));

    // Start device-specific updates
    this.startDeviceUpdates(deviceId);
  }

  /**
   * Unsubscribe client from device
   */
  private async unsubscribeClientFromDevice(ws: WebSocket, deviceId: string): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    client.deviceId = undefined;

    // Remove client from device's client list
    if (this.deviceClients.has(deviceId)) {
      this.deviceClients.get(deviceId)!.delete(ws);

      // If no clients subscribed, stop updates
      if (this.deviceClients.get(deviceId)!.size === 0) {
        this.stopDeviceUpdates(deviceId);

        try {
          await this.redisPubSub.unsubscribe(deviceId);
          logger.info('Unsubscribed from Redis pub/sub for device', { deviceId });
        } catch (error) {
          logger.error('Failed to unsubscribe from Redis pub/sub', { deviceId, error });
        }
      }
    }

    logger.info('Client unsubscribed from device', { deviceId });

    this.sendMessage(ws, {
      type: 'device_unsubscription_confirmed',
      deviceId: deviceId,
      message: `Unsubscribed from device ${deviceId}`,
    });
  }

  /**
   * Start periodic updates for device
   */
  private startDeviceUpdates(deviceId: string): void {
    if (this.deviceClients.has(deviceId) && this.deviceClients.get(deviceId)!.size > 0) {
      this.dashboardHandler.startDeviceUpdates(deviceId, (deviceId, message) => {
        this.broadcastToDevice(deviceId, message);
      });
    }
  }

  /**
   * Stop periodic updates for device
   */
  private stopDeviceUpdates(deviceId: string): void {
    this.dashboardHandler.stopDeviceUpdates(deviceId);
  }

  /**
   * Remove client connection
   */
  private removeClient(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) return;

    // Remove from device subscriptions
    if (client.deviceId) {
      if (this.deviceClients.has(client.deviceId)) {
        this.deviceClients.get(client.deviceId)!.delete(ws);

        if (this.deviceClients.get(client.deviceId)!.size === 0) {
          this.stopDeviceUpdates(client.deviceId);
        }
      }
    }

    this.clients.delete(ws);
    this.rateLimiter.removeClient(ws);
  }

  /**
   * Send available devices list
   */
  private sendAvailableDevices(ws: WebSocket): void {
    const devices = this.dashboardHandler.getAvailableDevices();

    this.sendMessage(ws, {
      type: 'available_devices',
      devices: devices,
    });
  }

  /**
   * Send message to client
   */
  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Error sending message', { error });
        this.removeClient(ws);
      }
    }
  }

  /**
   * Broadcast message to all clients subscribed to channel
   */
  private broadcastToChannel(channel: string, message: any): void {
    for (const [ws, client] of this.clients) {
      if (client.subscribedChannels.has(channel)) {
        this.sendMessage(ws, message);
      }
    }
  }

  /**
   * Broadcast message to all clients subscribed to device
   */
  private broadcastToDevice(deviceId: string, message: any): void {
    if (this.deviceClients.has(deviceId)) {
      this.deviceClients.get(deviceId)!.forEach((client) => {
        this.sendMessage(client, message);
      });
    }
  }

  /**
   * Get server status
   */
  public getStatus(): {
    isRunning: boolean;
    connectedClients: number;
    activeDevices: string[];
    port: number;
  } {
    return {
      isRunning: this.isRunning,
      connectedClients: this.clients.size,
      activeDevices: Array.from(this.deviceClients.keys()),
      port: config.port,
    };
  }

  /**
   * Shutdown server gracefully
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down WebSocket server...');

    // Stop all device updates
    for (const deviceId of this.deviceClients.keys()) {
      this.stopDeviceUpdates(deviceId);
    }

    // Cleanup dashboard handler
    this.dashboardHandler.cleanup();

    // Disconnect pub/sub
    await this.redisPubSub.disconnect();

    // Close all client connections
    for (const ws of this.clients.keys()) {
      ws.close();
    }

    // Close server
    this.wss.close();

    this.isRunning = false;
    logger.info('WebSocket server shut down successfully');
  }
}

// Export singleton instance getter
export const getWebSocketServer = () => UnifiedWebSocketServer.getInstance();
