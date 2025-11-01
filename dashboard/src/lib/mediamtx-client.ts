/**
 * MediaMTX Client for WebRTC Streaming
 * Provides ultra-low latency video streaming from RTSP cameras
 */

export interface MediaMTXConfig {
  apiUrl: string;
  webrtcUrl: string;
  iceServers?: RTCIceServer[];
}

export interface WebRTCStream {
  cameraId: string;
  pathName: string;
  peerConnection: RTCPeerConnection;
  isConnected: boolean;
  startTime: Date;
}

export class MediaMTXClient {
  private static instance: MediaMTXClient;
  private config: MediaMTXConfig;
  private streams: Map<string, WebRTCStream> = new Map();

  private constructor(config?: Partial<MediaMTXConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || 'http://localhost:9997',
      webrtcUrl: config?.webrtcUrl || 'http://localhost:8889',
      iceServers: config?.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  public static getInstance(config?: Partial<MediaMTXConfig>): MediaMTXClient {
    if (!MediaMTXClient.instance) {
      MediaMTXClient.instance = new MediaMTXClient(config);
    }
    return MediaMTXClient.instance;
  }

  /**
   * Add a camera stream to MediaMTX (register RTSP source)
   */
  public async addCamera(cameraId: string, rtspUrl: string): Promise<boolean> {
    try {
      const pathName = `camera_${cameraId}`;

      const response = await fetch(`${this.config.apiUrl}/v3/config/paths/add/${pathName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: rtspUrl,
          sourceProtocol: 'tcp',
          sourceOnDemand: true,
          runOnDemandRestart: true
        })
      });

      if (!response.ok) {
        // Path might already exist, check if it's the same source
        const existingPath = await this.getPath(pathName);
        if (existingPath && existingPath.source === rtspUrl) {
          console.log(`Camera ${cameraId} already registered in MediaMTX`);
          return true;
        }
        throw new Error(`Failed to add camera: ${response.statusText}`);
      }

      console.log(`✅ Camera ${cameraId} registered in MediaMTX at path: ${pathName}`);
      return true;
    } catch (error) {
      console.error(`Error adding camera ${cameraId}:`, error);
      return false;
    }
  }

  /**
   * Get path configuration from MediaMTX
   */
  private async getPath(pathName: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.apiUrl}/v3/config/paths/get/${pathName}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Start WebRTC stream for a camera
   */
  public async startStream(
    cameraId: string,
    videoElement: HTMLVideoElement,
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  ): Promise<boolean> {
    try {
      // Check if stream already exists
      if (this.streams.has(cameraId)) {
        console.log(`Stream for camera ${cameraId} already exists`);
        return true;
      }

      const pathName = `camera_${cameraId}`;
      console.log(`🎥 Starting WebRTC stream for camera ${cameraId} (path: ${pathName})`);

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: this.config.iceServers
      });

      // Store stream info
      const stream: WebRTCStream = {
        cameraId,
        pathName,
        peerConnection: pc,
        isConnected: false,
        startTime: new Date()
      };

      this.streams.set(cameraId, stream);

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`WebRTC connection state for ${cameraId}: ${pc.connectionState}`);
        stream.isConnected = pc.connectionState === 'connected';
        onConnectionStateChange?.(pc.connectionState);

        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          this.stopStream(cameraId);
        }
      };

      // Handle incoming tracks (video/audio)
      pc.ontrack = (event) => {
        console.log(`✅ Received track for ${cameraId}:`, event.track.kind);

        if (event.streams && event.streams[0]) {
          videoElement.srcObject = event.streams[0];
          videoElement.play().catch(err => {
            console.warn('Autoplay blocked, user interaction required:', err);
          });
        }
      };

      // Handle ICE candidate errors
      pc.onicecandidateerror = (event) => {
        console.warn(`ICE candidate error for ${cameraId}:`, event);
      };

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false // Traffic cameras typically don't have audio
      });

      await pc.setLocalDescription(offer);

      // Send offer to MediaMTX via WHEP protocol
      const whepUrl = `${this.config.webrtcUrl}/${pathName}/whep`;
      console.log(`📡 Sending WHEP offer to: ${whepUrl}`);

      const response = await fetch(whepUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      });

      if (!response.ok) {
        throw new Error(`WHEP request failed: ${response.status} ${response.statusText}`);
      }

      // Get answer from MediaMTX
      const answerSdp = await response.text();
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp
      };

      await pc.setRemoteDescription(answer);

      console.log(`✅ WebRTC stream started for camera ${cameraId}`);
      return true;

    } catch (error) {
      console.error(`Error starting WebRTC stream for ${cameraId}:`, error);
      this.stopStream(cameraId);
      return false;
    }
  }

  /**
   * Stop WebRTC stream for a camera
   */
  public stopStream(cameraId: string): void {
    const stream = this.streams.get(cameraId);
    if (stream) {
      console.log(`🛑 Stopping WebRTC stream for camera ${cameraId}`);
      stream.peerConnection.close();
      this.streams.delete(cameraId);
    }
  }

  /**
   * Get stream status
   */
  public getStreamStatus(cameraId: string): RTCPeerConnectionState | null {
    const stream = this.streams.get(cameraId);
    return stream ? stream.peerConnection.connectionState : null;
  }

  /**
   * Check if MediaMTX is available
   */
  public async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/v3/config/global/get`, {
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch (error) {
      console.warn('MediaMTX not available:', error);
      return false;
    }
  }

  /**
   * Get all active streams
   */
  public getActiveStreams(): WebRTCStream[] {
    return Array.from(this.streams.values()).filter(s => s.isConnected);
  }

  /**
   * Stop all streams
   */
  public stopAllStreams(): void {
    console.log('🛑 Stopping all WebRTC streams');
    for (const cameraId of this.streams.keys()) {
      this.stopStream(cameraId);
    }
  }
}

// Export singleton instance
export const mediamtxClient = MediaMTXClient.getInstance();
export default MediaMTXClient;
