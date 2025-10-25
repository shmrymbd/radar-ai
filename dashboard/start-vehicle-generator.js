/**
 * Start Vehicle Data Generator
 * This script starts generating realistic vehicle movement data
 */

const { VehicleDataGenerator } = require('./src/lib/vehicle-data-generator.ts');

async function startGenerator() {
  console.log('🚗 Starting Vehicle Data Generator...');
  
  const generator = new VehicleDataGenerator();
  
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
