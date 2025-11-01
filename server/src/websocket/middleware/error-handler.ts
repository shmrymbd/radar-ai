/**
 * WebSocket Error Handling Middleware
 * Centralized error handling for WebSocket connections
 */

import { WebSocket } from 'ws';
import { createLogger } from '../../utils/logger';

const logger = createLogger('websocket-error');

export class ErrorHandler {
  /**
   * Handle WebSocket connection errors
   */
  public handleConnectionError(ws: WebSocket, error: Error): void {
    logger.error('WebSocket connection error', {
      error: error.message,
      stack: error.stack,
    });

    // Send error message to client if connection is open
    if (ws.readyState === WebSocket.OPEN) {
      this.sendError(ws, 'Connection error occurred', 'connection_error');
    }
  }

  /**
   * Handle message parsing errors
   */
  public handleParseError(ws: WebSocket, error: Error): void {
    logger.warn('Message parse error', {
      error: error.message,
    });

    this.sendError(ws, 'Invalid JSON format', 'parse_error');
  }

  /**
   * Handle validation errors
   */
  public handleValidationError(ws: WebSocket, errorMessage: string): void {
    logger.warn('Message validation error', {
      error: errorMessage,
    });

    this.sendError(ws, `Invalid message format: ${errorMessage}`, 'validation_error');
  }

  /**
   * Handle rate limit errors
   */
  public handleRateLimitError(ws: WebSocket): void {
    this.sendError(ws, 'Rate limit exceeded. Maximum 100 messages per minute.', 'rate_limit_exceeded');
  }

  /**
   * Handle general processing errors
   */
  public handleProcessingError(ws: WebSocket, error: Error, context?: string): void {
    logger.error('Message processing error', {
      context,
      error: error.message,
      stack: error.stack,
    });

    this.sendError(ws, 'Error processing request', 'processing_error');
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, message: string, code: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(
          JSON.stringify({
            type: 'error',
            message,
            code,
            timestamp: new Date().toISOString(),
          })
        );
      } catch (err) {
        logger.error('Failed to send error message to client', {
          originalMessage: message,
          sendError: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}
