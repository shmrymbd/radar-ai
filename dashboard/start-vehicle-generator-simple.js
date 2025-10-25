/**
 * Simple Vehicle Data Generator
 * This script generates realistic vehicle movement data and stores it in Redis
 */

const { RedisStorage } = require('./dist/redis-storage.js');

class SimpleVehicleGenerator {
  constructor() {
    this.redisStorage = RedisStorage.getInstance();
    this.isRunning = false;
    this.intervalId = null;
    this.vehicles = new Map();
  }

  start(deviceId, intervalMs = 2000) {
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

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Vehicle data generator stopped');
  }

  initializeVehicles(deviceId) {
    const lanes = [11, 12, 31, 32];
    const vehicleTypes = ['car', 'motorcycle', 'suv', 'truck'];
    
    // Create 3-5 vehicles per lane
    for (const lane of lanes) {
      const vehicleCount = Math.floor(Math.random() * 3) + 2; // 2-4 vehicles per lane
      
      for (let i = 0; i < vehicleCount; i++) {
        const targetId = `${Date.now()}_${lane}_${i}`;
        const vehicle = {
          targetId,
          laneNo: lane,
          x: this.getLaneXPosition(lane) + (Math.random() - 0.5) * 2,
          y: Math.random() * 200 + 50,
          speed: Math.random() * 40 + 20,
          vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
          direction: Math.random() > 0.5 ? 1 : -1,
          lastUpdate: Date.now()
        };
        
        this.vehicles.set(targetId, vehicle);
      }
    }
  }

  async generateVehicleData(deviceId) {
    try {
      const currentTime = new Date();
      const entries = [];

      // Update vehicle positions
      for (const [targetId, vehicle] of this.vehicles) {
        this.updateVehiclePosition(vehicle);
        
        // Create vehicle entry
        const entry = {
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
      const objectData = {
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

  updateVehiclePosition(vehicle) {
    const now = Date.now();
    const deltaTime = (now - vehicle.lastUpdate) / 1000;
    vehicle.lastUpdate = now;

    // Update position based on speed and direction
    vehicle.y += vehicle.direction * vehicle.speed * deltaTime * 0.1;
    
    // Add some random movement
    vehicle.x += (Math.random() - 0.5) * 0.5;
    vehicle.speed += (Math.random() - 0.5) * 2;
    vehicle.speed = Math.max(10, Math.min(80, vehicle.speed));

    // Reset vehicle if it goes too far
    if (vehicle.y > 300 || vehicle.y < -50) {
      vehicle.y = vehicle.direction > 0 ? -50 : 300;
      vehicle.speed = Math.random() * 40 + 20;
    }
  }

  getLaneXPosition(laneNo) {
    const lanePositions = {
      11: -3.5,
      12: 1.5,
      31: -3.5,
      32: 1.5
    };
    return lanePositions[laneNo] || 0;
  }

  getVehicleTypeCode(vehicleType) {
    const typeCodes = {
      'car': 6,
      'motorcycle': 1,
      'suv': 7,
      'truck': 8
    };
    return typeCodes[vehicleType] || 6;
  }

  generatePlateNumber() {
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

  getVehicleLength(vehicleType) {
    const lengths = {
      'car': 4.5,
      'motorcycle': 2.0,
      'suv': 5.0,
      'truck': 8.0
    };
    return lengths[vehicleType] || 4.5;
  }

  getVehicleWidth(vehicleType) {
    const widths = {
      'car': 1.8,
      'motorcycle': 1.0,
      'suv': 2.0,
      'truck': 2.5
    };
    return widths[vehicleType] || 1.8;
  }

  getVehicleHeight(vehicleType) {
    const heights = {
      'car': 1.5,
      'motorcycle': 1.2,
      'suv': 1.8,
      'truck': 3.0
    };
    return heights[vehicleType] || 1.5;
  }
}

async function startGenerator() {
  console.log('🚗 Starting Simple Vehicle Data Generator...');
  
  const generator = new SimpleVehicleGenerator();
  
  // Start generating data for both devices
  generator.start('test', 2000); // Update every 2 seconds
  generator.start('Radar04', 2000);
  
  console.log('✅ Vehicle Data Generator started for devices: test, Radar04');
  console.log('📊 Data will be updated every 2 seconds');
  console.log('🛑 Press Ctrl+C to stop');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping Vehicle Data Generator...');
    generator.stop();
    process.exit(0);
  });
}

startGenerator().catch(console.error);
