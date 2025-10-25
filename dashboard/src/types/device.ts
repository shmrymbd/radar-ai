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

export const DEFAULT_DEVICE_CONFIG: DeviceConfiguration = {
  defaultDevice: 'test',
  availableDevices: DEFAULT_DEVICES,
  autoSwitchOnFailure: true,
  deviceHealthCheckInterval: 5000 // 5 seconds - more reasonable for health checks
};
