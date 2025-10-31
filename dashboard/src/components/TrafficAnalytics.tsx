'use client';

import { useState, useEffect } from 'react';
import VehicleClassificationChart from './analytics/VehicleClassificationChart';
import TrafficCountChart from './analytics/TrafficCountChart';
import SpeedPercentageChart from './analytics/SpeedPercentageChart';
import SpeedCountChart from './analytics/SpeedCountChart';
import LevelOfServiceChart from './analytics/LevelOfServiceChart';
import VehicleCountByTypeChart from './analytics/VehicleCountByTypeChart';

interface AnalyticsData {
  summary: {
    totalVehicles: number;
    timeRange: string;
    deviceId: string;
    averageSpeed: number;
  };
  vehicleClassification: any[];
  trafficCount: any[];
  speedPercentage: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  speedCount: Array<{
    time: string;
    averageSpeed: number;
    count: number;
  }>;
  levelOfService: Array<{
    time: string;
    losGrade: string;
    density: number;
    averageSpeed: number;
  }>;
  vehicleCountByType: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

interface TrafficAnalyticsProps {
  deviceId: string;
}

export default function TrafficAnalytics({ deviceId }: TrafficAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    fetchAnalyticsData();
  }, [deviceId, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/analytics?deviceId=${deviceId}&timeRange=${timeRange}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        setError('Failed to fetch analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Error fetching analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/analytics/export?deviceId=${deviceId}&format=excel&includeKPIs=true&includeAnomalies=true&includePatterns=true`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        // Get the blob from response
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `traffic-analytics-${deviceId}-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed:', response.statusText);
        setError('Failed to export data');
      }
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Error exporting data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Error Loading Analytics</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-600">
          <p className="text-lg font-semibold mb-2">No Data Available</p>
          <p className="text-sm">No analytics data found for the selected time range.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">TRAFFIC ANALYTIC</h1>
          <p className="text-sm text-gray-600 mt-1">
            Device: {data.summary.deviceId} | 
            Total Vehicles: {data.summary.totalVehicles} | 
            Average Speed: {data.summary.averageSpeed} km/h
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Select time range"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          
          {/* Export Button */}
          <button
            onClick={handleExportAll}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            Export All Graphs as Excel
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Row 1 */}
        <VehicleClassificationChart 
          data={data.vehicleClassification} 
          isLoading={loading}
          error={error}
        />
        <TrafficCountChart 
          data={data.trafficCount} 
          isLoading={loading}
          error={error}
        />
        
        {/* Row 2 */}
        <SpeedPercentageChart 
          data={data.speedPercentage} 
          isLoading={loading}
          error={error}
        />
        <SpeedCountChart 
          data={data.speedCount} 
          isLoading={loading}
          error={error}
        />
        
        {/* Row 3 */}
        <LevelOfServiceChart 
          data={data.levelOfService} 
          isLoading={loading}
          error={error}
        />
        <VehicleCountByTypeChart 
          data={data.vehicleCountByType} 
          isLoading={loading}
          error={error}
        />
      </div>
    </div>
  );
}