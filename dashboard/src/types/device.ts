// Radar Device Types for Multi-Device Support

export interface RadarDevice {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'test';
  redisPrefix: string;
  websocketPort?: number;
  lastSeen?: Date;
  dataQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CameraDevice {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'test';
  rtspUrl: string;
  username?: string;
  password?: string;
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  bitrate: number;
  lastSeen?: Date;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}

export type Device = RadarDevice | CameraDevice;

export interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'error';
  lastUpdate: Date;
  dataLatency?: number;
  errorMessage?: string;
}

export interface DeviceConfiguration {
  defaultDevice: string;
  availableDevices: RadarDevice[];
  autoSwitchOnFailure: boolean;
  deviceHealthCheckInterval: number;
}

export interface DeviceContextType {
  selectedDevice: RadarDevice;
  availableDevices: RadarDevice[];
  switchDevice: (deviceId: string) => void;
  deviceStatus: Record<string, DeviceStatus>;
  isLoading: boolean;
  error?: string;
  // Camera support
  selectedCamera?: CameraDevice;
  availableCameras: CameraDevice[];
  switchCamera: (cameraId: string) => void;
  cameraStatus: Record<string, DeviceStatus>;
}

// Default device configurations
export const DEFAULT_DEVICES: RadarDevice[] = [
  {
    id: 'test',
    name: 'Test Device',
    description: 'Simulated radar data for testing',
    status: 'test',
    redisPrefix: 'test',
    dataQuality: 'excellent'
  },
  {
    id: 'Radar04',
    name: 'Radar04',
    description: 'Production radar system',
    status: 'active',
    redisPrefix: 'Radar04',
    dataQuality: 'good'
  }
];

export const DEFAULT_CAMERAS: CameraDevice[] = [
  {
    id: 'camera-test',
    name: 'Test Camera',
    description: 'Simulated camera for testing',
    status: 'test',
    rtspUrl: 'rtsp://test.example.com:554/stream',
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    bitrate: 2000000,
    connectionQuality: 'excellent'
  }
];

export const DEFAULT_DEVICE_CONFIG: DeviceConfiguration = {
  defaultDevice: 'test',
  availableDevices: DEFAULT_DEVICES,
  autoSwitchOnFailure: true,
  deviceHealthCheckInterval: 5000 // 5 seconds - more reasonable for health checks
};
