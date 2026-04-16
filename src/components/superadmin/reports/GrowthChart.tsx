'use client'

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

interface GrowthChartProps {
  data: {
    month: string
    total: number
    new: number
  }[]
}

export function GrowthChart({ data }: GrowthChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic">
        Sem dados de crescimento
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FFE600" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#FFE600" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#404F4F" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#404F4F" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 500, fill: '#64748b' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 500, fill: '#64748b' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
              padding: '12px'
            }}
            cursor={{ stroke: '#FFE600', strokeWidth: 2 }}
          />
          <Area 
            type="monotone" 
            dataKey="total" 
            name="Total de Empresas"
            stroke="#FFE600" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorTotal)" 
            animationDuration={1500}
          />
          <Area 
            type="monotone" 
            dataKey="new" 
            name="Novos Cadastros"
            stroke="#404F4F" 
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorNew)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
