'use client';

import { useState, useEffect } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import HistoricalCharts from '@/components/HistoricalCharts';

interface ClassificationData {
  metrics: {
    totalVehicles: number;
    vehicleTypes: Array<{
      vehicleType: string;
      count: number;
      percentage: number;
      averageSpeed: number;
    }>;
    laneUtilization: Array<{
      laneNumber: number;
      totalVehicles: number;
      utilizationRate: number;
      averageSpeed: number;
    }>;
  };
  summary: {
    totalVehicles: number;
    uniqueVehicleTypes: number;
    averageSpeed: number;
    speedViolations: number;
    laneUtilization: number;
    peakHour: number;
    trafficComposition: Array<{
      vehicleType: string;
      count: number;
      percentage: number;
      averageSpeed: number;
    }>;
  };
}

export default function ClassificationPage() {
  const { selectedDevice } = useDevice();
  const [data, setData] = useState<ClassificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'realtime' | 'historical'>('realtime');

  useEffect(() => {
    const fetchClassificationData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const [metricsResponse, summaryResponse] = await Promise.all([
          fetch(`${baseUrl}/api/classification/metrics?deviceId=${selectedDevice.id}`, { 
            cache: 'no-store' 
          }),
          fetch(`${baseUrl}/api/classification/summary?deviceId=${selectedDevice.id}`, { 
            cache: 'no-store' 
          })
        ]);

        if (metricsResponse.ok && summaryResponse.ok) {
          const metricsData = await metricsResponse.json();
          const summaryData = await summaryResponse.json();
          setData({ 
            metrics: metricsData.data, 
            summary: summaryData.data 
          });
        } else {
          setError('Failed to fetch classification data');
        }
      } catch (err) {
        console.error('Error fetching classification data:', err);
        setError('Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchClassificationData();
  }, [selectedDevice.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-blue-600 text-xl mb-4">Loading classification data for {selectedDevice.name}...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error || 'Error loading data'}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vehicle Classification Dashboard</h1>
          <p className="text-gray-600">Device: {selectedDevice.name} ({selectedDevice.id})</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('realtime')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'realtime'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Real-time Analytics
              </button>
              <button
                onClick={() => setActiveTab('historical')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'historical'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Historical Charts
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'realtime' ? (
          <div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Total Vehicles</h2>
            <p className="text-3xl font-bold text-blue-600">{data.metrics.totalVehicles}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Average Speed</h2>
            <p className="text-3xl font-bold text-green-600">{(data.summary.averageSpeed ?? 0).toFixed(1)} km/h</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Vehicle Types</h2>
            <p className="text-3xl font-bold text-purple-600">{data.summary.uniqueVehicleTypes}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Speed Violations</h2>
            <p className="text-3xl font-bold text-red-600">{data.summary.speedViolations}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Lane Utilization</h2>
            <p className="text-3xl font-bold text-orange-600">{(data.summary.laneUtilization * 100).toFixed(1)}%</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Peak Hour</h2>
            <p className="text-3xl font-bold text-indigo-600">{data.summary.peakHour}:00</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 col-span-full">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Vehicle Type Distribution</h2>
            <div className="space-y-2">
              {data.metrics.vehicleTypes
                .filter((vehicle: any) => vehicle.count != null && vehicle.count > 0)
                .map((vehicle: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium capitalize">{vehicle.vehicleType}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{vehicle.count} vehicles</span>
                    <span className="text-sm font-bold text-blue-600">{vehicle.percentage?.toFixed(1) ?? 0}%</span>
                    <span className="text-sm text-gray-500">{vehicle.averageSpeed?.toFixed(1) ?? 0} km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 col-span-full">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Lane Utilization</h2>
            <div className="space-y-2">
              {data.metrics.laneUtilization.map((lane: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">Lane {lane.laneNumber}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{lane.totalVehicles} vehicles</span>
                    <span className="text-sm font-bold text-green-600">{(lane.utilizationRate * 100).toFixed(1)}%</span>
                    <span className="text-sm text-gray-500">{lane.averageSpeed.toFixed(1)} km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
          </div>
        ) : (
          <HistoricalCharts deviceId={selectedDevice.id} />
        )}
      </div>
    </div>
  );
}