'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
    name: string;
    value: number;
    color?: string;
}

interface FinancialPieChartProps {
    data: DataPoint[];
    title: string;
    description?: string;
    colors?: string[];
    formatValue?: (value: number) => string;
    showPercentage?: boolean;
}

const DEFAULT_COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
];

export function FinancialPieChart({
    data,
    title,
    description,
    colors = DEFAULT_COLORS,
    formatValue = (value) => `R$ ${value.toFixed(2)}`,
    showPercentage = true,
}: FinancialPieChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0];
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;

            return (
                <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-sm font-bold" style={{ color: item.payload.fill }}>
                        {formatValue(item.value)}
                    </p>
                    {showPercentage && (
                        <p className="text-xs text-muted-foreground">
                            {percentage}% do total
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null; // Don't show label if slice is too small

        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-xs font-bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // Prepare data with colors
    const chartData = data.map((item, index) => ({
        ...item,
        fill: item.color || colors[index % colors.length],
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        Nenhum dado disponível
                    </div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={showPercentage ? CustomLabel : false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value, entry: any) => {
                                        const item = chartData.find(d => d.name === value);
                                        if (item) {
                                            return `${value} (${formatValue(item.value)})`;
                                        }
                                        return value;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Summary */}
                        <div className="mt-4 pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Total</span>
                                <span className="text-lg font-bold">{formatValue(total)}</span>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
