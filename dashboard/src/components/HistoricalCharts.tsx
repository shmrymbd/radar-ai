'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { HistoricalChartData } from '@/types/classification-history';
import { parseUTC8TimeSlot, formatUTC8Display } from '@/lib/timezone';

interface HistoricalChartsProps {
  deviceId: string;
}

export default function HistoricalCharts({ deviceId }: HistoricalChartsProps) {
  const [timePeriod, setTimePeriod] = useState<'24hrs' | 'yesterday' | 'month'>('24hrs');
  const [chartType, setChartType] = useState<'histogram' | 'heatmap' | 'trend' | 'comparative' | 'peakhour' | 'composition' | 'laneheatmap' | 'speeddist' | 'trafficflow'>('histogram');
  const [historicalData, setHistoricalData] = useState<HistoricalChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For comparative view
  const [comparePeriod1, setComparePeriod1] = useState<'24hrs' | 'yesterday' | 'month'>('24hrs');
  const [comparePeriod2, setComparePeriod2] = useState<'24hrs' | 'yesterday' | 'month'>('yesterday');
  const [compareData1, setCompareData1] = useState<HistoricalChartData[]>([]);
  const [compareData2, setCompareData2] = useState<HistoricalChartData[]>([]);

  // Chart customization options (task 6.5)
  const [showSettings, setShowSettings] = useState(false);
  const [chartOptions, setChartOptions] = useState({
    showGrid: true,
    showLegend: true,
    animationEnabled: true,
    colorScheme: 'default' as 'default' | 'colorblind' | 'monochrome',
    fontSize: 'medium' as 'small' | 'medium' | 'large'
  });

  // Chart virtualization for large datasets (task 7.1)
  const [virtualizationEnabled, setVirtualizationEnabled] = useState(false);
  const [visibleDataRange, setVisibleDataRange] = useState({ start: 0, end: 100 });
  const ITEMS_PER_PAGE = 100;

  // Lazy loading for chart components (task 7.4)
  const [chartComponentsLoaded, setChartComponentsLoaded] = useState(false);

  // Load user preferences from localStorage (task 6.4)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPreferences = localStorage.getItem('historical-charts-preferences');
      if (savedPreferences) {
        try {
          const preferences = JSON.parse(savedPreferences);
          if (preferences.defaultTimePeriod) {
            setTimePeriod(preferences.defaultTimePeriod);
          }
          if (preferences.defaultChartType) {
            setChartType(preferences.defaultChartType);
          }
          if (preferences.chartOptions) {
            setChartOptions(preferences.chartOptions);
          }
        } catch (error) {
          console.warn('Failed to load chart preferences:', error);
        }
      }
    }
  }, []);

  // Save user preferences to localStorage (task 6.4)
  const savePreferences = useCallback(() => {
    if (typeof window !== 'undefined') {
      const preferences = {
        defaultTimePeriod: timePeriod,
        defaultChartType: chartType,
        chartOptions: chartOptions,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('historical-charts-preferences', JSON.stringify(preferences));
    }
  }, [timePeriod, chartType, chartOptions]);

  // Save preferences when they change
  useEffect(() => {
    savePreferences();
  }, [timePeriod, chartType, chartOptions, savePreferences]);

  // Enable virtualization for large datasets (task 7.1)
  useEffect(() => {
    const shouldEnableVirtualization = historicalData.length > 500;
    setVirtualizationEnabled(shouldEnableVirtualization);
    if (shouldEnableVirtualization) {
      setVisibleDataRange({ start: 0, end: ITEMS_PER_PAGE });
    }
  }, [historicalData.length]);

  // Lazy load chart components (task 7.4)
  useEffect(() => {
    const timer = setTimeout(() => {
      setChartComponentsLoaded(true);
    }, 100); // Small delay to simulate lazy loading
    
    return () => clearTimeout(timer);
  }, [chartType]);

  // Get virtualized data for rendering
  const getVirtualizedData = useCallback(() => {
    if (!virtualizationEnabled) {
      return historicalData;
    }
    return historicalData.slice(visibleDataRange.start, visibleDataRange.end);
  }, [historicalData, virtualizationEnabled, visibleDataRange]);

  // Pagination controls for virtualized data
  const handlePageChange = useCallback((direction: 'prev' | 'next') => {
    if (!virtualizationEnabled) return;
    
    const newStart = direction === 'next' 
      ? Math.min(visibleDataRange.start + ITEMS_PER_PAGE, historicalData.length - ITEMS_PER_PAGE)
      : Math.max(visibleDataRange.start - ITEMS_PER_PAGE, 0);
    
    setVisibleDataRange({
      start: newStart,
      end: Math.min(newStart + ITEMS_PER_PAGE, historicalData.length)
    });
  }, [virtualizationEnabled, visibleDataRange, historicalData.length]);

  // Format time for display - timeSlot format is "YYYY-MM-DD-HH-MM" already in UTC+8
  // NO timezone conversion needed - just extract HH:MM directly
  const formatTimeDisplay = (timeSlot: string): string => {
    // TimeSlot format: "2025-10-28-15-30" -> extract "15:30"
    const parts = timeSlot.split('-');
    if (parts.length === 5) {
      const hour = parts[3].padStart(2, '0');
      const minute = parts[4].padStart(2, '0');
      return `${hour}:${minute}`;
    }
    // Fallback if format is unexpected
    return timeSlot;
  };

  // Chart export functionality
  const exportChart = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
    const chartElement = document.getElementById('historical-chart');
    if (!chartElement) {
      alert('Chart not found');
      return;
    }

    try {
      if (format === 'png') {
        // Use html2canvas-like approach (manual implementation for simplicity)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size based on chart element
        const rect = chartElement.getBoundingClientRect();
        canvas.width = rect.width * 2; // Higher resolution
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Get computed styles and draw content
        // For now, we'll create a simple implementation
        // In production, use html2canvas library
        const link = document.createElement('a');
        link.download = `classification-chart-${chartType}-${new Date().toISOString()}.png`;
        canvas.toBlob((blob) => {
          if (blob) {
            link.href = URL.createObjectURL(blob);
            link.click();
          }
        });
      } else if (format === 'svg') {
        // Export as SVG
        const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <text x="10" y="20">Classification Chart Export</text>
          <text x="10" y="40">Chart Type: ${chartType}</text>
          <text x="10" y="60">Device: ${deviceId}</text>
          <text x="10" y="80">Note: Full SVG export requires additional implementation</text>
        </svg>`;

        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = `classification-chart-${chartType}-${new Date().toISOString()}.svg`;
        link.href = URL.createObjectURL(blob);
        link.click();
      } else if (format === 'pdf') {
        // Export as PDF (simplified version - print to PDF)
        // For full PDF generation, use jsPDF library
        alert('PDF export: Please use your browser\'s Print to PDF feature (Ctrl+P or Cmd+P)');
        window.print();
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export chart');
    }
  }, [chartType, deviceId]);

  const fetchHistoricalData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/classification/historical?deviceId=${deviceId}&timePeriod=${timePeriod}&sortOrder=desc`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }

      const result = await response.json();
      setHistoricalData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching historical data:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, timePeriod]);

  useEffect(() => {
    if (chartType !== 'comparative') {
      fetchHistoricalData();
    }
  }, [fetchHistoricalData, chartType]);

  // Fetch data for comparative view
  const fetchComparativeData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [response1, response2] = await Promise.all([
        fetch(`/api/classification/historical?deviceId=${deviceId}&timePeriod=${comparePeriod1}&sortOrder=desc`),
        fetch(`/api/classification/historical?deviceId=${deviceId}&timePeriod=${comparePeriod2}&sortOrder=desc`)
      ]);

      if (!response1.ok || !response2.ok) {
        throw new Error('Failed to fetch comparative data');
      }

      const [result1, result2] = await Promise.all([
        response1.json(),
        response2.json()
      ]);

      setCompareData1(result1.data || []);
      setCompareData2(result2.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching comparative data:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, comparePeriod1, comparePeriod2]);

  useEffect(() => {
    if (chartType === 'comparative') {
      fetchComparativeData();
    }
  }, [chartType, fetchComparativeData]);

  const renderHistogramChart = () => {
    const dataToRender = getVirtualizedData();
    if (dataToRender.length === 0) return <div>No data available</div>;

    // Data is already sorted by API with sortOrder=desc (newest first)
    const vehicleTypes = ['car', 'suv', 'truck', 'motorcycle', 'van'];
    const maxCount = Math.max(...dataToRender.map(d => d.totalVehicles));

    console.log('Histogram chart data:', dataToRender.length, 'records, maxCount:', maxCount);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Vehicle Type Distribution Over Time</h3>
        
        {/* Virtualization Info */}
        {virtualizationEnabled && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                Showing {visibleDataRange.start + 1}-{visibleDataRange.end} of {historicalData.length} data points
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange('prev')}
                  disabled={visibleDataRange.start === 0}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => handlePageChange('next')}
                  disabled={visibleDataRange.end >= historicalData.length}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          {dataToRender.map((data, index) => {
            console.log(`Time slot ${index}: ${data.timeSlot}, totalVehicles: ${data.totalVehicles}`);
            return (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="w-24 text-sm text-gray-600 font-medium">
                    {formatTimeDisplay(data.timeSlot)} (UTC+8)
                  </div>
                  <div className="text-sm text-gray-500">
                    Total: {data.totalVehicles} vehicles
                  </div>
                </div>
                <div className="space-y-2">
                  {vehicleTypes.map(type => {
                    const count = data.vehicleTypes[type as keyof typeof data.vehicleTypes];
                    const percentage = data.totalVehicles > 0 ? (count / data.totalVehicles) * 100 : 0;
                    const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    const minWidth = Math.max(barWidth, 2); // Ensure minimum width for visibility
                    
                    console.log(`  ${type}: ${count} vehicles, ${percentage.toFixed(1)}%, barWidth: ${barWidth}%`);
                    
                    return (
                      <div key={type} className="flex items-center space-x-3">
                        <div className="w-20 text-xs text-gray-500 capitalize font-medium">{type}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                          <div
                            className="bg-blue-500 h-6 rounded-full transition-all duration-300 min-w-[4px]"
                            style={{ width: `${minWidth}%` }}
                            role="progressbar"
                            aria-valuenow={Math.round(barWidth)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${type} vehicles: ${count} (${percentage.toFixed(1)}%)`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                            {count > 0 && `${count} (${percentage.toFixed(1)}%)`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderHeatmapChart = () => {
    if (historicalData.length === 0) return <div>No data available</div>;

    // Data is already sorted by API with sortOrder=desc (newest first)
    const vehicleTypes = ['car', 'suv', 'truck', 'motorcycle', 'van'];
    const maxCount = Math.max(...historicalData.map(d => d.totalVehicles));

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Traffic Density Heatmap</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left">Time</th>
                {vehicleTypes.map(type => (
                  <th key={type} className="border p-2 text-center capitalize">{type}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historicalData.map((data, index) => (
                <tr key={index}>
                  <td className="border p-2 text-sm">
                    {formatTimeDisplay(data.timeSlot)} (UTC+8)
                  </td>
                  {vehicleTypes.map(type => {
                    const count = data.vehicleTypes[type as keyof typeof data.vehicleTypes];
                    const intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    const bgColor = intensity > 80 ? 'bg-red-500' : 
                                   intensity > 60 ? 'bg-orange-500' : 
                                   intensity > 40 ? 'bg-yellow-500' : 
                                   intensity > 20 ? 'bg-green-500' : 'bg-gray-200';
                    
                    return (
                      <td key={type} className={`border p-2 text-center ${bgColor} text-white font-medium`}>
                        {count}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTrendChart = () => {
    if (historicalData.length === 0) return <div>No data available</div>;

    // Sort data by timeSlot to ensure proper chronological order
    const sortedData = [...historicalData].sort((a, b) => {
      const dateA = parseTimeSlot(a.timeSlot);
      const dateB = parseTimeSlot(b.timeSlot);
      return dateA.getTime() - dateB.getTime();
    });

    const maxCount = Math.max(...sortedData.map(d => d.totalVehicles));
    
    console.log('Trend chart data:', sortedData.length, 'records, maxCount:', maxCount);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Traffic Volume Trends</h3>
        <div className="h-64 flex items-end space-x-2 bg-gray-50 p-4 rounded-lg">
          {sortedData.map((data, index) => {
            const height = maxCount > 0 ? (data.totalVehicles / maxCount) * 100 : 0;
            const minHeight = Math.max(height, 2); // Ensure minimum height for visibility
            console.log(`Bar ${index}: ${data.totalVehicles} vehicles, height: ${height}%`);
            return (
              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                <div 
                  className="w-full bg-blue-500 rounded-t min-h-[4px]" 
                  style={{ height: `${minHeight}%` }}
                  role="img"
                  aria-label={`Traffic volume: ${data.totalVehicles} vehicles`}
                />
                <div className="text-xs text-gray-600 transform -rotate-45 origin-left whitespace-nowrap">
                  {formatTimeDisplay(data.timeSlot)}
                </div>
                <div className="text-xs text-center text-gray-500">
                  {data.totalVehicles}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-sm text-gray-600">
          Total vehicles: {sortedData.reduce((sum, d) => sum + d.totalVehicles, 0)}
        </div>
      </div>
    );
  };

  const renderPeakHourChart = () => {
    if (historicalData.length === 0) return <div>No data available</div>;

    // Group data by hour
    const hourlyData = historicalData.reduce((acc, data) => {
      const hour = parseTimeSlot(data.timeSlot).getHours();
      if (!acc[hour]) {
        acc[hour] = { hour, totalVehicles: 0, count: 0 };
      }
      acc[hour].totalVehicles += data.totalVehicles;
      acc[hour].count += 1;
      return acc;
    }, {} as Record<number, { hour: number; totalVehicles: number; count: number }>);

    // Calculate averages and sort by hour
    const hourlyStats = Object.values(hourlyData)
      .map(({ hour, totalVehicles, count }) => ({
        hour,
        averageVehicles: count > 0 ? totalVehicles / count : 0,
        totalVehicles
      }))
      .sort((a, b) => a.hour - b.hour);

    const maxAverage = Math.max(...hourlyStats.map(h => h.averageVehicles));
    const peakHour = hourlyStats.reduce((max, current) =>
      current.averageVehicles > max.averageVehicles ? current : max
    );

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Peak Hour Analysis</h3>

        {/* Peak Hour Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-blue-700 mb-1">Peak Hour</p>
              <p className="text-4xl font-bold text-blue-900">
                {String(peakHour.hour).padStart(2, '0')}:00
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-700 mb-1">Average Vehicles (Peak)</p>
              <p className="text-4xl font-bold text-blue-900">
                {Math.round(peakHour.averageVehicles)}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-700 mb-1">Total (Peak Hour)</p>
              <p className="text-4xl font-bold text-blue-900">
                {peakHour.totalVehicles}
              </p>
            </div>
          </div>
        </div>

        {/* Hourly Bar Chart */}
        <div className="space-y-4">
          <h4 className="font-semibold">Hourly Traffic Distribution</h4>
          <div className="space-y-2">
            {hourlyStats.map(({ hour, averageVehicles, totalVehicles }) => {
              const barWidth = maxAverage > 0 ? (averageVehicles / maxAverage) * 100 : 0;
              const isPeak = hour === peakHour.hour;

              return (
                <div key={hour} className={`p-3 rounded-lg ${isPeak ? 'bg-blue-50 border-2 border-blue-300' : 'bg-white border border-gray-200'}`}>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-16 text-sm font-semibold ${isPeak ? 'text-blue-700' : 'text-gray-700'}`}>
                      {String(hour).padStart(2, '0')}:00
                      {isPeak && <span className="text-xs ml-1">👑</span>}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-full h-8 relative overflow-hidden">
                        <div
                          className={`h-8 rounded-full transition-all duration-300 ${isPeak ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-blue-400'}`}
                          style={{ width: `${Math.max(barWidth, 2)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {Math.round(averageVehicles)} avg ({totalVehicles} total)
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-right text-sm text-gray-600">
                      {((averageVehicles / maxAverage) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Traffic Pattern Insights */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3">Traffic Pattern Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Morning Rush (6-9 AM)</p>
              <p className="font-semibold text-gray-800">
                {hourlyStats.filter(h => h.hour >= 6 && h.hour < 9).reduce((sum, h) => sum + h.totalVehicles, 0)} vehicles
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Evening Rush (17-20 PM)</p>
              <p className="font-semibold text-gray-800">
                {hourlyStats.filter(h => h.hour >= 17 && h.hour < 20).reduce((sum, h) => sum + h.totalVehicles, 0)} vehicles
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Off-Peak (22-5 AM)</p>
              <p className="font-semibold text-gray-800">
                {hourlyStats.filter(h => h.hour >= 22 || h.hour < 6).reduce((sum, h) => sum + h.totalVehicles, 0)} vehicles
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Total Daily Traffic</p>
              <p className="font-semibold text-gray-800">
                {hourlyStats.reduce((sum, h) => sum + h.totalVehicles, 0)} vehicles
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComparativeChart = () => {
    if (compareData1.length === 0 || compareData2.length === 0) {
      return <div>No data available for comparison</div>;
    }

    const vehicleTypes = ['car', 'suv', 'truck', 'motorcycle', 'van'];

    // Calculate aggregated totals for each period
    const period1Totals = vehicleTypes.reduce((acc, type) => {
      acc[type] = compareData1.reduce((sum, d) => sum + d.vehicleTypes[type as keyof typeof d.vehicleTypes], 0);
      return acc;
    }, {} as Record<string, number>);

    const period2Totals = vehicleTypes.reduce((acc, type) => {
      acc[type] = compareData2.reduce((sum, d) => sum + d.vehicleTypes[type as keyof typeof d.vehicleTypes], 0);
      return acc;
    }, {} as Record<string, number>);

    const period1Total = Object.values(period1Totals).reduce((sum, val) => sum + val, 0);
    const period2Total = Object.values(period2Totals).reduce((sum, val) => sum + val, 0);
    const maxTotal = Math.max(period1Total, period2Total);

    const periodLabels = {
      '24hrs': 'Last 24 Hours',
      'yesterday': 'Yesterday',
      'month': 'Last Month'
    };

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Comparative Analysis: {periodLabels[comparePeriod1]} vs {periodLabels[comparePeriod2]}</h3>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">{periodLabels[comparePeriod1]}</h4>
            <p className="text-3xl font-bold text-blue-600">{period1Total}</p>
            <p className="text-sm text-blue-700">Total Vehicles</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">{periodLabels[comparePeriod2]}</h4>
            <p className="text-3xl font-bold text-green-600">{period2Total}</p>
            <p className="text-sm text-green-700">Total Vehicles</p>
          </div>
        </div>

        {/* Comparative Bar Chart */}
        <div className="space-y-4">
          <h4 className="font-semibold">Vehicle Type Distribution Comparison</h4>
          <div className="space-y-3">
            {vehicleTypes.map(type => {
              const count1 = period1Totals[type];
              const count2 = period2Totals[type];
              const percentage1 = period1Total > 0 ? (count1 / period1Total) * 100 : 0;
              const percentage2 = period2Total > 0 ? (count2 / period2Total) * 100 : 0;
              const barWidth1 = maxTotal > 0 ? (count1 / maxTotal) * 100 : 0;
              const barWidth2 = maxTotal > 0 ? (count2 / maxTotal) * 100 : 0;
              const difference = count1 - count2;
              const percentDiff = count2 > 0 ? ((difference / count2) * 100) : (count1 > 0 ? 100 : 0);

              return (
                <div key={type} className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="font-medium capitalize mb-2">{type}</div>
                  <div className="space-y-2">
                    {/* Period 1 Bar */}
                    <div className="flex items-center space-x-3">
                      <div className="w-28 text-xs text-blue-700 font-medium">{periodLabels[comparePeriod1]}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="bg-blue-500 h-6 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(barWidth1, 2)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                          {count1 > 0 && `${count1} (${percentage1.toFixed(1)}%)`}
                        </div>
                      </div>
                    </div>
                    {/* Period 2 Bar */}
                    <div className="flex items-center space-x-3">
                      <div className="w-28 text-xs text-green-700 font-medium">{periodLabels[comparePeriod2]}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="bg-green-500 h-6 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(barWidth2, 2)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                          {count2 > 0 && `${count2} (${percentage2.toFixed(1)}%)`}
                        </div>
                      </div>
                    </div>
                    {/* Difference Indicator */}
                    <div className="text-xs text-gray-600 ml-28 pl-3">
                      {difference > 0 ? (
                        <span className="text-blue-600">↑ +{difference} ({percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%)</span>
                      ) : difference < 0 ? (
                        <span className="text-red-600">↓ {difference} ({percentDiff.toFixed(1)}%)</span>
                      ) : (
                        <span className="text-gray-500">No change</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3">Overall Change</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Difference</p>
              <p className={`text-2xl font-bold ${period1Total > period2Total ? 'text-blue-600' : period1Total < period2Total ? 'text-red-600' : 'text-gray-600'}`}>
                {period1Total > period2Total ? '+' : ''}{period1Total - period2Total}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Percentage Change</p>
              <p className={`text-2xl font-bold ${period1Total > period2Total ? 'text-blue-600' : period1Total < period2Total ? 'text-red-600' : 'text-gray-600'}`}>
                {period2Total > 0 ? ((period1Total - period2Total) / period2Total * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data Points</p>
              <p className="text-2xl font-bold text-gray-700">
                {compareData1.length} vs {compareData2.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Vehicle Composition Trend Charts (task 5.3)
  const renderCompositionChart = () => {
    if (historicalData.length === 0) {
      return <div>No data available for composition analysis</div>;
    }

    const vehicleTypes = ['car', 'suv', 'truck', 'motorcycle', 'van'];
    const colors = {
      car: '#3B82F6',
      suv: '#10B981', 
      truck: '#F59E0B',
      motorcycle: '#EF4444',
      van: '#8B5CF6'
    };

    // Calculate cumulative totals over time
    const timeSlots = historicalData.map(d => formatTimeDisplay(d.timeSlot));
    const compositionData = vehicleTypes.map(type => ({
      type,
      data: historicalData.map(d => d.vehicleTypes[type as keyof typeof d.vehicleTypes]),
      color: colors[type as keyof typeof colors]
    }));

    const maxValue = Math.max(...historicalData.map(d => d.totalVehicles));

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Vehicle Composition Trends</h3>
        
        {/* Stacked Area Chart */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="h-64 flex items-end space-x-1">
            {historicalData.map((d, index) => {
              const total = d.totalVehicles;
              const height = total > 0 ? (total / maxValue) * 200 : 0;
              
              return (
                <div key={index} className="flex flex-col items-center space-y-1">
                  <div className="w-8 flex flex-col justify-end" style={{ height: `${height}px` }}>
                    {vehicleTypes.map(type => {
                      const value = d.vehicleTypes[type as keyof typeof d.vehicleTypes];
                      const segmentHeight = total > 0 ? (value / total) * height : 0;
                      
                      return (
                        <div
                          key={type}
                          className="w-full"
                          style={{
                            height: `${segmentHeight}px`,
                            backgroundColor: colors[type as keyof typeof colors],
                            opacity: 0.8
                          }}
                          title={`${type}: ${value}`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs text-gray-600 transform -rotate-45 origin-left">
                    {timeSlots[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center">
          {vehicleTypes.map(type => (
            <div key={type} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors[type as keyof typeof colors] }}
              />
              <span className="text-sm font-medium capitalize">{type}</span>
            </div>
          ))}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {vehicleTypes.map(type => {
            const total = historicalData.reduce((sum, d) => sum + d.vehicleTypes[type as keyof typeof d.vehicleTypes], 0);
            const percentage = historicalData.reduce((sum, d) => sum + d.totalVehicles, 0) > 0 
              ? (total / historicalData.reduce((sum, d) => sum + d.totalVehicles, 0)) * 100 
              : 0;
            
            return (
              <div key={type} className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold" style={{ color: colors[type as keyof typeof colors] }}>
                  {total}
                </div>
                <div className="text-sm text-gray-600 capitalize">{type}</div>
                <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Lane Utilization Heatmaps (task 5.4)
  const renderLaneHeatmapChart = () => {
    if (historicalData.length === 0) {
      return <div className="text-center p-8 text-gray-500">No data available for lane heatmap analysis</div>;
    }

    // Note: Lane utilization heatmap requires lane-specific data, not aggregated totals
    // Display total vehicle count per time slot as a fallback
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Lane Heatmap Chart Not Available</h3>
            <p className="text-yellow-700 mb-4">
              Detailed lane utilization heatmap requires lane-specific vehicle counts.
              The current data is aggregated across all lanes into 15-minute time slots.
            </p>
            <div className="bg-white rounded-lg p-4 border border-yellow-300">
              <h4 className="font-semibold text-gray-800 mb-3">Total Vehicle Traffic by Time Slot</h4>
              <div className="space-y-2">
                {historicalData.slice(0, 20).map((data, index) => {
                  const maxVehicles = Math.max(...historicalData.map(d => d.totalVehicles));
                  const intensity = maxVehicles > 0 ? data.totalVehicles / maxVehicles : 0;
                  const bgColor = `rgba(59, 130, 246, ${intensity * 0.7})`;

                  return (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 rounded"
                      style={{ backgroundColor: bgColor }}
                    >
                      <span className="text-sm font-medium">{data.timeSlot}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-bold">{data.totalVehicles} vehicles</span>
                        <span className="text-xs text-gray-600">{data.averageSpeed.toFixed(1)} km/h avg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {historicalData.length > 20 && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Showing 20 of {historicalData.length} time slots
                </p>
              )}
            </div>
            <div className="mt-4 text-sm text-yellow-700">
              <strong>Note:</strong> To enable lane heatmap charts, modify the aggregation pipeline to group data by
              both time slot and lane number, or query the PassData collection with lane-specific filters.
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Speed Distribution Histograms (task 5.5)
  const renderSpeedDistChart = () => {
    if (historicalData.length === 0) {
      return <div className="text-center p-8 text-gray-500">No data available for speed distribution analysis</div>;
    }

    // Note: Speed distribution requires individual vehicle speed data, not aggregated averages
    // Display average speeds instead as a fallback
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Speed Distribution Chart Not Available</h3>
            <p className="text-yellow-700 mb-4">
              Detailed speed distribution analysis requires individual vehicle speed records.
              The current data is aggregated into 15-minute time slots with average speeds only.
            </p>
            <div className="bg-white rounded-lg p-4 border border-yellow-300">
              <h4 className="font-semibold text-gray-800 mb-3">Average Speeds by Time Slot</h4>
              <div className="space-y-2">
                {historicalData.slice(0, 10).map((data, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{data.timeSlot}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">{data.averageSpeed.toFixed(1)} km/h</span>
                      <span className="text-xs text-red-600">{data.speedViolations} violations</span>
                    </div>
                  </div>
                ))}
              </div>
              {historicalData.length > 10 && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Showing 10 of {historicalData.length} time slots
                </p>
              )}
            </div>
            <div className="mt-4 text-sm text-yellow-700">
              <strong>Note:</strong> To enable detailed speed distribution charts, implement real-time speed
              bucketing in the aggregation pipeline or query individual PassData records.
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Speed Distribution by Vehicle Type</h3>
        
        {/* Speed Distribution Charts */}
        <div className="space-y-6">
          {speedDistribution.map(({ type, distribution }) => (
            <div key={type} className="bg-white p-4 rounded-lg border">
              <h4 className="text-md font-semibold mb-3 capitalize">{type} Speed Distribution</h4>
              
              <div className="flex items-end space-x-2 h-32">
                {distribution.map(({ range, count, color }) => {
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={range} className="flex flex-col items-center space-y-1 flex-1">
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${height}px`,
                          backgroundColor: color,
                          opacity: 0.8
                        }}
                        title={`${range} km/h: ${count} vehicles`}
                      />
                      <span className="text-xs text-gray-600">{range}</span>
                      <span className="text-xs font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Speed Violations</h4>
            <div className="text-2xl font-bold text-red-600">
              {historicalData.reduce((sum, d) => sum + d.speedAnalysis.speedViolations, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Violations</div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Average Speed</h4>
            <div className="text-2xl font-bold text-blue-600">
              {historicalData.reduce((sum, d) => sum + d.speedAnalysis.averageSpeed, 0) / historicalData.length}
            </div>
            <div className="text-sm text-gray-600">km/h</div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Speed Range</h4>
            <div className="text-lg font-bold text-green-600">
              {Math.min(...historicalData.map(d => d.speedAnalysis.averageSpeed)).toFixed(0)} - {Math.max(...historicalData.map(d => d.speedAnalysis.averageSpeed)).toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">km/h range</div>
          </div>
        </div>
      </div>
    );
  };

  // Traffic Flow Diagram Visualizations (task 5.1)
  const renderTrafficFlowChart = () => {
    const dataToRender = getVirtualizedData();
    if (dataToRender.length === 0) {
      return <div>No data available for traffic flow analysis</div>;
    }

    const lanes = ['lane11', 'lane12', 'lane31', 'lane32'];
    const laneLabels = {
      lane11: 'Lane 11',
      lane12: 'Lane 12',
      lane31: 'Lane 31', 
      lane32: 'Lane 32'
    };

    // Calculate average flow rates
    const flowRates = lanes.map(lane => {
      const avgUtilization = dataToRender.reduce((sum, d) => 
        sum + (d.laneUtilization[lane as keyof typeof d.laneUtilization] || 0), 0
      ) / dataToRender.length;
      
      return {
        lane,
        utilization: avgUtilization,
        flowRate: avgUtilization * 0.8, // Convert utilization to flow rate
        direction: lane.includes('1') ? 'inbound' : 'outbound'
      };
    });

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Traffic Flow Diagram</h3>
        
        {/* Intersection Flow Visualization */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="relative h-96">
            {/* Intersection Center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">INTERSECTION</span>
            </div>

            {/* Inbound Lanes (Top) */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex space-x-8">
              {flowRates.filter(f => f.direction === 'inbound').map((flow, index) => (
                <div key={flow.lane} className="text-center">
                  <div className="w-20 h-16 bg-blue-100 border-2 border-blue-300 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-xs font-bold text-blue-800">{laneLabels[flow.lane as keyof typeof laneLabels]}</div>
                    <div className="text-xs text-blue-600">{flow.utilization.toFixed(1)}%</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Inbound</div>
                </div>
              ))}
            </div>

            {/* Outbound Lanes (Bottom) */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-8">
              {flowRates.filter(f => f.direction === 'outbound').map((flow, index) => (
                <div key={flow.lane} className="text-center">
                  <div className="w-20 h-16 bg-green-100 border-2 border-green-300 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-xs font-bold text-green-800">{laneLabels[flow.lane as keyof typeof laneLabels]}</div>
                    <div className="text-xs text-green-600">{flow.utilization.toFixed(1)}%</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Outbound</div>
                </div>
              ))}
            </div>

            {/* Flow Arrows */}
            {flowRates.map((flow, index) => {
              const isInbound = flow.direction === 'inbound';
              const arrowY = isInbound ? 'top-16' : 'bottom-16';
              const arrowDirection = isInbound ? '↓' : '↑';
              const arrowColor = flow.utilization > 80 ? 'text-red-500' : flow.utilization > 60 ? 'text-yellow-500' : 'text-green-500';
              
              return (
                <div key={flow.lane} className={`absolute ${arrowY} left-1/2 transform -translate-x-1/2`}>
                  <div className={`text-2xl ${arrowColor} font-bold`}>{arrowDirection}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Flow Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold mb-3">Lane Flow Rates</h4>
            <div className="space-y-2">
              {flowRates.map(flow => (
                <div key={flow.lane} className="flex justify-between items-center">
                  <span className="text-sm">{laneLabels[flow.lane as keyof typeof laneLabels]}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${flow.utilization > 80 ? 'bg-red-500' : flow.utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${flow.utilization}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{flow.utilization.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold mb-3">Traffic Flow Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Average Flow:</span>
                <span className="text-sm font-medium">
                  {(flowRates.reduce((sum, f) => sum + f.utilization, 0) / flowRates.length).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Peak Lane:</span>
                <span className="text-sm font-medium">
                  {laneLabels[flowRates.reduce((max, f) => f.utilization > max.utilization ? f : max).lane as keyof typeof laneLabels]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Flow Balance:</span>
                <span className="text-sm font-medium">
                  {Math.abs(flowRates.filter(f => f.direction === 'inbound').reduce((sum, f) => sum + f.utilization, 0) - 
                    flowRates.filter(f => f.direction === 'outbound').reduce((sum, f) => sum + f.utilization, 0)) < 10 ? 'Balanced' : 'Imbalanced'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Time-based Flow Analysis */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-semibold mb-3">Flow Patterns Over Time</h4>
          <div className="h-32 flex items-end space-x-1">
            {dataToRender.map((d, index) => {
              const totalFlow = lanes.reduce((sum, lane) => 
                sum + (d.laneUtilization[lane as keyof typeof d.laneUtilization] || 0), 0
              ) / lanes.length;
              
              const height = (totalFlow / 100) * 100;
              
              return (
                <div key={index} className="flex flex-col items-center space-y-1 flex-1">
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${height}px` }}
                    title={`${formatTimeDisplay(d.timeSlot)}: ${totalFlow.toFixed(1)}% avg flow`}
                  />
                  <span className="text-xs text-gray-600 transform -rotate-45 origin-left">
                    {formatTimeDisplay(d.timeSlot)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'histogram':
        return renderHistogramChart();
      case 'heatmap':
        return renderHeatmapChart();
      case 'trend':
        return renderTrendChart();
      case 'comparative':
        return renderComparativeChart();
      case 'peakhour':
        return renderPeakHourChart();
      case 'composition':
        return renderCompositionChart();
      case 'laneheatmap':
        return renderLaneHeatmapChart();
      case 'speeddist':
        return renderSpeedDistChart();
      case 'trafficflow':
        return renderTrafficFlowChart();
      default:
        return renderHistogramChart();
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        {chartType !== 'comparative' ? (
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Time Period:</label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as '24hrs' | 'yesterday' | 'month')}
              className="border rounded px-3 py-1"
              title="Select time period for historical data"
            >
              <option value="24hrs">Last 24 Hours</option>
              <option value="yesterday">Yesterday</option>
              <option value="month">Last Month</option>
            </select>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Period 1:</label>
              <select
                value={comparePeriod1}
                onChange={(e) => setComparePeriod1(e.target.value as '24hrs' | 'yesterday' | 'month')}
                className="border rounded px-3 py-1"
                title="Select first time period for comparison"
              >
                <option value="24hrs">Last 24 Hours</option>
                <option value="yesterday">Yesterday</option>
                <option value="month">Last Month</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Period 2:</label>
              <select
                value={comparePeriod2}
                onChange={(e) => setComparePeriod2(e.target.value as '24hrs' | 'yesterday' | 'month')}
                className="border rounded px-3 py-1"
                title="Select second time period for comparison"
              >
                <option value="24hrs">Last 24 Hours</option>
                <option value="yesterday">Yesterday</option>
                <option value="month">Last Month</option>
              </select>
            </div>
          </>
        )}

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Chart Type:</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as typeof chartType)}
            className="border rounded px-3 py-1"
            title="Select chart visualization type"
          >
            <option value="histogram">Histogram</option>
            <option value="heatmap">Heatmap</option>
            <option value="trend">Trend Line</option>
            <option value="comparative">Comparative</option>
            <option value="peakhour">Peak Hour Analysis</option>
            <option value="composition">Vehicle Composition</option>
            <option value="laneheatmap">Lane Heatmap</option>
            <option value="speeddist">Speed Distribution</option>
            <option value="trafficflow">Traffic Flow Diagram</option>
          </select>
        </div>

        <button
          onClick={chartType === 'comparative' ? fetchComparativeData : fetchHistoricalData}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2 ml-auto">
          <span className="text-sm font-medium text-gray-600">Export:</span>
          <button
            onClick={() => exportChart('png')}
            disabled={loading || (chartType === 'comparative' ? (compareData1.length === 0 || compareData2.length === 0) : historicalData.length === 0)}
            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export chart as PNG image"
          >
            PNG
          </button>
          <button
            onClick={() => exportChart('svg')}
            disabled={loading || (chartType === 'comparative' ? (compareData1.length === 0 || compareData2.length === 0) : historicalData.length === 0)}
            className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export chart as SVG vector"
          >
            SVG
          </button>
          <button
            onClick={() => exportChart('pdf')}
            disabled={loading || (chartType === 'comparative' ? (compareData1.length === 0 || compareData2.length === 0) : historicalData.length === 0)}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export chart as PDF (print dialog)"
          >
            PDF
          </button>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
          title="Chart customization settings"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Chart Customization Settings Panel (task 6.5) */}
      {showSettings && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Chart Customization</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Grid Lines */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Grid Lines</label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={chartOptions.showGrid}
                  onChange={(e) => setChartOptions(prev => ({ ...prev, showGrid: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Show grid lines</span>
              </label>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Legend</label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={chartOptions.showLegend}
                  onChange={(e) => setChartOptions(prev => ({ ...prev, showLegend: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Show legend</span>
              </label>
            </div>

            {/* Animation */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Animation</label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={chartOptions.animationEnabled}
                  onChange={(e) => setChartOptions(prev => ({ ...prev, animationEnabled: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Enable animations</span>
              </label>
            </div>

            {/* Color Scheme */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Color Scheme</label>
              <select
                value={chartOptions.colorScheme}
                onChange={(e) => setChartOptions(prev => ({ ...prev, colorScheme: e.target.value as 'default' | 'colorblind' | 'monochrome' }))}
                className="border rounded px-2 py-1 text-sm w-full"
              >
                <option value="default">Default</option>
                <option value="colorblind">Colorblind Friendly</option>
                <option value="monochrome">Monochrome</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Font Size</label>
              <select
                value={chartOptions.fontSize}
                onChange={(e) => setChartOptions(prev => ({ ...prev, fontSize: e.target.value as 'small' | 'medium' | 'large' }))}
                className="border rounded px-2 py-1 text-sm w-full"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reset</label>
              <button
                onClick={() => setChartOptions({
                  showGrid: true,
                  showLegend: true,
                  animationEnabled: true,
                  colorScheme: 'default',
                  fontSize: 'medium'
                })}
                className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 w-full"
              >
                Reset to Defaults
              </button>
            </div>

            {/* Virtualization Settings */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Performance</label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={virtualizationEnabled}
                  onChange={(e) => setVirtualizationEnabled(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Enable virtualization for large datasets</span>
              </label>
              {virtualizationEnabled && (
                <div className="text-xs text-gray-600">
                  Currently showing {visibleDataRange.end - visibleDataRange.start} of {historicalData.length} items
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div id="historical-chart" className="bg-white p-6 rounded-lg shadow">
        {error && (
          <div className="text-red-600 bg-red-50 p-4 rounded mb-4">
            Error: {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading historical data...</div>
          </div>
        ) : !chartComponentsLoaded ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading chart components...</div>
          </div>
        ) : (
          renderChart()
        )}
      </div>
    </div>
  );
}
