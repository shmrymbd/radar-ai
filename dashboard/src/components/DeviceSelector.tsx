'use client';

import { useState } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import { DeviceErrorBoundary } from './DeviceErrorBoundary';
import DeviceSyncStatus from './DeviceSyncStatus';

interface DeviceSelectorProps {
  className?: string;
}

export default function DeviceSelector({ className = '' }: DeviceSelectorProps) {
  const { selectedDevice, availableDevices, switchDevice, deviceStatus, isLoading, error } = useDevice();
  const [isOpen, setIsOpen] = useState(false);

  const handleDeviceChange = (deviceId: string) => {
    switchDevice(deviceId);
    setIsOpen(false);
  };

  const getStatusColor = (deviceId: string) => {
    const status = deviceStatus[deviceId]?.status;
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-red-500';
      case 'error':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (deviceId: string) => {
    const status = deviceStatus[deviceId]?.status;
    switch (status) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'error':
        return '🟡';
      default:
        return '⚪';
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading devices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-red-500">⚠️</span>
        <span className="text-sm text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <DeviceErrorBoundary>
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        >
          <span className="text-sm font-medium text-gray-700">
            {selectedDevice.name}
          </span>
          <span className={getStatusColor(selectedDevice.id)}>
            {getStatusIcon(selectedDevice.id)}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-50">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                Available Devices
              </div>
              {availableDevices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => handleDeviceChange(device.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    selectedDevice.id === device.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{device.name}</span>
                    <span className="text-xs text-gray-500">({device.id})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={getStatusColor(device.id)}>
                      {getStatusIcon(device.id)}
                    </span>
                    {selectedDevice.id === device.id && (
                      <span className="text-blue-600">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {availableDevices.length > 0 && (
              <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span>Status: {deviceStatus[selectedDevice.id]?.status || 'unknown'}</span>
                  {deviceStatus[selectedDevice.id]?.dataLatency && (
                    <span>Latency: {deviceStatus[selectedDevice.id].dataLatency}ms</span>
                  )}
                </div>
                <div className="mt-2">
                  <DeviceSyncStatus deviceId={selectedDevice.id} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DeviceErrorBoundary>
  );
}
