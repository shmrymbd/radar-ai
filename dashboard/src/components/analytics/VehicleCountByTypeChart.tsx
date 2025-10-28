'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ChartContainer from './charts/ChartContainer';

interface VehicleCountByTypeChartProps {
  data: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  isLoading?: boolean;
  error?: string | null;
}

// Extended color palette for all 15 ClairWav vehicle types
const COLORS: Record<string, string> = {
  other: '#6B7280',              // Gray
  bicycle: '#4ADE80',            // Green-light
  motorcycle: '#10B981',         // Green
  tricycle: '#84CC16',           // Lime
  bus: '#F59E0B',                // Orange
  van: '#8B5CF6',                // Purple
  car: '#3B82F6',                // Blue
  suv: '#06B6D4',                // Cyan
  large_truck: '#EF4444',        // Red
  medium_truck: '#F97316',       // Orange-red
  light_truck: '#FB923C',        // Orange-light
  dangerous_goods: '#DC2626',    // Dark red
  engineering_vehicle: '#FACC15', // Yellow
  pedestrian: '#A855F7',         // Violet
  medium_bus: '#FBBF24',         // Amber
  truck: '#f59e0b',              // Orange (backward compatibility)
  unknown: '#6b7280'             // Gray (backward compatibility)
};

export default function VehicleCountByTypeChart({
  data,
  isLoading = false,
  error = null
}: VehicleCountByTypeChartProps) {
  const handleExport = () => {
    console.log('Export Vehicle Count by Type Chart');
  };

  const handleInfo = () => {
    console.log('Show Vehicle Count by Type Chart info');
  };

  const renderCustomizedLabel = (entry: any) => {
    return `${entry.percentage.toFixed(1)}%`;
  };

  // Custom Legend Component with Grid Layout
  const CustomLegend = () => {
    // Sort data by value descending to show most important types first
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    return (
      <div className="mt-4 px-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1.5 text-xs">
          {sortedData.map((entry, index) => (
            <div
              key={`legend-${index}`}
              className="flex items-center space-x-1.5 min-w-0"
              title={`${entry.name}: ${entry.value} vehicles (${entry.percentage.toFixed(1)}%)`}
            >
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: COLORS[entry.name] || '#6b7280' }}
              />
              <span className="text-gray-700 truncate flex-1">
                <span className="font-medium capitalize">{entry.name.replace(/_/g, ' ')}:</span>
                <span className="ml-1 text-gray-600">{entry.value}</span>
                <span className="ml-0.5 text-gray-500">({entry.percentage.toFixed(1)}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ChartContainer
      title="Vehicle Count by Type"
      isLoading={isLoading}
      error={error}
      onExport={handleExport}
      onInfo={handleInfo}
    >
      <div className="flex flex-col h-full">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              label={renderCustomizedLabel}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.name] || '#6b7280'}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: string) => [
                `${value} vehicles (${data.find(d => d.name === name)?.percentage.toFixed(1)}%)`,
                name.replace(/_/g, ' ')
              ]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Custom Legend with Grid Layout */}
        <CustomLegend />
      </div>
    </ChartContainer>
  );
}
