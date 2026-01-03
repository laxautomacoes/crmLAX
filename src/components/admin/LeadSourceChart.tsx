'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LeadSourceData {
    source: string;
    count: number;
}

interface LeadSourceChartProps {
    data: LeadSourceData[];
}

/**
 * Componente de gráfico de barras para visualizar leads agrupados por origem.
 * Usa a cor primária #404F4F do design system.
 */
export default function LeadSourceChart({ data }: LeadSourceChartProps) {
    return (
        <div className="w-full h-80 p-4 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 text-[#404F4F]">Leads por Origem</h2>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#404F4F" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
