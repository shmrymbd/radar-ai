/**
 * Health Check HTTP Server
 * Exposes /health, /ready, and /alive endpoints for monitoring
 */

import http from 'http';
import { HealthCheckService } from './health-check';
import { createLogger } from '../../utils/logger';
import { config } from '../../config/env';

const logger = createLogger('health-server');

export class HealthServer {
  private static instance: HealthServer;
  private server: http.Server | null = null;
  private healthCheck: HealthCheckService;
  private readonly port: number;

  public static getInstance(): HealthServer {
    if (!HealthServer.instance) {
      HealthServer.instance = new HealthServer();
    }
    return HealthServer.instance;
  }

  private constructor() {
    this.healthCheck = HealthCheckService.getInstance();
    // Use a separate port for health checks (WebSocket port + 1)
    this.port = config.port + 1;
  }

  /**
   * Start the health check HTTP server
   */
  public start(): void {
    if (this.server) {
      logger.warn('Health server already running');
      return;
    }

    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle OPTIONS request
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Only allow GET requests
      if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      try {
        switch (url.pathname) {
          case '/health':
            await this.handleHealthCheck(res);
            break;

          case '/ready':
            await this.handleReadinessCheck(res);
            break;

          case '/alive':
            await this.handleLivenessCheck(res);
            break;

          case '/metrics':
            await this.handleMetrics(res);
            break;

          default:
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'Not found',
                availableEndpoints: ['/health', '/ready', '/alive', '/metrics'],
              })
            );
        }
      } catch (error) {
        logger.error('Error handling health check request', { error });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      }
    });

    this.server.listen(this.port, () => {
      logger.info(`Health check server listening on port ${this.port}`);
      logger.info(`Health endpoints available at:`);
      logger.info(`  - http://localhost:${this.port}/health`);
      logger.info(`  - http://localhost:${this.port}/ready`);
      logger.info(`  - http://localhost:${this.port}/alive`);
      logger.info(`  - http://localhost:${this.port}/metrics`);
    });

    this.server.on('error', (error) => {
      logger.error('Health server error', { error: error.message });
    });
  }

  /**
   * Handle /health endpoint
   * Returns comprehensive health status
   */
  private async handleHealthCheck(res: http.ServerResponse): Promise<void> {
    const result = await this.healthCheck.check();

    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result, null, 2));
  }

  /**
   * Handle /ready endpoint (Kubernetes readiness probe)
   * Returns 200 if ready to serve traffic, 503 otherwise
   */
  private async handleReadinessCheck(res: http.ServerResponse): Promise<void> {
    const isReady = await this.healthCheck.isReady();

    if (isReady) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ready' }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'not ready' }));
    }
  }

  /**
   * Handle /alive endpoint (Kubernetes liveness probe)
   * Returns 200 if server is alive
   */
  private async handleLivenessCheck(res: http.ServerResponse): Promise<void> {
    const isAlive = await this.healthCheck.isAlive();

    if (isAlive) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'alive' }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'dead' }));
    }
  }

  /**
   * Handle /metrics endpoint
   * Returns basic metrics in Prometheus format
   */
  private async handleMetrics(res: http.ServerResponse): Promise<void> {
    const result = await this.healthCheck.check();

    // Simple Prometheus-style metrics
    const metrics = [
      '# HELP radar_ai_up Server uptime in seconds',
      '# TYPE radar_ai_up gauge',
      `radar_ai_up ${result.uptime}`,
      '',
      '# HELP radar_ai_service_health Service health status (1 = healthy, 0 = unhealthy)',
      '# TYPE radar_ai_service_health gauge',
      `radar_ai_service_health{service="redis"} ${result.services.redis.status === 'healthy' ? 1 : 0}`,
      `radar_ai_service_health{service="mongodb"} ${result.services.mongodb.status === 'healthy' ? 1 : 0}`,
      `radar_ai_service_health{service="websocket"} ${result.services.websocket.status === 'healthy' ? 1 : 0}`,
      '',
      '# HELP radar_ai_service_latency_ms Service latency in milliseconds',
      '# TYPE radar_ai_service_latency_ms gauge',
      `radar_ai_service_latency_ms{service="redis"} ${result.services.redis.latency || 0}`,
      `radar_ai_service_latency_ms{service="mongodb"} ${result.services.mongodb.latency || 0}`,
      '',
    ].join('\n');

    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    res.end(metrics);
  }

  /**
   * Stop the health check server
   */
  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server!.close((error) => {
          if (error) {
            logger.error('Error closing health server', { error });
            reject(error);
          } else {
            logger.info('Health server closed');
            this.server = null;
            resolve();
          }
        });
      });
    }
  }

  /**
   * Get the port the server is listening on
   */
  public getPort(): number {
    return this.port;
  }
}
