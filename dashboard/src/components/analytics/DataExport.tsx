'use client';

import { useState } from 'react';
import { useDevice } from '@/contexts/DeviceContext';

export function DataExport() {
  const { selectedDevice } = useDevice();
  const [format, setFormat] = useState<'json' | 'csv' | 'excel' | 'pdf'>('json');
  const [includeKPIs, setIncludeKPIs] = useState(true);
  const [includeAnomalies, setIncludeAnomalies] = useState(true);
  const [includePatterns, setIncludePatterns] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        deviceId: selectedDevice.id,
        format,
        includeKPIs: includeKPIs.toString(),
        includeAnomalies: includeAnomalies.toString(),
        includePatterns: includePatterns.toString()
      });

      const response = await fetch(`/api/analytics/export?${params}`);

      if (format === 'csv') {
        // Download CSV file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `traffic-analytics-${selectedDevice.id}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Show JSON response
        const data = await response.json();

        if (data.success) {
          // Download JSON file
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `traffic-analytics-${selectedDevice.id}-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else if (data.error) {
          setError(data.error + (data.note ? ` - ${data.note}` : ''));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Export Analytics Data</h3>
      <p className="text-sm text-gray-600 mb-6">
        Export comprehensive traffic analytics data in your preferred format. Include advanced KPIs, anomaly detection, and traffic patterns.
      </p>

      {/* Format Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(['json', 'csv', 'excel', 'pdf'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                format === fmt
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Include Options */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Include in Export</label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeKPIs}
              onChange={(e) => setIncludeKPIs(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Advanced KPIs (Intersection Efficiency, Lane Utilization, Speed Compliance)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeAnomalies}
              onChange={(e) => setIncludeAnomalies(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Anomaly Detection Results</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includePatterns}
              onChange={(e) => setIncludePatterns(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Traffic Patterns (Peak Hours, Day of Week Analysis)</span>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
      </button>

      {/* Format Notes */}
      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-1">
          <strong>JSON:</strong> Full data structure with all nested objects and arrays
        </p>
        <p className="mb-1">
          <strong>CSV:</strong> Flattened data suitable for spreadsheet analysis
        </p>
        <p className="mb-1">
          <strong>Excel:</strong> Formatted spreadsheet with multiple sheets (requires xlsx package)
        </p>
        <p>
          <strong>PDF:</strong> Formatted report with charts and tables (requires jspdf package)
        </p>
      </div>
    </div>
  );
}
