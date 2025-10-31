/**
 * Server initialization module
 * Automatically initializes background services when imported by Next.js
 *
 * Architecture Decision:
 * - PassDataStreamProcessor (Redis Streams) is the PRIMARY data pipeline
 * - PassDataSubscriber (Pub/Sub) is DEPRECATED but kept for backward compatibility
 * - Use stream-monitor API to control processor lifecycle
 */

import { PassDataSubscriber } from './passdata-subscriber';
import { PassDataMongoDBService } from './passdata-mongodb-service';
import { PassDataStreamProcessor } from './passdata-stream-processor';

// Initialize MongoDB service and create indexes
const mongoService = PassDataMongoDBService.getInstance();
mongoService.initialize().then(() => {
  console.log('✅ MongoDB PassData service initialized');
});

// OPTION 1: Auto-start Redis Streams processor (RECOMMENDED)
// Uncomment to enable automatic stream processing on server startup
/*
const streamProcessor = PassDataStreamProcessor.getInstance();
streamProcessor.start('P1-center').then(() => {
  console.log('✅ Auto-started Redis Streams processor for PassData');
}).catch(error => {
  console.error('❌ Failed to start stream processor:', error);
});
*/

// OPTION 2: Keep legacy Pub/Sub subscriber (DEPRECATED)
// Comment out to disable legacy polling-based approach
const subscriber = PassDataSubscriber.getInstance();
subscriber.start().then(() => {
  console.log('✅ Auto-started Redis Pub/Sub subscriber for PassData (LEGACY)');
}).catch(error => {
  console.error('❌ Failed to start PassData subscriber:', error);
});

// Export the initialized instances for use elsewhere if needed
export { subscriber, mongoService };
