/**
 * WebSocket Classification Handler
 * Handles vehicle classification real-time updates
 */

import { WebSocket } from 'ws';
import { PassDataMongoDBService } from '../../services/mongodb/passdata';
import { RedisPubSubService } from '../../services/redis/pubsub';
import { createLogger } from '../../utils/logger';

const logger = createLogger('classification-handler');

export class ClassificationHandler {
  private mongoService: PassDataMongoDBService;
  private redisPubSub: RedisPubSubService;

  constructor() {
    this.mongoService = PassDataMongoDBService.getInstance();
    this.redisPubSub = RedisPubSubService.getInstance();
  }

  /**
   * Initialize classification handler with MongoDB indexes
   */
  public async initialize(): Promise<void> {
    try {
      await this.mongoService.initialize();
      logger.info('Classification handler initialized with MongoDB indexes');
    } catch (error) {
      logger.error('Failed to initialize classification handler', { error });
    }
  }

  /**
   * Handle get classification data request
   */
  public async handleGetClassificationData(
    ws: WebSocket,
    deviceId: string,
    sendMessage: (ws: WebSocket, message: any) => void
  ): Promise<void> {
    try {
      const metrics = await this.mongoService.getClassificationMetrics(deviceId);
      const summary = await this.mongoService.getClassificationSummary(deviceId);

      sendMessage(ws, {
        type: 'classification_data',
        data: {
          metrics,
          summary,
          deviceId,
          timestamp: new Date().toISOString(),
          source: 'mongodb',
        },
      });
    } catch (error) {
      logger.error('Error sending classification data', { deviceId, error });
      sendMessage(ws, {
        type: 'error',
        message: 'Failed to get classification data',
      });
    }
  }

  /**
   * Register callback for PassData updates
   */
  public onPassDataUpdate(
    callback: (deviceId: string, data: any, metrics: any, summary: any) => void
  ): void {
    this.redisPubSub.onMessage(async (deviceId, data) => {
      try {
        logger.debug('PassData received for classification', {
          deviceId,
          numEntries: data.entries?.length || 0,
        });

        // Fetch updated metrics immediately after PassData arrives
        const metrics = await this.mongoService.getClassificationMetrics(deviceId);
        const summary = await this.mongoService.getClassificationSummary(deviceId);

        // Invoke callback
        callback(deviceId, data, metrics, summary);
      } catch (error) {
        logger.error('Error processing PassData for classification', { deviceId, error });
      }
    });
  }
}
