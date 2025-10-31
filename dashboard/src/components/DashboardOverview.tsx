'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { DashboardSummary } from '@/lib/redis-storage';

export default function DashboardOverview() {
  const { selectedDevice } = useDevice();
  const { ws, connectionStatus, subscribeToChannel } = useUnifiedWebSocket();
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [deviceKey, setDeviceKey] = useState<string>(selectedDevice.id);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before making API calls
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Subscribe to dashboard channel when WebSocket is connected
  useEffect(() => {
    if (ws && connectionStatus === 'connected') {
      subscribeToChannel('dashboard');
    }
  }, [ws, connectionStatus, subscribeToChannel]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Only process WebSocket data if it matches the current device
        if (data.type === 'dashboard_data' || data.type === 'dashboard_update') {
          if (data.deviceId === selectedDevice.id) {
            setDashboardData(data.data);
          }
        } else if (data.type === 'device_subscription_confirmed') {
          console.log(`✅ Subscribed to device: ${data.deviceId}`);
          
          // Dispatch confirmation event for sync service
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('websocketDeviceConfirmed', {
              detail: { 
                deviceId: data.deviceId, 
                timestamp: new Date().toISOString() 
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, selectedDevice.id]);

  // Consolidated fetch function using useCallback to prevent recreation
  const fetchDashboardData = useCallback(async () => {
    try {
      console.log('📡 Fetching dashboard data via API for device:', selectedDevice.id);
      const response = await fetch(`/api/dashboard?device=${selectedDevice.id}`);
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
        console.log('✅ Dashboard data loaded via API for device:', selectedDevice.id);
      } else {
        console.error('❌ Failed to load dashboard data:', result.error);
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    }
  }, [selectedDevice.id]);

  // Initial API fetch and polling fallback
  useEffect(() => {
    // Only fetch data after component is mounted (client-side)
    if (!isMounted) return;
    
    console.log('🚀 DashboardOverview: Component mounted, fetching data...');
    
    // Initial API fetch
    fetchDashboardData();

    // Set up polling interval for automatic updates (5 seconds)
    const pollingInterval = setInterval(() => {
      if (connectionStatus === 'disconnected' || !ws || ws.readyState !== WebSocket.OPEN) {
        console.log('🔄 Polling for dashboard updates...');
        fetchDashboardData();
      }
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [isMounted, fetchDashboardData, connectionStatus, ws]);

  // Handle device changes - force complete re-render
  useEffect(() => {
    if (selectedDevice.id !== deviceKey) {
      console.log(`🔄 Device changed from ${deviceKey} to ${selectedDevice.id}, forcing complete refresh...`);

      // Use setTimeout to avoid setState in effect
      setTimeout(() => {
        setDeviceKey(selectedDevice.id);
        setDashboardData(null); // Clear existing data
      }, 0);
    }
  }, [selectedDevice.id, deviceKey]);

  // Listen for device change events and sync WebSocket
  useEffect(() => {
    const handleDeviceChange = (event: CustomEvent) => {
      const { deviceId } = event.detail;
      console.log(`🔌 WebSocket sync: Device changed to ${deviceId}`);
      
      // Reconnect WebSocket with new device
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe_device',
          deviceId: deviceId
        }));
        console.log(`✅ WebSocket subscribed to device: ${deviceId}`);
      }
    };

    // Listen for device change events
    window.addEventListener('deviceChanged', handleDeviceChange as EventListener);

    return () => {
      window.removeEventListener('deviceChanged', handleDeviceChange as EventListener);
    };
  }, [ws, connectionStatus]);

  // Refetch data when device changes
  useEffect(() => {
    console.log('🔄 Device change effect triggered:', selectedDevice.id, selectedDevice.name);

    if (selectedDevice) {
      console.log(`🔄 Device changed to ${selectedDevice.name} (${selectedDevice.id}), forcing API data refresh...`);

      // Always fetch fresh API data when device changes to ensure correct data
      fetchDashboardData();
      
      // Also try to subscribe to WebSocket if available
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('📡 Sending WebSocket subscription for device:', selectedDevice.id);
        ws.send(JSON.stringify({
          type: 'subscribe_device',
          deviceId: selectedDevice.id
        }));
      }
    }
  }, [selectedDevice, ws, fetchDashboardData]);


  return (
    <div className="space-y-8">
      {dashboardData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">V</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Vehicles</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData?.summary?.totalVehicles || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">S</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Average Speed</p>
                  <p className="text-2xl font-bold text-gray-900">{(dashboardData?.summary?.averageSpeed || 0).toFixed(1)} km/h</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">Q</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Lanes with Queues</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData?.summary?.lanesWithQueues || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">O</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{(dashboardData?.summary?.averageOccupancyRate || 0).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lane Status */}
          {dashboardData.laneStatus && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Lane Status</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboardData.laneStatus.entries.map((entry, index) => {
                    // Get vehicle type breakdown
                    const vehicleTypeBreakdown = (entry as any).vehicleTypeBreakdown || {};
                    const vehicleTypes = Object.entries(vehicleTypeBreakdown);
                    const hasVehicleBreakdown = vehicleTypes.length > 0;

                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">Lane {entry.lane?.number || 'Unknown'}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            entry.queue?.length > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {entry.queue?.length > 0 ? 'Queued' : 'Free Flow'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>Queue: {entry.queue?.length?.toFixed(1) || '0.0'}m</div>
                          <div>
                            <span className="font-medium">Vehicles: {entry.vehiclesOnline || 0}</span>
                            {hasVehicleBreakdown && (
                              <div className="mt-1 pl-2 space-y-0.5">
                                {vehicleTypes.map(([type, count]) => (
                                  <div key={type} className="text-xs text-gray-500 capitalize">
                                    • {count}x {type}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>Speed: {entry.speeds?.average?.toFixed(1) || '0.0'} km/h</div>
                          <div>Occupancy: {entry.spaceOccupancyRate?.toFixed(1) || '0.0'}%</div>
                        </div>
                        {entry.alerts && entry.alerts.length > 0 && (
                          <div className="mt-2">
                            {entry.alerts.map((alert, alertIndex) => (
                              <div key={alertIndex} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                {alert}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {dashboardData?.summary?.alerts && dashboardData.summary.alerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Traffic Alerts</h3>
                  <div className="mt-1 text-sm text-red-700">
                    {dashboardData?.summary?.alerts?.map((alert, index) => (
                      <div key={index}>• {alert}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Pass Events */}
          {dashboardData.recentPassEvents.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Pass Events</h3>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {dashboardData.recentPassEvents.slice(0, 5).map((event, index) => {
                    // Format timestamp in UTC+8 with AM/PM
                    const formatTimestamp = (timestamp: string | Date) => {
                      const date = new Date(timestamp);
                      // Convert to UTC+8
                      const utc8Date = new Date(date.getTime() + (8 * 60 * 60 * 1000));
                      const hours = utc8Date.getUTCHours();
                      const minutes = utc8Date.getUTCMinutes();
                      const seconds = utc8Date.getUTCSeconds();
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      const displayHours = hours % 12 || 12;
                      return `${displayHours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
                    };

                    return (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center space-x-4">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-xs text-gray-400 w-24">
                            {event.timestamp ? formatTimestamp(event.timestamp) : 'N/A'}
                          </span>
                          <span className="text-sm font-medium">
                            Lane {event.laneNumber && event.laneNumber !== 0 ? event.laneNumber : 'Unknown'}
                          </span>
                          <span className="text-sm text-gray-500 capitalize">
                            {event.vehicleType && event.vehicleType !== 'unknown' ? event.vehicleType : 'Unknown'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {event.crossSectionSpeed?.toFixed(1) || '0.0'} km/h
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading dashboard data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
