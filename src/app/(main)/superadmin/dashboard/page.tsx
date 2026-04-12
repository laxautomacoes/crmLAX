'use server'

import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { Users, Building2, BrainCircuit, CreditCard } from 'lucide-react'

export default async function SuperadminDashboardPage() {
    const supabase = await createClient()

    // 1. Total Tenants
    const { count: tenantCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })

    // 2. Total Users
    const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    // 3. AI Usage (Total tokens)
    const { data: aiUsage } = await supabase
        .from('ai_usage')
        .select('total_tokens')
    
    const totalTokens = aiUsage?.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0) || 0

    const stats = [
        { label: 'Total de Empresas', value: tenantCount || 0, icon: Building2, color: 'text-blue-500' },
        { label: 'Total de Usuários', value: userCount || 0, icon: Users, color: 'text-green-500' },
        { label: 'Uso Global de IA', value: `${(totalTokens / 1000).toFixed(1)}k tokens`, icon: BrainCircuit, color: 'text-purple-500' },
        { label: 'Faturamento Mensal', value: 'R$ --', icon: CreditCard, color: 'text-amber-500' },
    ]

    return (
        <div className="space-y-8">
            <PageHeader 
                title="Painel de Controle SaaS" 
                subtitle="Visão geral de toda a plataforma CRM LAX"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Acumulado</span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <div className="bg-card p-6 rounded-xl border border-border">
                    <h3 className="text-lg font-bold mb-4">Atividade Recente</h3>
                    <div className="text-sm text-muted-foreground italic">
                        Funcionalidade em desenvolvimento... (Logs de sistema aparecerão aqui)
                    </div>
                </div>
                
                <div className="bg-card p-6 rounded-xl border border-border">
                    <h3 className="text-lg font-bold mb-4">Distribuição por Plano</h3>
                    <div className="text-sm text-muted-foreground italic">
                        Funcionalidade em desenvolvimento... (Gráfico de pizzas aparecerá aqui)
                    </div>
                </div>
            </div>
        </div>
    )
}
