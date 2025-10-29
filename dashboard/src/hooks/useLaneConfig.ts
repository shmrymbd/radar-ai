/**
 * Hook for managing lane configurations
 */

import { useState, useEffect, useCallback } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import { DeviceLaneConfig } from '@/types/lane-config';

export function useLaneConfig() {
  const { selectedDevice } = useDevice();
  const [laneConfig, setLaneConfig] = useState<DeviceLaneConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLaneConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/lane-config?device=${selectedDevice.id}`);
      const result = await response.json();

      if (result.success && result.data) {
        setLaneConfig(result.data);
      } else {
        setLaneConfig(null);
      }
    } catch (error) {
      console.error('Error fetching lane config:', error);
      setLaneConfig(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice.id]);

  useEffect(() => {
    fetchLaneConfig();
  }, [fetchLaneConfig]);

  /**
   * Get custom name for a lane, or fallback to "Lane {number}"
   */
  const getLaneName = useCallback((laneNumber: number): string => {
    if (laneConfig) {
      const lane = laneConfig.lanes.find(l => l.laneNumber === laneNumber);
      if (lane && lane.customName) {
        return lane.customName;
      }
    }
    return `Lane ${laneNumber}`;
  }, [laneConfig]);

  /**
   * Check if a lane is enabled
   */
  const isLaneEnabled = useCallback((laneNumber: number): boolean => {
    if (laneConfig) {
      const lane = laneConfig.lanes.find(l => l.laneNumber === laneNumber);
      if (lane) {
        return lane.enabled;
      }
    }
    return true; // Default to enabled
  }, [laneConfig]);

  return {
    laneConfig,
    loading,
    getLaneName,
    isLaneEnabled,
    refetch: fetchLaneConfig
  };
}
