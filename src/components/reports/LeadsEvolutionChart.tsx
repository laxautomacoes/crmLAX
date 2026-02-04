'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LeadsEvolutionChartProps {
    data: Array<{
        date: string;
        count: number;
    }>;
}

export default function LeadsEvolutionChart({ data }: LeadsEvolutionChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum dado disponível.</p>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 h-[400px] flex flex-col">
            <h3 className="text-lg font-bold text-foreground mb-4">Evolução de Leads</h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#404F4F" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#404F4F" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={10}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--card)',
                                borderColor: 'var(--border)',
                                borderRadius: '8px',
                                color: 'var(--foreground)'
                            }}
                            itemStyle={{ color: 'var(--foreground)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#404F4F"
                            fillOpacity={1}
                            fill="url(#colorCount)"
                            strokeWidth={3}
                            name="Leads"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
