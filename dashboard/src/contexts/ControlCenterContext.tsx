'use client';

import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { useDevice } from './DeviceContext';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';

export interface VehiclePosition {
  targetId: string;
  x: number;
  y: number;
  speed: number;
  vehicleType?: string;
  laneNo?: number;
  timestamp: Date;
  length?: number;
  width?: number;
  height?: number;
  xSpeed?: number;
  ySpeed?: number;
  acceleration?: number;
}

export interface LaneStatusData {
  lane: {
    number: number;
    status: number;
  };
  queue: {
    length: number;
    vehicles: number;
  };
  occupancy: {
    space: number;
    time: number;
  };
  speed: {
    average: number;
    percentile85: number;
  };
  flow: {
    rate: number;
  };
  timestamp: Date;
}

interface ControlCenterContextType {
  vehiclesRef: React.MutableRefObject<VehiclePosition[]>;
  vehicles: VehiclePosition[];
  laneStatus: LaneStatusData[];
  selectedCamera: string;
  setSelectedCamera: (cameraId: string) => void;
  showVideoOverlay: boolean;
  setShowVideoOverlay: (show: boolean) => void;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  lastLaneUpdate: Date | null;
}

const ControlCenterContext = createContext<ControlCenterContextType | undefined>(undefined);

export function useControlCenter() {
  const context = useContext(ControlCenterContext);
  if (!context) {
    throw new Error('useControlCenter must be used within ControlCenterProvider');
  }
  return context;
}

interface ControlCenterProviderProps {
  children: ReactNode;
}

export function ControlCenterProvider({ children }: ControlCenterProviderProps) {
  const { selectedDevice } = useDevice();
  const { ws, connectionStatus, subscribeToChannel } = useUnifiedWebSocket();
  const vehiclesRef = useRef<VehiclePosition[]>([]);
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [laneStatus, setLaneStatus] = useState<LaneStatusData[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [showVideoOverlay, setShowVideoOverlay] = useState<boolean>(() => {
    // Load from localStorage on client side only
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('controlCenterOverlay');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [lastLaneUpdate, setLastLaneUpdate] = useState<Date | null>(null);

  // Save overlay preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('controlCenterOverlay', JSON.stringify(showVideoOverlay));
    }
  }, [showVideoOverlay]);

  // Subscribe to dashboard and tracking channels when WebSocket is connected
  useEffect(() => {
    if (ws && connectionStatus === 'connected') {
      console.log('📡 Control Center: Subscribing to dashboard and tracking channels...');
      subscribeToChannel('dashboard');
      subscribeToChannel('tracking');
    }
  }, [ws, connectionStatus, subscribeToChannel]);

  // Handle WebSocket messages for real-time lane status and tracking updates
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Process dashboard data (lane status) for the current device
        if ((data.type === 'dashboard_data' || data.type === 'dashboard_update') &&
            data.deviceId === selectedDevice.id &&
            data.data?.laneStatus) {

          // Process lane status data from WebSocket
          const processedData: LaneStatusData[] = [];
          const laneStatusData = data.data.laneStatus;

          if (laneStatusData.entries && Array.isArray(laneStatusData.entries)) {
            laneStatusData.entries.forEach((entry: any, index: number) => {

              processedData.push({
                lane: {
                  number: entry.lane?.number || 0,
                  status: entry.lane?.status || 0
                },
                queue: {
                  length: entry.queue?.length || 0,
                  vehicles: entry.queue?.vehicleCount || entry.queue?.vehicles || 0
                },
                occupancy: {
                  space: entry.spaceOccupancyRate || 0,  // Redis has spaceOccupancyRate at entry level
                  time: 0  // Time occupancy not available in Redis data
                },
                speed: {
                  average: entry.speeds?.average || 0,
                  percentile85: entry.speeds?.percentile85 || 0
                },
                flow: {
                  rate: entry.flow?.rate || 0
                },
                timestamp: new Date()
              });
            });
          }

          setLaneStatus(processedData);
          setLastLaneUpdate(new Date());
          console.log('✅ Control Center: Updated lane status via WebSocket');
        }

        // Process tracking data (vehicle positions)
        if ((data.type === 'tracking_data' || data.type === 'tracking_update') &&
            data.deviceId === selectedDevice.id &&
            data.data?.vehicles) {

          const incomingVehicles: VehiclePosition[] = data.data.vehicles.map((v: any) => ({
            targetId: v.targetId,
            x: v.x,
            y: v.y,
            speed: v.speed,
            vehicleType: v.vehicleType,
            laneNo: v.laneNo,
            timestamp: new Date(),
            length: v.length || 4.5,
            width: v.width || 1.8,
            height: v.height || 1.5,
            xSpeed: v.xSpeed || 0,
            ySpeed: v.ySpeed || 0,
            acceleration: v.acceleration || 0
          }));

          setVehicles(incomingVehicles);
          vehiclesRef.current = incomingVehicles;
          console.log(`✅ Control Center: Updated ${incomingVehicles.length} vehicles via WebSocket`);
        }
      } catch (error) {
        console.error('❌ Control Center: Error parsing WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, selectedDevice.id]);

  // Poll lane status data every 5 seconds (fallback when WebSocket disconnected)
  useEffect(() => {
    const fetchLaneStatus = async () => {
      // Only fetch via API if WebSocket is disconnected or unavailable
      if (connectionStatus === 'connected' && ws?.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        const response = await fetch(`/api/lanes?device=${selectedDevice.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch lane status');
        }
        const data = await response.json();

        if (data.success && data.data) {
          // Process lane status data from API
          const processedData: LaneStatusData[] = [];

          // API returns array of lane status objects, use only the most recent (first item)
          if (Array.isArray(data.data) && data.data.length > 0) {
            const latestStatus = data.data[0]; // Get only the most recent status

            if (latestStatus.entries && Array.isArray(latestStatus.entries)) {
              latestStatus.entries.forEach((entry: any) => {
                processedData.push({
                  lane: {
                    number: entry.lane?.number || 0,
                    status: entry.lane?.status || 0
                  },
                  queue: {
                    length: entry.queue?.length || 0,
                    vehicles: entry.queue?.vehicleCount || entry.queue?.vehicles || 0
                  },
                  occupancy: {
                    space: entry.spaceOccupancyRate || 0,  // Redis has spaceOccupancyRate at entry level
                    time: 0  // Time occupancy not available in Redis data
                  },
                  speed: {
                    average: entry.speeds?.average || 0,
                    percentile85: entry.speeds?.percentile85 || 0
                  },
                  flow: {
                    rate: entry.flow?.rate || 0
                  },
                  timestamp: new Date()
                });
              });
            }
          }

          setLaneStatus(processedData);
          setLastLaneUpdate(new Date());
          console.log('✅ Control Center: Updated lane status via API (fallback)');
        }
      } catch (error) {
        console.error('❌ Control Center: Error fetching lane status:', error);
      }
    };

    // Fetch immediately on mount
    fetchLaneStatus();

    // Set up polling interval (only runs when WebSocket disconnected)
    const interval = setInterval(fetchLaneStatus, 5000);

    return () => clearInterval(interval);
  }, [selectedDevice.id, connectionStatus, ws]);

  const value: ControlCenterContextType = {
    vehiclesRef,
    vehicles,
    laneStatus,
    selectedCamera,
    setSelectedCamera,
    showVideoOverlay,
    setShowVideoOverlay,
    selectedVehicleId,
    setSelectedVehicleId,
    lastLaneUpdate
  };

  return (
    <ControlCenterContext.Provider value={value}>
      {children}
    </ControlCenterContext.Provider>
  );
}
