'use client';

import { useState, useEffect } from 'react';
import { DeviceSyncService } from '@/lib/device-sync-service';

interface DeviceSyncStatusProps {
  deviceId: string;
  className?: string;
}

export default function DeviceSyncStatus({ deviceId, className = '' }: DeviceSyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<{
    backend: boolean | null;
    websocket: boolean | null;
    lastSync: string | null;
    isSyncing: boolean;
  }>({
    backend: null,
    websocket: null,
    lastSync: null,
    isSyncing: false
  });

  useEffect(() => {
    const syncService = DeviceSyncService.getInstance();
    
    // Check if sync is in progress
    const isSyncing = syncService.isSyncInProgress(deviceId);
    setSyncStatus(prev => ({ ...prev, isSyncing }));

    // Listen for sync events
    const handleDeviceChanged = (event: CustomEvent) => {
      if (event.detail.deviceId === deviceId) {
        setSyncStatus(prev => ({ 
          ...prev, 
          isSyncing: true,
          lastSync: new Date().toISOString()
        }));
      }
    };

    const handleWebSocketConfirmed = (event: CustomEvent) => {
      if (event.detail.deviceId === deviceId) {
        setSyncStatus(prev => ({ 
          ...prev, 
          websocket: true,
          isSyncing: false
        }));
      }
    };

    const handleBackendSync = (event: CustomEvent) => {
      if (event.detail.deviceId === deviceId) {
        setSyncStatus(prev => ({ 
          ...prev, 
          backend: true,
          isSyncing: false
        }));
      }
    };

    window.addEventListener('deviceChanged', handleDeviceChanged as EventListener);
    window.addEventListener('websocketDeviceConfirmed', handleWebSocketConfirmed as EventListener);
    window.addEventListener('backendSyncConfirmed', handleBackendSync as EventListener);

    return () => {
      window.removeEventListener('deviceChanged', handleDeviceChanged as EventListener);
      window.removeEventListener('websocketDeviceConfirmed', handleWebSocketConfirmed as EventListener);
      window.removeEventListener('backendSyncConfirmed', handleBackendSync as EventListener);
    };
  }, [deviceId]);

  const getStatusIcon = () => {
    if (syncStatus.isSyncing) {
      return (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
      );
    }
    
    if (syncStatus.backend && syncStatus.websocket) {
      return <span className="text-green-500">✅</span>;
    }
    
    if (syncStatus.backend === false || syncStatus.websocket === false) {
      return <span className="text-red-500">❌</span>;
    }
    
    return <span className="text-gray-400">⚪</span>;
  };

  const getStatusText = () => {
    if (syncStatus.isSyncing) {
      return 'Syncing...';
    }
    
    if (syncStatus.backend && syncStatus.websocket) {
      return 'Synced';
    }
    
    if (syncStatus.backend === false || syncStatus.websocket === false) {
      return 'Sync Failed';
    }
    
    return 'Unknown';
  };

  const getStatusColor = () => {
    if (syncStatus.isSyncing) {
      return 'text-blue-600';
    }
    
    if (syncStatus.backend && syncStatus.websocket) {
      return 'text-green-600';
    }
    
    if (syncStatus.backend === false || syncStatus.websocket === false) {
      return 'text-red-600';
    }
    
    return 'text-gray-600';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStatusIcon()}
      <span className={`text-xs ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {syncStatus.lastSync && (
        <span className="text-xs text-gray-500">
          ({new Date(syncStatus.lastSync).toLocaleTimeString()})
        </span>
      )}
    </div>
  );
}
