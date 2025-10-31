'use client';

import { useState, useEffect } from 'react';
import { useDevice } from '@/contexts/DeviceContext';

interface Anomaly {
  id: string;
  timestamp: string;
  type: 'volume' | 'speed' | 'pattern' | 'vehicle_type';
  severity: 'low' | 'medium' | 'high';
  description: string;
  metrics: {
    expected: number;
    actual: number;
    deviation: number;
  };
  suggestedActions: string[];
}

interface AnomalyData {
  anomalies: Anomaly[];
  baseline: {
    volumeRange: { min: number; max: number };
    speedRange: { min: number; max: number };
    vehicleTypeMix: { [key: string]: number };
  };
}

export function AnomalyDetection() {
  const { selectedDevice } = useDevice();
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/anomaly-detection?deviceId=${selectedDevice.id}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error || 'Failed to fetch anomalies');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [selectedDevice.id]);

  if (loading && !data) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading anomalies: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const hasAnomalies = data.anomalies.length > 0;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className={`rounded-lg p-6 ${hasAnomalies ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${hasAnomalies ? 'text-yellow-900' : 'text-green-900'}`}>
              {hasAnomalies ? 'Anomalies Detected' : 'No Anomalies Detected'}
            </h3>
            <p className={`text-sm ${hasAnomalies ? 'text-yellow-700' : 'text-green-700'}`}>
              {hasAnomalies
                ? `${data.anomalies.length} unusual pattern${data.anomalies.length > 1 ? 's' : ''} detected`
                : 'Traffic patterns are within normal ranges'}
            </p>
          </div>
          <div className={`text-4xl ${hasAnomalies ? 'text-yellow-500' : 'text-green-500'}`}>
            {hasAnomalies ? '⚠' : '✓'}
          </div>
        </div>
      </div>

      {/* Baseline Metrics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Normal Traffic Baseline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2">Expected Volume Range</h4>
            <div className="text-lg">
              <span className="font-semibold">{data.baseline.volumeRange.min}</span>
              {' - '}
              <span className="font-semibold">{data.baseline.volumeRange.max}</span>
              {' vehicles/hour'}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2">Expected Speed Range</h4>
            <div className="text-lg">
              <span className="font-semibold">{data.baseline.speedRange.min}</span>
              {' - '}
              <span className="font-semibold">{data.baseline.speedRange.max}</span>
              {' km/h'}
            </div>
          </div>
        </div>
      </div>

      {/* Detected Anomalies */}
      {hasAnomalies && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Detected Anomalies</h3>
          {data.anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`rounded-lg p-6 border-2 ${getSeverityStyles(anomaly.severity)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityBadge(anomaly.severity)}`}>
                      {anomaly.severity.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <h4 className="text-lg font-semibold">{anomaly.description}</h4>
                  <p className="text-sm text-gray-600 capitalize">Type: {anomaly.type.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-600 mb-1">Expected</div>
                  <div className="text-xl font-semibold">{anomaly.metrics.expected.toFixed(1)}</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-600 mb-1">Actual</div>
                  <div className="text-xl font-semibold">{anomaly.metrics.actual.toFixed(1)}</div>
                </div>
                <div className="bg-red-50 rounded p-3">
                  <div className="text-xs text-red-600 mb-1">Deviation</div>
                  <div className="text-xl font-semibold text-red-600">{anomaly.metrics.deviation.toFixed(1)}%</div>
                </div>
              </div>

              {/* Suggested Actions */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">Suggested Actions</h5>
                <ul className="space-y-1">
                  {anomaly.suggestedActions.map((action, idx) => (
                    <li key={idx} className="text-sm text-blue-800">• {action}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getSeverityStyles(severity: string): string {
  switch (severity) {
    case 'high':
      return 'bg-red-50 border-red-300';
    case 'medium':
      return 'bg-yellow-50 border-yellow-300';
    case 'low':
      return 'bg-blue-50 border-blue-300';
    default:
      return 'bg-gray-50 border-gray-300';
  }
}

function getSeverityBadge(severity: string): string {
  switch (severity) {
    case 'high':
      return 'bg-red-200 text-red-800';
    case 'medium':
      return 'bg-yellow-200 text-yellow-800';
    case 'low':
      return 'bg-blue-200 text-blue-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
}
