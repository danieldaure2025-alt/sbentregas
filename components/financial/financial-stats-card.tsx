'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialStatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
        label?: string;
    };
    color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan';
    formatValue?: (value: number | string) => string;
}

const colorVariants = {
    blue: {
        icon: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950',
        trend: {
            positive: 'text-blue-600',
            negative: 'text-blue-600',
        },
    },
    green: {
        icon: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-950',
        trend: {
            positive: 'text-green-600',
            negative: 'text-green-600',
        },
    },
    orange: {
        icon: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-950',
        trend: {
            positive: 'text-orange-600',
            negative: 'text-orange-600',
        },
    },
    red: {
        icon: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-950',
        trend: {
            positive: 'text-red-600',
            negative: 'text-red-600',
        },
    },
    purple: {
        icon: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-950',
        trend: {
            positive: 'text-purple-600',
            negative: 'text-purple-600',
        },
    },
    cyan: {
        icon: 'text-cyan-600 dark:text-cyan-400',
        bg: 'bg-cyan-50 dark:bg-cyan-950',
        trend: {
            positive: 'text-cyan-600',
            negative: 'text-cyan-600',
        },
    },
};

export function FinancialStatsCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    color = 'blue',
    formatValue,
}: FinancialStatsCardProps) {
    const colors = colorVariants[color];
    const displayValue = formatValue ? formatValue(value) : value;

    return (
        <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={cn('p-2 rounded-lg', colors.bg)}>
                    <Icon className={cn('h-5 w-5', colors.icon)} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-1">
                    <div className="text-2xl font-bold tracking-tight">
                        {displayValue}
                    </div>

                    {(description || trend) && (
                        <div className="flex items-center gap-2 text-xs">
                            {trend && (
                                <div
                                    className={cn(
                                        'flex items-center gap-1 font-medium',
                                        trend.isPositive ? 'text-green-600' : 'text-red-600'
                                    )}
                                >
                                    {trend.isPositive ? (
                                        <TrendingUp className="h-3 w-3" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3" />
                                    )}
                                    <span>
                                        {trend.isPositive ? '+' : '-'}
                                        {Math.abs(trend.value).toFixed(1)}%
                                    </span>
                                    {trend.label && (
                                        <span className="text-muted-foreground">
                                            {trend.label}
                                        </span>
                                    )}
                                </div>
                            )}

                            {description && !trend && (
                                <p className="text-muted-foreground">{description}</p>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
