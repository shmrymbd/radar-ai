#!/usr/bin/env node

/**
 * WebSocket Server Startup Script
 * Starts the Traffic WebSocket Server for real-time dashboard updates
 */

const { TrafficWebSocketServer } = require('./src/lib/websocket-server.ts');

const PORT = process.env.WEBSOCKET_PORT || 8080;

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
