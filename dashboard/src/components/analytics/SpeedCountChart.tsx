'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartContainer from './charts/ChartContainer';

interface SpeedCountChartProps {
  data: Array<{
    time: string;
    averageSpeed: number;
    count: number;
  }>;
  isLoading?: boolean;
  error?: string | null;
}

export default function SpeedCountChart({
  data,
  isLoading = false,
  error = null
}: SpeedCountChartProps) {
  const handleExport = () => {
    console.log('Export Speed Count Chart');
  };

  const handleInfo = () => {
    console.log('Show Speed Count Chart info');
  };

  return (
    <ChartContainer
      title="Total Average Speed Count"
      isLoading={isLoading}
      error={error}
      onExport={handleExport}
      onInfo={handleInfo}
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="gradient-speed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.1}/>
            </linearGradient>
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
            formatter={(value: any, name: string) => [
              `${value} km/h`,
              name === 'averageSpeed' ? 'Average Speed' : name
            ]}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px'
            }}
          />
          <Area
            type="monotone"
            dataKey="averageSpeed"
            stroke="#ff6b35"
            fill="url(#gradient-speed)"
            name="Average Speed"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
