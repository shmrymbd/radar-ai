#!/usr/bin/env node

/**
 * Test script for the unified WebSocket server
 */

const { WebSocket } = require('ws');

const PORT = 8080;
const wsUrl = `ws://localhost:${PORT}`;

console.log('🧪 Testing Unified WebSocket Server...');
console.log(`📡 Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ Connected to Unified WebSocket Server');
  
  // Test subscribing to dashboard channel
  console.log('📊 Subscribing to dashboard channel...');
  ws.send(JSON.stringify({
    type: 'subscribe_channel',
    channel: 'dashboard'
  }));
  
  // Test subscribing to tracking channel
  console.log('🚗 Subscribing to tracking channel...');
  ws.send(JSON.stringify({
    type: 'subscribe_channel',
    channel: 'tracking'
  }));
  
  // Test subscribing to classification channel
  console.log('📈 Subscribing to classification channel...');
  ws.send(JSON.stringify({
    type: 'subscribe_channel',
    channel: 'classification'
  }));
  
  // Test device subscription
  console.log('📱 Subscribing to test device...');
  ws.send(JSON.stringify({
    type: 'subscribe_device',
    deviceId: 'test'
  }));
  
  // Test ping
  console.log('🏓 Sending ping...');
  ws.send(JSON.stringify({
    type: 'ping'
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log(`📨 Received: ${message.type}`);
    
    if (message.type === 'connection_established') {
      console.log('✅ Connection established successfully');
    } else if (message.type === 'subscription_confirmed') {
      console.log(`✅ Subscribed to ${message.channel} channel`);
    } else if (message.type === 'device_subscription_confirmed') {
      console.log(`✅ Subscribed to device ${message.deviceId}`);
    } else if (message.type === 'pong') {
      console.log('🏓 Received pong');
    } else if (message.type === 'dashboard_data' || message.type === 'dashboard_update') {
      console.log('📊 Received dashboard data');
    } else if (message.type === 'tracking_data' || message.type === 'tracking_update') {
      console.log('🚗 Received tracking data');
    } else if (message.type === 'classification_data' || message.type === 'classification_update') {
      console.log('📈 Received classification data');
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} ${reason}`);
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
  process.exit(1);
});

// Close connection after 10 seconds
setTimeout(() => {
  console.log('⏰ Test completed, closing connection...');
  ws.close();
}, 10000);
