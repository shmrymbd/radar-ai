#!/usr/bin/env node

/**
 * Traffic WebSocket Server (JavaScript version)
 * Real-time dashboard updates for traffic signal control
 */

const { WebSocketServer } = require('ws');
const { createClient } = require('redis');

const PORT = parseInt(process.env.WEBSOCKET_PORT || '8080', 10);

class TrafficWebSocketServer {
  constructor(port) {
    this.wss = new WebSocketServer({ port });
    this.redisClient = null;
    this.updateIntervals = new Map(); // Device-specific update intervals
    this.clients = new Map(); // Map client to subscribed devices
    this.deviceClients = new Map(); // Map device to clients
    this.setupWebSocketServer();
  }

  async connectToRedis() {
    if (!this.redisClient) {
      try {
        this.redisClient = createClient({
          url: `redis://${process.env.REDIS_HOST || '192.168.6.22'}:${process.env.REDIS_PORT || '6379'}`,
          socket: {
            connectTimeout: 5000,
            commandTimeout: 5000,
          }
        });

        this.redisClient.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        await this.redisClient.connect();
        console.log('✅ Connected to Redis');
      } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        this.redisClient = null;
      }
    }
    return this.redisClient;
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws) => {
      console.log('🔌 New client connected to WebSocket');
      this.clients.set(ws, new Set()); // Track subscribed devices for this client

      // Handle client messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('❌ Error parsing client message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('🔌 Client disconnected from WebSocket');
        this.removeClient(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
        this.removeClient(ws);
      });

      // Send initial connection acknowledgment
      this.sendMessage(ws, { type: 'connection_established', message: 'WebSocket connected successfully' });
    });

    // Start periodic updates
    this.startPeriodicUpdates();

    console.log(`🚀 WebSocket server started on port ${PORT}`);
  }

  // Handle client messages (device subscription, etc.)
  handleClientMessage(ws, data) {
    console.log('📨 Received message:', data);
    
    switch (data.type) {
      case 'subscribe_device':
        this.subscribeClientToDevice(ws, data.deviceId);
        break;
      case 'unsubscribe_device':
        this.unsubscribeClientFromDevice(ws, data.deviceId);
        break;
      case 'get_available_devices':
        this.sendAvailableDevices(ws);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  // Subscribe client to a specific device
  subscribeClientToDevice(ws, deviceId) {
    if (!this.clients.has(ws)) {
      console.error('Client not found in clients map');
      return;
    }

    // Add device to client's subscription list
    this.clients.get(ws).add(deviceId);
    
    // Add client to device's client list
    if (!this.deviceClients.has(deviceId)) {
      this.deviceClients.set(deviceId, new Set());
    }
    this.deviceClients.get(deviceId).add(ws);

    console.log(`📡 Client subscribed to device: ${deviceId}`);
    
    // Send confirmation
    this.sendMessage(ws, { 
      type: 'subscription_confirmed', 
      deviceId: deviceId,
      message: `Subscribed to device ${deviceId}` 
    });

    // Send initial data for this device
    this.sendDeviceData(ws, deviceId);
    
    // Start device-specific updates if not already running
    this.startDeviceUpdates(deviceId);
  }

  // Unsubscribe client from a device
  unsubscribeClientFromDevice(ws, deviceId) {
    if (!this.clients.has(ws)) {
      return;
    }

    // Remove device from client's subscription list
    this.clients.get(ws).delete(deviceId);
    
    // Remove client from device's client list
    if (this.deviceClients.has(deviceId)) {
      this.deviceClients.get(deviceId).delete(ws);
      
      // If no clients are subscribed to this device, stop updates
      if (this.deviceClients.get(deviceId).size === 0) {
        this.stopDeviceUpdates(deviceId);
      }
    }

    console.log(`📡 Client unsubscribed from device: ${deviceId}`);
    
    // Send confirmation
    this.sendMessage(ws, { 
      type: 'unsubscription_confirmed', 
      deviceId: deviceId,
      message: `Unsubscribed from device ${deviceId}` 
    });
  }

  // Remove client from all tracking
  removeClient(ws) {
    if (!this.clients.has(ws)) {
      return;
    }

    // Get all devices this client was subscribed to
    const subscribedDevices = this.clients.get(ws);
    
    // Unsubscribe from all devices
    for (const deviceId of subscribedDevices) {
      if (this.deviceClients.has(deviceId)) {
        this.deviceClients.get(deviceId).delete(ws);
        
        // If no clients are subscribed to this device, stop updates
        if (this.deviceClients.get(deviceId).size === 0) {
          this.stopDeviceUpdates(deviceId);
        }
      }
    }

    // Remove client from tracking
    this.clients.delete(ws);
  }

  // Send available devices to client
  sendAvailableDevices(ws) {
    const devices = [
      { id: 'test', name: 'Test Device', status: 'online' },
      { id: 'Radar04', name: 'Radar04', status: 'online' }
    ];
    
    this.sendMessage(ws, { 
      type: 'available_devices', 
      devices: devices 
    });
  }

  // Send message to a specific client
  sendMessage(ws, message) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Send device-specific data to a client
  async sendDeviceData(ws, deviceId) {
    try {
      const data = await this.getLatestDashboardData(deviceId);
      this.sendMessage(ws, { 
        type: 'device_data', 
        deviceId: deviceId,
        data: data 
      });
    } catch (error) {
      console.error(`Error sending data for device ${deviceId}:`, error);
    }
  }

  // Start device-specific updates
  startDeviceUpdates(deviceId) {
    if (this.updateIntervals.has(deviceId)) {
      return; // Already running
    }

    const interval = setInterval(async () => {
      if (this.deviceClients.has(deviceId) && this.deviceClients.get(deviceId).size > 0) {
        try {
          const data = await this.getLatestDashboardData(deviceId);
          this.broadcastToDevice(deviceId, { 
            type: 'device_update', 
            deviceId: deviceId,
            data: data 
          });
        } catch (error) {
          console.error(`Error updating device ${deviceId}:`, error);
        }
      }
    }, 5000); // Update every 5 seconds

    this.updateIntervals.set(deviceId, interval);
    console.log(`🔄 Started updates for device: ${deviceId}`);
  }

  // Stop device-specific updates
  stopDeviceUpdates(deviceId) {
    if (this.updateIntervals.has(deviceId)) {
      clearInterval(this.updateIntervals.get(deviceId));
      this.updateIntervals.delete(deviceId);
      console.log(`⏹️ Stopped updates for device: ${deviceId}`);
    }
  }

  // Broadcast to all clients subscribed to a specific device
  broadcastToDevice(deviceId, message) {
    if (this.deviceClients.has(deviceId)) {
      this.deviceClients.get(deviceId).forEach(client => {
        this.sendMessage(client, message);
      });
    }
  }

  /**
   * Stop the WebSocket server
   */
  stop() {
    // Stop all device-specific intervals
    for (const [deviceId, interval] of this.updateIntervals) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();
    
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
    this.wss.close(() => {
      console.log('🛑 WebSocket server stopped');
    });
  }

  // Start periodic updates (legacy method - now handled by device-specific updates)
  startPeriodicUpdates() {
    // This method is now handled by device-specific updates
    console.log('📡 Device-specific updates will be started when clients subscribe');
  }

  /**
   * Get device-specific dashboard data from Redis
   */
  async getLatestDashboardData(deviceId = 'Radar04') {
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
      // Get latest data from Redis for the specific device
      const objectData = await client.lRange(`${deviceId}/objectdata`, -1, -1);
      const laneStatus = await client.lRange(`${deviceId}/lanestatus`, -1, -1);
      const passEvents = await client.lRange(`${deviceId}/passdata`, -5, -1);

      // Parse the data
      const parsedObjectData = objectData.length > 0 ? JSON.parse(objectData[0]) : null;
      const parsedLaneStatus = laneStatus.length > 0 ? JSON.parse(laneStatus[0]) : null;
      const parsedPassEvents = passEvents.map(event => JSON.parse(event));

      // Calculate summary
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

  /**
   * Calculate summary statistics
   */
  calculateSummary(laneStatus, passEvents) {
    let totalVehicles = 0;
    let totalSpeed = 0;
    let speedCount = 0;
    let lanesWithQueues = 0;
    let totalVehiclesOnline = 0;
    let totalOccupancy = 0;
    let occupancyCount = 0;

    if (laneStatus && laneStatus.entries) {
      laneStatus.entries.forEach(entry => {
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

}

// Start the server
console.log('🚀 Starting Traffic WebSocket Server...');
console.log(`📡 Port: ${PORT}`);
console.log(`🔗 URL: ws://localhost:${PORT}`);

try {
  const wsServer = new TrafficWebSocketServer(PORT);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down WebSocket server...');
    wsServer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down WebSocket server...');
    wsServer.stop();
    process.exit(0);
  });

  console.log('✅ WebSocket server started successfully!');
  console.log('📊 Dashboard will receive real-time updates every 5 seconds');
  console.log('🔄 Press Ctrl+C to stop the server');

} catch (error) {
  console.error('❌ Failed to start WebSocket server:', error);
  process.exit(1);
}
