/**
 * Radar AI Backend Server
 * Entry point for the WebSocket server
 */

import { getWebSocketServer } from './websocket/server';
import { HealthServer } from './services/health/health-server';
import { createLogger } from './utils/logger';

const logger = createLogger('main');

/**
 * Start the backend server
 */
async function main() {
  try {
    logger.info('Starting Radar AI Backend Server...');

    // Get WebSocket server instance (singleton)
    const wsServer = getWebSocketServer();

    // Start health check server
    const healthServer = HealthServer.getInstance();
    healthServer.start();

    logger.info('Backend server started successfully', {
      status: wsServer.getStatus(),
      healthPort: healthServer.getPort(),
    });

    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await healthServer.stop();
      await wsServer.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await healthServer.stop();
      await wsServer.shutdown();
      process.exit(0);
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Start server
main();
