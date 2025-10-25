/**
 * Simple Tracking WebSocket Server
 * A minimal WebSocket server for live vehicle tracking
 */

const WebSocket = require('ws');
const { RedisStorage } = require('./dist/redis-storage.js');

const PORT = 8081;

class SimpleTrackingServer {
  constructor() {
    this.wss = new WebSocket.Server({ port: PORT });
    this.redisStorage = RedisStorage.getInstance();
    this.clients = new Set();
    this.isRunning = false;
    this.updateInterval = null;
    
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws) => {
      console.log('🔌 Client connected to Simple Tracking WebSocket');
      this.clients.add(ws);

      // Send initial data
      this.sendInitialData(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Error parsing client message:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected from Simple Tracking WebSocket');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('Simple Tracking WebSocket client error:', error);
        this.clients.delete(ws);
      });
    });

    this.wss.on('listening', () => {
      console.log(`🚀 Simple Tracking WebSocket server listening on port ${PORT}`);
      this.startPeriodicUpdates();
    });

    this.wss.on('error', (error) => {
      console.error('Simple Tracking WebSocket server error:', error);
    });
  }

  async sendInitialData(ws) {
    try {
      // Get vehicle data from API
      const response = await fetch('http://localhost:3000/api/tracking/vehicles?device=test');
      const data = await response.json();
      
      if (data.success && data.data) {
        const message = {
          type: 'initial_data',
          timestamp: Date.now(),
          vehicles: data.data.map(vehicle => ({
            targetId: vehicle.targetId,
            x: vehicle.position.x,
            y: vehicle.position.y,
            speed: vehicle.position.speed,
            vehicleType: vehicle.position.vehicleType,
            laneNo: vehicle.position.laneNo
          }))
        };
        
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  handleClientMessage(ws, data) {
    console.log('📨 Received client message:', data.type);
    
    if (data.type === 'subscribe') {
      console.log('✅ Client subscribed to device:', data.deviceId);
    }
  }

  startPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (this.clients.size === 0) return;

      try {
        // Get latest vehicle data
        const response = await fetch('http://localhost:3000/api/tracking/vehicles?device=test');
        const data = await response.json();
        
        if (data.success && data.data) {
          const message = {
            type: 'vehicle_update',
            timestamp: Date.now(),
            vehicles: data.data.map(vehicle => ({
              targetId: vehicle.targetId,
              x: vehicle.position.x,
              y: vehicle.position.y,
              speed: vehicle.position.speed,
              vehicleType: vehicle.position.vehicleType,
              laneNo: vehicle.position.laneNo
            }))
          };
          
          // Send to all connected clients
          this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(message));
            }
          });
        }
      } catch (error) {
        console.error('Error in periodic update:', error);
      }
    }, 1000); // Update every 1 second
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.wss.close(() => {
      console.log('Simple Tracking WebSocket server closed');
    });
  }
}

// Start the server
const server = new SimpleTrackingServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Simple Tracking WebSocket server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down Simple Tracking WebSocket server...');
  server.stop();
  process.exit(0);
});
