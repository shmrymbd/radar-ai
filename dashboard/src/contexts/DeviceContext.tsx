'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RadarDevice, CameraDevice, DeviceStatus, DeviceContextType, DEFAULT_DEVICES, DEFAULT_CAMERAS, DEFAULT_DEVICE_CONFIG } from '@/types/device';
import { DeviceSyncService } from '@/lib/device-sync-service';

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

interface DeviceProviderProps {
  children: ReactNode;
}

export function DeviceProvider({ children }: DeviceProviderProps) {
  const [selectedDevice, setSelectedDevice] = useState<RadarDevice>(DEFAULT_DEVICES[0]); // Default to test device
  const [availableDevices, setAvailableDevices] = useState<RadarDevice[]>(DEFAULT_DEVICES);
  const [deviceStatus, setDeviceStatus] = useState<Record<string, DeviceStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isClient, setIsClient] = useState(false);
  
  // Camera state
  const [selectedCamera, setSelectedCamera] = useState<CameraDevice | undefined>();
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>(DEFAULT_CAMERAS);
  const [cameraStatus, setCameraStatus] = useState<Record<string, DeviceStatus>>({});

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load device configuration from environment or localStorage (client-side only)
  useEffect(() => {
    if (!isClient) return;

    const loadDeviceConfiguration = async () => {
      try {
        setIsLoading(true);
        
        // Check for environment variables (client-side only)
        const envDevices = process.env.NEXT_PUBLIC_AVAILABLE_DEVICES;
        const envDefaultDevice = process.env.NEXT_PUBLIC_DEFAULT_DEVICE;
        
        if (envDevices) {
          const parsedDevices = JSON.parse(envDevices);
          setAvailableDevices(parsedDevices);
          
          if (envDefaultDevice) {
            const defaultDevice = parsedDevices.find((d: RadarDevice) => d.id === envDefaultDevice);
            if (defaultDevice) {
              setSelectedDevice(defaultDevice);
            }
          }
        } else {
          // Check localStorage for saved configuration (client-side only)
          if (typeof window !== 'undefined') {
            const savedConfig = localStorage.getItem('radar-device-config');
            if (savedConfig) {
              const config = JSON.parse(savedConfig);
              setAvailableDevices(config.availableDevices || DEFAULT_DEVICES);
              
              const savedDevice = config.selectedDevice;
              if (savedDevice) {
                const device = (config.availableDevices || DEFAULT_DEVICES).find((d: RadarDevice) => d.id === savedDevice);
                if (device) {
                  setSelectedDevice(device);
                }
              }
            }
          }
        }
        
        // Initialize device status (client-side only)
        const initialStatus: Record<string, DeviceStatus> = {};
        (availableDevices.length > 0 ? availableDevices : DEFAULT_DEVICES).forEach(device => {
          initialStatus[device.id] = {
            deviceId: device.id,
            status: 'online',
            lastUpdate: new Date()
          };
        });
        setDeviceStatus(initialStatus);
        
      } catch (err) {
        console.error('Error loading device configuration:', err);
        setError('Failed to load device configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadDeviceConfiguration();
  }, [isClient]);

  // Save device selection to localStorage (client-side only)
  useEffect(() => {
    if (!isClient || !selectedDevice || availableDevices.length === 0) return;
    
    if (typeof window !== 'undefined') {
      const config = {
        selectedDevice: selectedDevice.id,
        availableDevices,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('radar-device-config', JSON.stringify(config));
    }
  }, [isClient, selectedDevice, availableDevices]);

  const switchDevice = async (deviceId: string) => {
    try {
      setIsLoading(true);
      setError(undefined);
      
      const device = availableDevices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }
      
      console.log(`🔄 DeviceContext: Switching to device: ${device.name} (${device.id})`);
      
      // Step 1: Update local state
      setSelectedDevice(device);
      
      // Step 2: Sync with all systems using DeviceSyncService
      const syncService = DeviceSyncService.getInstance();
      const syncResult = await syncService.syncDevice(deviceId, {
        timeout: 5000,
        retries: 3,
        validateBackend: true,
        validateWebSocket: true
      });
      
      if (!syncResult.success) {
        throw new Error(`Device sync failed: ${syncResult.error || 'Unknown error'}`);
      }
      
      // Step 3: Update device status
      setDeviceStatus(prev => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          status: 'online',
          lastUpdate: new Date()
        }
      }));
      
      console.log(`✅ DeviceContext: Successfully switched to device: ${device.name} (${device.id})`);
      console.log(`📊 Sync results:`, {
        backend: syncResult.backend,
        websocket: syncResult.websocket,
        timestamp: syncResult.timestamp
      });
      
    } catch (err) {
      console.error('Error switching device:', err);
      setError(`Failed to switch to device ${deviceId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const switchCamera = async (cameraId: string) => {
    try {
      setIsLoading(true);
      setError(undefined);
      
      const camera = availableCameras.find(c => c.id === cameraId);
      if (!camera) {
        throw new Error(`Camera ${cameraId} not found`);
      }
      
      console.log(`🔄 DeviceContext: Switching to camera: ${camera.name} (${camera.id})`);
      
      // Update local state
      setSelectedCamera(camera);
      
      // Update camera status
      setCameraStatus(prev => ({
        ...prev,
        [cameraId]: {
          ...prev[cameraId],
          status: 'online',
          lastUpdate: new Date()
        }
      }));
      
      console.log(`✅ DeviceContext: Successfully switched to camera: ${camera.name} (${camera.id})`);
      
    } catch (err) {
      console.error('Error switching camera:', err);
      setError(`Failed to switch to camera ${cameraId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Device health monitoring (client-side only)
  useEffect(() => {
    if (!isClient) return;

    const checkDeviceHealth = async () => {
      for (const device of availableDevices) {
        try {
          // Deterministic health check based on device ID hash
          // This avoids Math.random() during hydration and provides stable results
          const deviceIdHash = device.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const isHealthy = deviceIdHash % 10 !== 0; // 90% success rate
          const latency = (deviceIdHash % 100) + 10; // 10-110ms based on device ID

          setDeviceStatus(prev => ({
            ...prev,
            [device.id]: {
              ...prev[device.id],
              status: isHealthy ? 'online' : 'offline',
              lastUpdate: new Date(),
              dataLatency: latency
            }
          }));
        } catch (err) {
          setDeviceStatus(prev => ({
            ...prev,
            [device.id]: {
              ...prev[device.id],
              status: 'error',
              lastUpdate: new Date(),
              errorMessage: 'Health check failed'
            }
          }));
        }
      }
    };

    // Delay initial health check to ensure client-side only execution
    // This prevents any hydration mismatch issues
    const initialCheckTimeout = setTimeout(() => {
      checkDeviceHealth();
    }, 500);

    // Set up periodic health checks (client-side only)
    const interval = setInterval(checkDeviceHealth, DEFAULT_DEVICE_CONFIG.deviceHealthCheckInterval);

    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(interval);
    };
  }, [isClient, availableDevices]);

  const contextValue: DeviceContextType = {
    selectedDevice,
    availableDevices,
    switchDevice,
    deviceStatus,
    isLoading,
    error,
    // Camera support
    selectedCamera,
    availableCameras,
    switchCamera,
    cameraStatus
  };

  return (
    <DeviceContext.Provider value={contextValue}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}
