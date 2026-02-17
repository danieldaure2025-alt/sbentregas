'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface FinancialLineChartProps {
  data: DataPoint[];
  title: string;
  description?: string;
  color?: string;
  valueLabel?: string;
  formatValue?: (value: number) => string;
  showTrend?: boolean;
}

export function FinancialLineChart({
  data,
  title,
  description,
  color = '#3b82f6', // blue-500
  valueLabel = 'Valor',
  formatValue = (value) => `R$ ${value.toFixed(2)}`,
  showTrend = true,
}: FinancialLineChartProps) {
  // Calculate trend
  const calculateTrend = () => {
    if (data.length < 2) return { percentage: 0, isPositive: true };
    
    const firstValue = data[0]?.value || 0;
    const lastValue = data[data.length - 1]?.value || 0;
    
    if (firstValue === 0) return { percentage: 0, isPositive: lastValue >= 0 };
    
    const percentage = ((lastValue - firstValue) / firstValue) * 100;
    return {
      percentage: Math.abs(percentage),
      isPositive: percentage >= 0,
    };
  };

  const trend = calculateTrend();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">{payload[0].payload.label || payload[0].payload.date}</p>
          <p className="text-sm font-bold" style={{ color }}>
            {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          {showTrend && data.length > 1 && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {trend.percentage.toFixed(1)}%
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => formatValue(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={() => valueLabel}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
              name={valueLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
