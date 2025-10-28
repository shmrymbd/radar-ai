'use client';

import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { useDevice } from './DeviceContext';

export interface VehiclePosition {
  targetId: string;
  x: number;
  y: number;
  speed: number;
  vehicleType?: string;
  laneNo?: number;
  timestamp: Date;
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
  const vehiclesRef = useRef<VehiclePosition[]>([]);
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

  // Poll lane status data every 3 seconds
  useEffect(() => {
    const fetchLaneStatus = async () => {
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
                    vehicles: entry.queue?.vehicles || 0
                  },
                  occupancy: {
                    space: entry.occupancy?.space || 0,
                    time: entry.occupancy?.time || 0
                  },
                  speed: {
                    average: entry.speed?.average || 0,
                    percentile85: entry.speed?.percentile85 || 0
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
        }
      } catch (error) {
        console.error('Error fetching lane status:', error);
      }
    };

    // Fetch immediately on mount
    fetchLaneStatus();

    // Set up polling interval
    const interval = setInterval(fetchLaneStatus, 3000);

    return () => clearInterval(interval);
  }, [selectedDevice.id]);

  const value: ControlCenterContextType = {
    vehiclesRef,
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
