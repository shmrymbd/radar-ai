export interface CameraConfig {
  id: string;
  name: string;
  rtspUrl: string;
  username?: string;
  password?: string;
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  bitrate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  status?: CameraStatus;
}

export interface CameraStatus {
  id: string;
  isConnected: boolean;
  lastConnected?: Date;
  lastError?: string;
  streamUrl?: string;
  webrtcUrl?: string;
}

export interface VideoStream {
  cameraId: string;
  streamId: string;
  isActive: boolean;
  startTime: Date;
  viewerCount: number;
}

export interface VideoRecording {
  id: string;
  cameraId: string;
  filename: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  size: number;
  path: string;
}

export interface CameraTestResult {
  success: boolean;
  error?: string;
  latency?: number;
  resolution?: {
    width: number;
    height: number;
  };
  frameRate?: number;
}

export interface WebRTCSignaling {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
  cameraId: string;
  streamId: string;
}
