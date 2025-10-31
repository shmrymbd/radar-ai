'use client';

import { useState, useEffect } from 'react';
import { useDevice } from '@/contexts/DeviceContext';

interface KPIData {
  intersectionEfficiency: {
    overall: number;
    byVehicleType: { [key: string]: number };
    throughputRate: number;
    peakCapacityUtilization: number;
  };
  laneUtilization: {
    efficiency: { [key: string]: number };
    balanceScore: number;
    underutilizedLanes: number[];
    overutilizedLanes: number[];
    recommendations: string[];
  };
  speedCompliance: {
    overallRate: number;
    byVehicleType: { [key: string]: number };
    violations: {
      count: number;
      percentage: number;
      severityDistribution: { [key: string]: number };
    };
  };
}

export function AdvancedKPIs() {
  const { selectedDevice } = useDevice();
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/advanced-kpis?deviceId=${selectedDevice.id}`);
        const result = await response.json();

        if (result.success) {
          setKpis(result.data);
          setError(null);
        } else {
          setError(result.error || 'Failed to fetch KPIs');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
    const interval = setInterval(fetchKPIs, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [selectedDevice.id]);

  if (loading && !kpis) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading KPIs: {error}</p>
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div className="space-y-6">
      {/* Intersection Efficiency */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Intersection Efficiency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{kpis.intersectionEfficiency.overall}/100</div>
            <div className="text-sm text-gray-600">Overall Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{kpis.intersectionEfficiency.throughputRate}</div>
            <div className="text-sm text-gray-600">Vehicles/Hour</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{kpis.intersectionEfficiency.peakCapacityUtilization}%</div>
            <div className="text-sm text-gray-600">Capacity Utilization</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(kpis.intersectionEfficiency.overall)}`}>
              {getPerformanceLabel(kpis.intersectionEfficiency.overall)}
            </div>
            <div className="text-sm text-gray-600">Performance</div>
          </div>
        </div>
      </div>

      {/* Lane Utilization */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Lane Utilization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Balance Score</h4>
            <div className="flex items-center">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getBalanceColor(kpis.laneUtilization.balanceScore)}`}
                    style={{ width: `${kpis.laneUtilization.balanceScore}%` }}
                  ></div>
                </div>
              </div>
              <span className="ml-4 text-lg font-semibold">{kpis.laneUtilization.balanceScore}/100</span>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Lane Status</h4>
            <div className="space-y-2">
              {kpis.laneUtilization.underutilizedLanes.length > 0 && (
                <div className="text-sm">
                  <span className="text-yellow-600 font-medium">Underutilized:</span>{' '}
                  {kpis.laneUtilization.underutilizedLanes.join(', ')}
                </div>
              )}
              {kpis.laneUtilization.overutilizedLanes.length > 0 && (
                <div className="text-sm">
                  <span className="text-red-600 font-medium">Overutilized:</span>{' '}
                  {kpis.laneUtilization.overutilizedLanes.join(', ')}
                </div>
              )}
              {kpis.laneUtilization.underutilizedLanes.length === 0 &&
                kpis.laneUtilization.overutilizedLanes.length === 0 && (
                  <div className="text-sm text-green-600 font-medium">All lanes balanced</div>
                )}
            </div>
          </div>
        </div>

        {kpis.laneUtilization.recommendations.length > 0 && (
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {kpis.laneUtilization.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-blue-800">• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Speed Compliance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Speed Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-4xl font-bold ${kpis.speedCompliance.overallRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
              {kpis.speedCompliance.overallRate}%
            </div>
            <div className="text-sm text-gray-600">Compliance Rate</div>
          </div>

          <div className="text-center">
            <div className="text-4xl font-bold text-red-600">{kpis.speedCompliance.violations.count}</div>
            <div className="text-sm text-gray-600">Total Violations</div>
          </div>

          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600">{kpis.speedCompliance.violations.percentage}%</div>
            <div className="text-sm text-gray-600">Violation Rate</div>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="mt-4">
          <h4 className="font-medium mb-2">Violation Severity</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-yellow-50 rounded p-2 text-center">
              <div className="text-2xl font-bold text-yellow-700">
                {kpis.speedCompliance.violations.severityDistribution.minor || 0}
              </div>
              <div className="text-xs text-yellow-600">Minor</div>
            </div>
            <div className="bg-orange-50 rounded p-2 text-center">
              <div className="text-2xl font-bold text-orange-700">
                {kpis.speedCompliance.violations.severityDistribution.moderate || 0}
              </div>
              <div className="text-xs text-orange-600">Moderate</div>
            </div>
            <div className="bg-red-50 rounded p-2 text-center">
              <div className="text-2xl font-bold text-red-700">
                {kpis.speedCompliance.violations.severityDistribution.severe || 0}
              </div>
              <div className="text-xs text-red-600">Severe</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getPerformanceLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

function getBalanceColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}
