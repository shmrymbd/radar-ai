'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import ChartContainer from './charts/ChartContainer';

interface SpeedPercentageChartProps {
  data: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  isLoading?: boolean;
  error?: string | null;
}

export default function SpeedPercentageChart({
  data,
  isLoading = false,
  error = null
}: SpeedPercentageChartProps) {
  const handleExport = () => {
    console.log('Export Speed Percentage Chart');
  };

  const handleInfo = () => {
    console.log('Show Speed Percentage Chart info');
  };

  const renderCustomizedLabel = (entry: any) => {
    return `${entry.percentage.toFixed(1)}%`;
  };

  return (
    <ChartContainer
      title="Speed Percentage"
      isLoading={isLoading}
      error={error}
      onExport={handleExport}
      onInfo={handleInfo}
    >
      <ResponsiveContainer width="100%" height={300}>
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
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any, name: string) => [
              `${value} vehicles (${data.find(d => d.name === name)?.percentage.toFixed(1)}%)`,
              name
            ]}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value: string) => {
              const item = data.find(d => d.name === value);
              return `${value}: ${item?.value} vehicles (${item?.percentage.toFixed(1)}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
