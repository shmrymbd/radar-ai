'use client';

import { useState } from 'react';
import { useDevice } from '@/contexts/DeviceContext';

interface QueryResult {
  query: string;
  filter: {
    vehicleTypes?: string[];
    lanes?: number[];
    speedRange?: { min: number; max: number };
    dayOfWeek?: number[];
    peakHoursOnly?: boolean;
  };
  metrics: {
    filtered: any;
    original: any;
  };
}

const exampleQueries = [
  'Show me truck traffic during rush hour',
  'Cars speeding between lanes',
  'Lane 11 occupancy on weekdays',
  'All vehicle types during peak hours',
  'Motorcycle traffic on weekends'
];

export function NaturalLanguageQuery() {
  const { selectedDevice } = useDevice();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (queryText: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: queryText,
          deviceId: selectedDevice.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Failed to process query');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleQuery(query);
    }
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
    handleQuery(exampleQuery);
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Intelligent Traffic Query</h3>
        <p className="text-sm text-gray-600 mb-4">
          Ask questions about traffic in natural language. Try queries like "Show me truck traffic during rush hour" or "Lane 11 occupancy on weekdays".
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your question..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Example Queries */}
        <div className="mt-4">
          <p className="text-xs text-gray-600 mb-2">Example queries:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(example)}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                disabled={loading}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      )}

      {/* Query Results */}
      {result && (
        <div className="space-y-4">
          {/* Applied Filters */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Applied Filters</h4>
            <div className="flex flex-wrap gap-2">
              {result.filter.vehicleTypes && result.filter.vehicleTypes.length > 0 && (
                <div className="bg-white px-3 py-1 rounded-full border border-blue-300">
                  <span className="text-xs text-gray-600">Vehicle Types:</span>{' '}
                  <span className="text-sm font-medium">{result.filter.vehicleTypes.join(', ')}</span>
                </div>
              )}
              {result.filter.lanes && result.filter.lanes.length > 0 && (
                <div className="bg-white px-3 py-1 rounded-full border border-blue-300">
                  <span className="text-xs text-gray-600">Lanes:</span>{' '}
                  <span className="text-sm font-medium">{result.filter.lanes.join(', ')}</span>
                </div>
              )}
              {result.filter.speedRange && (
                <div className="bg-white px-3 py-1 rounded-full border border-blue-300">
                  <span className="text-xs text-gray-600">Speed:</span>{' '}
                  <span className="text-sm font-medium">
                    {result.filter.speedRange.min}-{result.filter.speedRange.max} km/h
                  </span>
                </div>
              )}
              {result.filter.peakHoursOnly && (
                <div className="bg-white px-3 py-1 rounded-full border border-blue-300">
                  <span className="text-sm font-medium">Peak Hours Only</span>
                </div>
              )}
              {result.filter.dayOfWeek && result.filter.dayOfWeek.length > 0 && (
                <div className="bg-white px-3 py-1 rounded-full border border-blue-300">
                  <span className="text-xs text-gray-600">Days:</span>{' '}
                  <span className="text-sm font-medium">
                    {result.filter.dayOfWeek.length === 5 ? 'Weekdays' : result.filter.dayOfWeek.length === 2 ? 'Weekend' : 'Custom'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Results Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Metrics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-semibold mb-3 text-gray-700">All Traffic</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Total Vehicles</div>
                  <div className="text-2xl font-bold">{result.metrics.original.totalVehicles || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Average Speed</div>
                  <div className="text-2xl font-bold">{result.metrics.original.averageSpeed?.toFixed(1) || 0} km/h</div>
                </div>
                {result.metrics.original.vehicleTypeCounts && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Vehicle Types</div>
                    <div className="space-y-1">
                      {Object.entries(result.metrics.original.vehicleTypeCounts).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span>{type}</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filtered Metrics */}
            <div className="bg-blue-50 rounded-lg shadow-md p-6 border-2 border-blue-300">
              <h4 className="font-semibold mb-3 text-blue-900">Filtered Results</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-blue-700">Total Vehicles</div>
                  <div className="text-2xl font-bold text-blue-900">{result.metrics.filtered.totalVehicles || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-blue-700">Average Speed</div>
                  <div className="text-2xl font-bold text-blue-900">{result.metrics.filtered.averageSpeed?.toFixed(1) || 0} km/h</div>
                </div>
                {result.metrics.filtered.vehicleTypeCounts && (
                  <div>
                    <div className="text-sm text-blue-700 mb-1">Vehicle Types</div>
                    <div className="space-y-1">
                      {Object.entries(result.metrics.filtered.vehicleTypeCounts).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span className="text-blue-800">{type}</span>
                          <span className="font-medium text-blue-900">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
