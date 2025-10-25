/**
 * Start Tracking WebSocket Server with Real Vehicle Data
 * This script starts the tracking WebSocket server that generates realistic vehicle movement
 */

const { TrackingWebSocketServer } = require('./dist/tracking-websocket-server.js');

async function startTrackingServer() {
  console.log('🚗 Starting Tracking WebSocket Server with Real Vehicle Data...');
  
  try {
    const trackingServer = new TrackingWebSocketServer();
    // The server starts automatically in the constructor, but let's ensure it's running
    console.log('📡 Tracking WebSocket server initialized');
    
    console.log('✅ Tracking WebSocket Server started successfully');
    console.log('📊 Generating realistic vehicle movement data');
    console.log('🔄 Vehicles will move, change lanes, and behave realistically');
    console.log('🛑 Press Ctrl+C to stop');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping Tracking WebSocket Server...');
      trackingServer.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Tracking WebSocket Server:', error);
    process.exit(1);
  }
}

startTrackingServer();

