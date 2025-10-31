'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartContainer from './charts/ChartContainer';

interface LevelOfServiceChartProps {
  data: Array<{
    time: string;
    losGrade: string;
    density: number;
    averageSpeed: number;
  }>;
  isLoading?: boolean;
  error?: string | null;
}

const LOS_COLORS = {
  'A': '#10b981',
  'B': '#34d399',
  'C': '#fbbf24',
  'D': '#f59e0b',
  'E': '#f97316',
  'F': '#ef4444'
};

const LOS_VALUES = {
  'A': 1,
  'B': 2,
  'C': 3,
  'D': 4,
  'E': 5,
  'F': 6
};

export default function LevelOfServiceChart({
  data,
  isLoading = false,
  error = null
}: LevelOfServiceChartProps) {
  const handleExport = () => {
    console.log('Export Level of Service Chart');
  };

  const handleInfo = () => {
    console.log('Show Level of Service Chart info');
  };

  // Transform data to include LOS numeric values
  const transformedData = data.map(item => ({
    ...item,
    losValue: LOS_VALUES[item.losGrade as keyof typeof LOS_VALUES] || 1
  }));

  return (
    <ChartContainer
      title="Level of Service (LOS)"
      isLoading={isLoading}
      error={error}
      onExport={handleExport}
      onInfo={handleInfo}
    >
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={transformedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            yAxisId="los"
            orientation="left"
            tick={{ fontSize: 12 }}
            domain={[0, 7]}
            tickFormatter={(value) => {
              const grade = Object.keys(LOS_VALUES).find(key => LOS_VALUES[key as keyof typeof LOS_VALUES] === value);
              return grade || '';
            }}
            label={{ value: 'LOS Grade', angle: -90, position: 'insideLeft' }}
          />
          <YAxis 
            yAxisId="metrics"
            orientation="right"
            tick={{ fontSize: 12 }}
            label={{ value: 'Speed (km/h) / Density', angle: 90, position: 'insideRight' }}
          />
          <Tooltip 
            formatter={(value: any, name: string) => {
              if (name === 'losValue') {
                const grade = Object.keys(LOS_VALUES).find(key => LOS_VALUES[key as keyof typeof LOS_VALUES] === value);
                return [grade, 'LOS Grade'];
              }
              if (name === 'averageSpeed') return [`${value} km/h`, 'Average Speed'];
              if (name === 'density') return [`${value} veh/lane/hr`, 'Density'];
              return [value, name];
            }}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px'
            }}
          />
          <Legend />
          <Bar
            yAxisId="los"
            dataKey="losValue"
            fill="#ff6b35"
            name="LOS Grade"
          />
          <Line
            yAxisId="metrics"
            type="monotone"
            dataKey="averageSpeed"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Average Speed"
          />
          <Line
            yAxisId="metrics"
            type="monotone"
            dataKey="density"
            stroke="#10b981"
            strokeWidth={2}
            name="Density"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
