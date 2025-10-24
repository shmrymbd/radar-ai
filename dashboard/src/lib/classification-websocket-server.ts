import { WebSocketServer, WebSocket } from 'ws';
import { ClassificationProcessor } from './classification-processor';
import { ClassificationMetrics, ClassificationSummary } from '@/types/classification';

export class ClassificationWebSocketServer {
  private static instance: ClassificationWebSocketServer;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private classificationProcessor: ClassificationProcessor;
  private updateInterval: NodeJS.Timeout | null = null;

  public static getInstance(): ClassificationWebSocketServer {
    if (!ClassificationWebSocketServer.instance) {
      ClassificationWebSocketServer.instance = new ClassificationWebSocketServer();
    }
    return ClassificationWebSocketServer.instance;
  }

  private constructor() {
    this.classificationProcessor = ClassificationProcessor.getInstance();
  }

  /**
   * Start the WebSocket server for classification updates
   */
  public start(port: number = 8081): void {
    if (this.wss) {
      console.log('Classification WebSocket server already running');
      return;
    }

    this.wss = new WebSocketServer({ port });
    console.log(`Classification WebSocket server started on port ${port}`);

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New classification client connected');
      this.clients.add(ws);

      // Send initial data
      this.sendClassificationData(ws);

      ws.on('close', () => {
        console.log('Classification client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('Classification WebSocket error:', error);
        this.clients.delete(ws);
      });

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Error parsing classification client message:', error);
        }
      });
    });

    // Start periodic updates
    this.startPeriodicUpdates();
  }

  /**
   * Stop the WebSocket server
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    console.log('Classification WebSocket server stopped');
  }

  /**
   * Broadcast classification updates to all connected clients
   */
  public broadcastClassificationUpdate(): void {
    if (this.clients.size === 0) return;

    const metrics = this.classificationProcessor.getClassificationMetrics();
    const summary = this.classificationProcessor.getClassificationSummary();

    const updateData = {
      type: 'classification_update',
      data: {
        metrics,
        summary,
        timestamp: new Date().toISOString()
      }
    };

    this.broadcast(updateData);
  }

  /**
   * Send classification data to a specific client
   */
  private sendClassificationData(ws: WebSocket): void {
    try {
      const metrics = this.classificationProcessor.getClassificationMetrics();
      const summary = this.classificationProcessor.getClassificationSummary();

      const data = {
        type: 'classification_data',
        data: {
          metrics,
          summary,
          timestamp: new Date().toISOString()
        }
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error sending classification data:', error);
    }
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'request_data':
        this.sendClassificationData(ws);
        break;
      
      case 'subscribe':
        console.log('Client subscribed to classification updates');
        break;
      
      case 'unsubscribe':
        console.log('Client unsubscribed from classification updates');
        break;
      
      case 'ping':
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
        break;
      
      default:
        console.log('Unknown classification message type:', message.type);
    }
  }

  /**
   * Broadcast data to all connected clients
   */
  private broadcast(data: any): void {
    const message = JSON.stringify(data);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error broadcasting to client:', error);
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    });
  }

  /**
   * Start periodic updates
   */
  private startPeriodicUpdates(): void {
    // Update every 5 seconds
    this.updateInterval = setInterval(() => {
      this.broadcastClassificationUpdate();
    }, 5000);
  }

  /**
   * Get server status
   */
  public getStatus(): { running: boolean; clients: number; port?: number } {
    return {
      running: this.wss !== null,
      clients: this.clients.size,
      port: this.wss ? this.wss.options.port : undefined
    };
  }

  /**
   * Get connected clients count
   */
  public getConnectedClients(): number {
    return this.clients.size;
  }
}
