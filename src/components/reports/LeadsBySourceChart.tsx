'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface LeadsBySourceChartProps {
    data: Array<{
        name: string;
        value: number;
        fill: string;
    }>;
}

export default function LeadsBySourceChart({ data }: LeadsBySourceChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum dado disponível.</p>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 h-[400px] flex flex-col">
            <h3 className="text-lg font-bold text-foreground mb-4">Leads por Origem</h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--card)',
                                borderColor: 'var(--border)',
                                borderRadius: '8px',
                                color: 'var(--foreground)'
                            }}
                            itemStyle={{ color: 'var(--foreground)' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ paddingTop: '20px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
