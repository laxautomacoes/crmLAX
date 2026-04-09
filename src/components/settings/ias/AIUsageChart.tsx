'use client'

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

interface ChartProps {
    data: Record<string, { gpt: number, gemini: number }>;
}

export function AIUsageChart({ data }: ChartProps) {
    const chartData = Object.entries(data)
        .map(([date, counts]) => ({
            date: date.split('-').reverse().slice(0, 2).join('/'), // DD/MM
            fullDate: date,
            gpt: counts.gpt,
            gemini: counts.gemini
        }))
        .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900">Histórico de Atividade</h3>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">REQUISIÇÕES DOS ÚLTIMOS 15 DIAS</p>
                </div>
            </div>

            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorGpt" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.05}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorGemini" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.05}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                            dy={15}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                borderRadius: '16px', 
                                border: '1px solid #f1f5f9', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
                                padding: '12px',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}
                            cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                        />
                        <Legend 
                            verticalAlign="top" 
                            align="right" 
                            height={40} 
                            iconType="circle" 
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }} 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="gpt" 
                            name="GPT-4O"
                            stroke="#10b981" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorGpt)" 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="gemini" 
                            name="GEMINI-2.0"
                            stroke="#6366f1" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorGemini)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
