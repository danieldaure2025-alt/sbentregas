'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, X } from 'lucide-react';

export interface DateRange {
    startDate?: string;
    endDate?: string;
}

interface DateRangeFilterProps {
    onDateChange: (range: DateRange) => void;
    defaultPeriod?: 'day' | 'week' | 'month' | 'all' | 'custom';
}

export function DateRangeFilter({ onDateChange, defaultPeriod = 'month' }: DateRangeFilterProps) {
    const [period, setPeriod] = useState<string>(defaultPeriod);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    const handlePeriodChange = (newPeriod: string) => {
        setPeriod(newPeriod);

        if (newPeriod === 'custom') {
            setShowCustom(true);
            return;
        }

        setShowCustom(false);
        setStartDate('');
        setEndDate('');

        // Calcular datas automáticas baseadas no período
        const now = new Date();
        let start: Date | undefined;

        switch (newPeriod) {
            case 'day':
                start = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                const diff = now.getDate() - dayOfWeek;
                start = new Date(now.setDate(diff));
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'all':
                // Sem filtro de data
                break;
        }

        if (start) {
            onDateChange({
                startDate: start.toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
            });
        } else {
            onDateChange({});
        }
    };

    const handleCustomDateApply = () => {
        if (startDate && endDate) {
            if (new Date(endDate) < new Date(startDate)) {
                alert('A data final deve ser maior ou igual à data inicial');
                return;
            }
            onDateChange({ startDate, endDate });
        }
    };

    const handleClearCustom = () => {
        setStartDate('');
        setEndDate('');
        setShowCustom(false);
        setPeriod('month');
        handlePeriodChange('month');
    };

    const selectClass = "w-full h-10 rounded-md border px-3 py-2 text-sm bg-[hsl(220,15%,13%)] border-[hsl(220,15%,20%)] text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none";
    const inputClass = "bg-[hsl(220,15%,13%)] border-[hsl(220,15%,20%)] text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20";

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                <select
                    value={period}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    className={selectClass}
                >
                    <option value="day">Hoje</option>
                    <option value="week">Esta Semana</option>
                    <option value="month">Este Mês</option>
                    <option value="all">Todo Período</option>
                    <option value="custom">Período Customizado</option>
                </select>
            </div>

            {showCustom && (
                <div className="p-4 rounded-lg bg-[hsl(220,15%,13%)] border border-[hsl(220,15%,20%)] space-y-3">
                    <div className="flex justify-between items-center">
                        <Label className="text-white font-semibold">Período Customizado</Label>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleClearCustom}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-gray-300 text-sm">Data Inicial</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={inputClass + " mt-1"}
                            />
                        </div>
                        <div>
                            <Label className="text-gray-300 text-sm">Data Final</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={inputClass + " mt-1"}
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleCustomDateApply}
                        disabled={!startDate || !endDate}
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        size="sm"
                    >
                        Aplicar Filtro
                    </Button>
                </div>
            )}
        </div>
    );
}
