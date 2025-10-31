'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartContainer from './charts/ChartContainer';

interface TrafficCountChartProps {
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

export default function TrafficCountChart({
  data,
  isLoading = false,
  error = null
}: TrafficCountChartProps) {
  const handleExport = () => {
    console.log('Export Traffic Count Chart');
  };

  const handleInfo = () => {
    console.log('Show Traffic Count Chart info');
  };

  return (
    <ChartContainer
      title="Total Average Traffic Count"
      isLoading={isLoading}
      error={error}
      onExport={handleExport}
      onInfo={handleInfo}
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            {Object.entries(COLORS).map(([key, color]) => (
              <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
              </linearGradient>
            ))}
          </defs>
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
            <Area
              key={vehicleType}
              type="monotone"
              dataKey={vehicleType}
              stackId="1"
              stroke={COLORS[vehicleType as keyof typeof COLORS]}
              fill={`url(#gradient-${vehicleType})`}
              name={vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
