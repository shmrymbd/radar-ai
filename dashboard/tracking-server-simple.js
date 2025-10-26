const { WebSocketServer } = require('ws');
const { getRedisClient } = require('./dist/redis.js');

const PORT = 8081;

class SimpleTrackingServer {
  constructor() {
    this.wss = new WebSocketServer({ port: PORT });
    this.clients = new Set();
    this.updateInterval = null;
    this.isRunning = false;
    this.vehicleStates = new Map();
    
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws) => {
      console.log('🔌 Client connected to Tracking WebSocket');
      this.clients.add(ws);

      // Send initial data
      this.sendInitialData(ws);

      ws.on('message', (message) => {
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

      ws.on('error', (error) => {
        console.error('Tracking WebSocket client error:', error);
        this.clients.delete(ws);
      });
    });

    this.wss.on('listening', () => {
      console.log(`🚀 Tracking WebSocket server listening on port ${PORT}`);
      this.startPeriodicUpdates();
    });

    this.wss.on('error', (error) => {
      console.error('Tracking WebSocket server error:', error);
    });
  }

  async sendInitialData(ws) {
    try {
      // Initialize vehicle states if not done
      if (this.vehicleStates.size === 0) {
        this.initializeVehicleStates();
      }

      // Send current tracking data
      const trackingData = this.getTrackingData();
      this.sendMessage(ws, 'tracking_summary', trackingData);
    } catch (error) {
      console.error('Error sending initial tracking data:', error);
    }
  }

  startPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.isRunning = true;
    this.updateInterval = setInterval(async () => {
      if (this.clients.size > 0 && this.isRunning) {
        await this.broadcastTrackingUpdate();
      }
    }, 5000); // 5 second intervals
  }

  async broadcastTrackingUpdate() {
    try {
      // Update vehicle positions
      this.updateVehiclePositions();
      
      // Generate tracking data
      const trackingData = this.getTrackingData();
      
      // Broadcast to all connected clients
      this.clients.forEach(client => {
        this.sendMessage(client, 'tracking_update', trackingData);
      });
    } catch (error) {
      console.error('Error broadcasting tracking update:', error);
    }
  }

  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'get_tracking_data':
        const trackingData = this.getTrackingData();
        this.sendMessage(ws, 'tracking_data', trackingData);
        break;
      
      case 'get_visible_vehicles':
        const visibleVehicles = this.getVisibleVehicles();
        this.sendMessage(ws, 'visible_vehicles', visibleVehicles);
        break;
      
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  sendMessage(ws, type, data) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.clients.delete(ws);
      }
    }
  }

  initializeVehicleStates() {
    const lanes = [11, 12, 31, 32];
    const vehicleTypes = ['car', 'motorcycle', 'suv', 'truck'];
    
    // Create 8-12 vehicles distributed across lanes
    for (let i = 0; i < 10; i++) {
      const targetId = `vehicle_${Date.now()}_${i}`;
      const laneNo = lanes[Math.floor(Math.random() * lanes.length)];
      const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
      
      const vehicle = {
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

  updateVehiclePositions() {
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

  performLaneChange(vehicle) {
    const currentLane = vehicle.laneNo;
    const availableLanes = [11, 12, 31, 32].filter(lane => lane !== currentLane);
    const newLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    
    vehicle.laneNo = newLane;
    vehicle.x = this.getLaneXPosition(newLane) + (Math.random() - 0.5) * 1.5;
    
    // Slight speed adjustment during lane change
    vehicle.speed += (Math.random() - 0.5) * 5;
    vehicle.speed = Math.max(15, Math.min(80, vehicle.speed));
  }

  getLaneXPosition(laneNo) {
    const positions = { 11: -3.5, 12: 1.5, 31: -3.5, 32: 1.5 };
    return positions[laneNo] || 0;
  }

  generatePlateNumber() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let plate = '';
    for (let i = 0; i < 3; i++) plate += letters[Math.floor(Math.random() * letters.length)];
    for (let i = 0; i < 3; i++) plate += numbers[Math.floor(Math.random() * numbers.length)];
    return plate;
  }

  getVisibleVehicles() {
    return Array.from(this.vehicleStates.values()).filter(vehicle => 
      vehicle.y >= 0 && vehicle.y <= 300 && Math.abs(vehicle.x) <= 10
    );
  }

  getTrackingData() {
    const visibleVehicles = this.getVisibleVehicles();
    const totalVehicles = this.vehicleStates.size;
    const averageSpeed = visibleVehicles.length > 0 
      ? visibleVehicles.reduce((sum, v) => sum + v.speed, 0) / visibleVehicles.length 
      : 0;
    
    return {
      timestamp: new Date(),
      vehicles: visibleVehicles.map(vehicle => ({
        targetId: vehicle.targetId,
        x: vehicle.x,
        y: vehicle.y,
        speed: vehicle.speed,
        vehicleType: vehicle.vehicleType,
        laneNo: vehicle.laneNo,
        direction: vehicle.direction,
        color: vehicle.color,
        plateNumber: vehicle.plateNumber
      })),
      totalVehicles,
      vehiclesInZone: visibleVehicles.length,
      averageSpeed,
      trafficDensity: visibleVehicles.length / 300 // vehicles per meter
    };
  }

  stop() {
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
const trackingServer = new SimpleTrackingServer();

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
