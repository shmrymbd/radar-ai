'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartContainer from './charts/ChartContainer';

interface VehicleClassificationChartProps {
  data: any[];
  isLoading?: boolean;
  error?: string | null;
}

const COLORS = {
  car: '#3b82f6',
  suv: '#10b981',
  truck: '#f59e0b',
  motorcycle: '#ef4444',
  van: '#8b5cf6',
  unknown: '#6b7280'
};

export default function VehicleClassificationChart({
  data,
  isLoading = false,
  error = null
}: VehicleClassificationChartProps) {
  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export Vehicle Classification Chart');
  };

  const handleInfo = () => {
    // TODO: Implement info popover
    console.log('Show Vehicle Classification Chart info');
  };

  return (
    <ChartContainer
      title="Vehicle Classification Chart"
      isLoading={isLoading}
      error={error}
      onExport={handleExport}
      onInfo={handleInfo}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px'
            }}
          />
          <Legend />
          {Object.keys(COLORS).map((vehicleType) => (
            <Bar
              key={vehicleType}
              dataKey={vehicleType}
              stackId="a"
              fill={COLORS[vehicleType as keyof typeof COLORS]}
              name={vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
