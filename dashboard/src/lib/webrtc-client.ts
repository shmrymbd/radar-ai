import { WebRTCSignaling } from '@/types/camera';

export interface WebRTCConnection {
  peerConnection: RTCPeerConnection;
  streamId: string;
  cameraId: string;
  isConnected: boolean;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: string) => void;
}

export class WebRTCClient {
  private connections: Map<string, WebRTCConnection> = new Map();
  private signalingServerUrl: string;

  constructor(signalingServerUrl: string = 'http://localhost:8083') {
    this.signalingServerUrl = signalingServerUrl;
  }

  /**
   * Create a new WebRTC connection for a camera
   */
  async createConnection(cameraId: string, streamId: string): Promise<WebRTCConnection> {
    const connectionKey = `${cameraId}_${streamId}`;
    
    // Check if connection already exists
    if (this.connections.has(connectionKey)) {
      return this.connections.get(connectionKey)!;
    }

    // Create RTCPeerConnection
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Set up connection state monitoring
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`WebRTC connection state for ${cameraId}: ${state}`);
      
      const connection = this.connections.get(connectionKey);
      if (connection) {
        connection.isConnected = state === 'connected';
        connection.onConnectionStateChange?.(state);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          data: event.candidate,
          cameraId,
          streamId
        });
      }
    };

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      console.log(`Received track for ${cameraId}:`, event.track);
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${cameraId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        const connection = this.connections.get(connectionKey);
        connection?.onError?.(`WebRTC connection failed`);
      }
    };

    const connection: WebRTCConnection = {
      peerConnection,
      streamId,
      cameraId,
      isConnected: false
    };

    this.connections.set(connectionKey, connection);
    return connection;
  }

  /**
   * Start a video stream for a camera
   */
  async startStream(cameraId: string, rtspUrl: string, username?: string, password?: string): Promise<string> {
    try {
      // Create stream on RTSPtoWebRTC service
      const response = await fetch(`${this.signalingServerUrl}/api/stream/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: `stream_${cameraId}_${Date.now()}`,
          url: rtspUrl,
          username,
          password,
          options: {
            video: true,
            audio: false,
            width: 1920,
            height: 1080,
            fps: 30
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start stream: ${response.statusText}`);
      }

      const streamData = await response.json();
      const streamId = streamData.id;

      // Create WebRTC connection
      const connection = await this.createConnection(cameraId, streamId);

      // Create offer
      const offer = await connection.peerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false
      });

      await connection.peerConnection.setLocalDescription(offer);

      // Send offer to signaling server
      await this.sendSignalingMessage({
        type: 'offer',
        data: offer,
        cameraId,
        streamId
      });

      return streamId;

    } catch (error) {
      console.error('Error starting stream:', error);
      throw error;
    }
  }

  /**
   * Stop a video stream
   */
  async stopStream(cameraId: string, streamId: string): Promise<void> {
    try {
      // Stop stream on RTSPtoWebRTC service
      await fetch(`${this.signalingServerUrl}/api/stream/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: streamId
        })
      });

      // Close WebRTC connection
      const connectionKey = `${cameraId}_${streamId}`;
      const connection = this.connections.get(connectionKey);
      
      if (connection) {
        connection.peerConnection.close();
        this.connections.delete(connectionKey);
      }

    } catch (error) {
      console.error('Error stopping stream:', error);
      throw error;
    }
  }

  /**
   * Send signaling message to server
   */
  private async sendSignalingMessage(message: WebRTCSignaling): Promise<void> {
    try {
      await fetch(`${this.signalingServerUrl}/api/signaling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('Error sending signaling message:', error);
      throw error;
    }
  }

  /**
   * Handle incoming signaling message
   */
  async handleSignalingMessage(message: WebRTCSignaling): Promise<void> {
    const connectionKey = `${message.cameraId}_${message.streamId}`;
    const connection = this.connections.get(connectionKey);

    if (!connection) {
      console.warn(`No connection found for ${connectionKey}`);
      return;
    }

    try {
      switch (message.type) {
        case 'answer':
          await connection.peerConnection.setRemoteDescription(message.data);
          break;
        
        case 'ice-candidate':
          await connection.peerConnection.addIceCandidate(message.data);
          break;
        
        default:
          console.warn(`Unknown signaling message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      connection.onError?.(`Signaling error: ${error}`);
    }
  }

  /**
   * Get connection status for a camera
   */
  getConnectionStatus(cameraId: string, streamId: string): RTCPeerConnectionState | null {
    const connectionKey = `${cameraId}_${streamId}`;
    const connection = this.connections.get(connectionKey);
    return connection?.peerConnection.connectionState || null;
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): WebRTCConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.isConnected);
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    for (const connection of this.connections.values()) {
      connection.peerConnection.close();
    }
    this.connections.clear();
  }

  /**
   * Test connection to signaling server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.signalingServerUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const webrtcClient = new WebRTCClient();
