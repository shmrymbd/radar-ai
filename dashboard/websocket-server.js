#!/usr/bin/env node

/**
 * Traffic WebSocket Server (JavaScript version)
 * Real-time dashboard updates for traffic signal control
 */

const { WebSocketServer } = require('ws');
const { RedisStorage } = require('./src/lib/redis-storage.ts');

const PORT = parseInt(process.env.WEBSOCKET_PORT || '8080', 10);

class TrafficWebSocketServer {
  constructor(port) {
    this.wss = new WebSocketServer({ port });
    this.redisStorage = RedisStorage.getInstance();
    this.updateInterval = null;
    this.clients = new Set();
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws) => {
      console.log('🔌 New client connected to WebSocket');
      this.clients.add(ws);

      // Send initial data immediately
      this.sendInitialData(ws);

      // Handle client messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          console.log('📨 Received message:', data);
        } catch (error) {
          console.error('❌ Error parsing client message:', error);
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

    console.log(`🚀 WebSocket server started on port ${PORT}`);
  }

  /**
   * Stop the WebSocket server
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.wss.close(() => {
      console.log('🛑 WebSocket server stopped');
    });
  }

  /**
   * Send initial data to a client
   */
  async sendInitialData(ws) {
    try {
      const dashboardData = await this.redisStorage.getDashboardSummary();
      this.sendMessage(ws, 'initial_data', dashboardData);
      console.log('📊 Sent initial dashboard data to client');
    } catch (error) {
      console.error('❌ Error sending initial data:', error);
    }
  }

  /**
   * Start periodic updates to all clients
   */
  startPeriodicUpdates() {
    this.updateInterval = setInterval(async () => {
      if (this.clients.size > 0) {
        await this.broadcastUpdate();
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Broadcast update to all connected clients
   */
  async broadcastUpdate() {
    try {
      const dashboardData = await this.redisStorage.getDashboardSummary();
      this.broadcastMessage('dashboard_update', dashboardData);
      console.log(`📡 Broadcasted update to ${this.clients.size} clients`);
    } catch (error) {
      console.error('❌ Error broadcasting update:', error);
    }
  }

  /**
   * Send message to a specific client
   */
  sendMessage(ws, type, data) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({ type, data }));
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastMessage(type, data) {
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type, data }));
      }
    });
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
