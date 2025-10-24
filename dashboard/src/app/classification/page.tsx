'use client';

import { useState, useEffect } from 'react';
import { ClassificationMetrics, ClassificationSummary } from '@/types/classification';

export default function ClassificationPage() {
  const [metrics, setMetrics] = useState<ClassificationMetrics | null>(null);
  const [summary, setSummary] = useState<ClassificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'realtime' | 'historical' | 'analytics'>('realtime');

  useEffect(() => {
    fetchClassificationData();
    const interval = setInterval(fetchClassificationData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchClassificationData = async () => {
    try {
      const [metricsResponse, summaryResponse] = await Promise.all([
        fetch('/api/classification/metrics'),
        fetch('/api/classification/summary')
      ]);

      if (metricsResponse.ok && summaryResponse.ok) {
        const metricsData = await metricsResponse.json();
        const summaryData = await summaryResponse.json();
        
        setMetrics(metricsData.data);
        setSummary(summaryData.data);
        setError(null);
      } else {
        setError('Failed to fetch classification data');
      }
    } catch (err) {
      setError('Error fetching classification data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classification data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchClassificationData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vehicle Classification</h1>
              <p className="text-gray-600 mt-1">Real-time vehicle classification and traffic analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <button 
                onClick={fetchClassificationData}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'realtime', label: 'Real-time', icon: '📊' },
              { id: 'historical', label: 'Historical', icon: '📈' },
              { id: 'analytics', label: 'Analytics', icon: '🔍' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'realtime' && (
          <RealtimeClassification metrics={metrics} summary={summary} />
        )}
        {activeTab === 'historical' && (
          <HistoricalAnalysis metrics={metrics} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsView metrics={metrics} summary={summary} />
        )}
      </div>
    </div>
  );
}

// Real-time Classification Component
function RealtimeClassification({ metrics, summary }: { metrics: ClassificationMetrics | null, summary: ClassificationSummary | null }) {
  if (!metrics || !summary) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-3xl font-bold text-blue-600">{summary.totalVehicles}</div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Vehicles</div>
              <div className="text-xs text-gray-400">Last hour</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-3xl font-bold text-green-600">{summary.uniqueVehicleTypes}</div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Vehicle Types</div>
              <div className="text-xs text-gray-400">Detected</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-3xl font-bold text-orange-600">{summary.averageSpeed.toFixed(1)}</div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Avg Speed</div>
              <div className="text-xs text-gray-400">km/h</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-3xl font-bold text-red-600">{summary.speedViolations}</div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Speed Violations</div>
              <div className="text-xs text-gray-400">Last hour</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Type Distribution */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Type Distribution</h3>
        <div className="space-y-3">
          {metrics.vehicleTypes.map((vehicleType, index) => (
            <div key={vehicleType.vehicleType} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 mr-3"></div>
                <span className="font-medium text-gray-900 capitalize">{vehicleType.vehicleType}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">{vehicleType.count} vehicles</span>
                <span className="text-sm text-gray-500">{vehicleType.percentage.toFixed(1)}%</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(vehicleType.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lane Utilization */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lane Utilization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.laneUtilization.map((lane) => (
            <div key={lane.laneNumber} className="border rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Lane {lane.laneNumber}</div>
              <div className="text-2xl font-bold text-gray-900">{lane.totalVehicles}</div>
              <div className="text-sm text-gray-500">vehicles</div>
              <div className="mt-2">
                <div className="text-xs text-gray-500">Utilization: {(lane.utilizationRate * 100).toFixed(1)}%</div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div 
                    className="bg-green-500 h-1 rounded-full" 
                    style={{ width: `${Math.min(lane.utilizationRate * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Historical Analysis Component
function HistoricalAnalysis({ metrics }: { metrics: ClassificationMetrics | null }) {
  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Hour Analysis</h3>
        <div className="space-y-3">
          {metrics.peakHours.slice(0, 5).map((peakHour) => (
            <div key={peakHour.hour} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-blue-600">{peakHour.hour}:00</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{peakHour.totalVehicles} vehicles</div>
                  <div className="text-sm text-gray-500">Avg speed: {peakHour.averageSpeed.toFixed(1)} km/h</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Density: {peakHour.trafficDensity.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Analytics View Component
function AnalyticsView({ metrics, summary }: { metrics: ClassificationMetrics | null, summary: ClassificationSummary | null }) {
  if (!metrics || !summary) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Composition Analysis</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Vehicle Type Breakdown</h4>
            <div className="space-y-2">
              {summary.trafficComposition.map((type) => (
                <div key={type.vehicleType} className="flex justify-between items-center">
                  <span className="capitalize text-gray-700">{type.vehicleType}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{type.count}</span>
                    <span className="text-sm text-gray-500">({type.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Lane Utilization</span>
                <span className="text-gray-900">{(summary.laneUtilization * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Peak Hour</span>
                <span className="text-gray-900">{summary.peakHour}:00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Speed Violations</span>
                <span className="text-red-600">{summary.speedViolations}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
