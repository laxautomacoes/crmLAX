'use server'

import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { User, Building, Cpu, CreditCard, Activity } from 'lucide-react'
import { PlanDistributionChart } from '@/components/superadmin/PlanDistributionChart'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function SuperadminDashboardPage() {
    const supabase = await createClient()

    // 1. Total Tenants (Excluindo o dono do sistema)
    const { count: tenantCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('is_system', false)

    // 2. Total Usuários (Excluindo usuários do sistema)
    const { data: systemTenants } = await supabase.from('tenants').select('id').eq('is_system', true)
    const systemTenantIds = systemTenants?.map(t => t.id) || []

    const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('tenant_id', 'in', `(${systemTenantIds.join(',')})`)

    // 3. AI Usage (Total tokens)
    const { data: aiUsage } = await supabase
        .from('ai_usage')
        .select('total_tokens')
    
    const totalTokens = aiUsage?.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0) || 0

    const stats = [
        { label: 'Total de Empresas', value: tenantCount || 0, icon: Building },
        { label: 'Total de Usuários', value: userCount || 0, icon: User },
        { label: 'Uso Global de IA', value: `${(totalTokens / 1000).toFixed(1)}k tokens`, icon: Cpu },
        { label: 'Faturamento Mensal', value: 'R$ --', icon: CreditCard },
    ]

    // 4. Recent Activity
    const { data: recentLogs } = await supabase
        .from('system_logs')
        .select(`
            id,
            action,
            created_at,
            details,
            profiles(full_name),
            tenants(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

    // 5. Plan Distribution
    const { data: plansData } = await supabase
        .from('tenants')
        .select('plan_type')
        .eq('is_system', false)

    const counts = (plansData || []).reduce((acc: Record<string, number>, curr) => {
        const type = curr.plan_type || 'freemium'
        acc[type] = (acc[type] || 0) + 1
        return acc
    }, {})

    const distribution = Object.entries(counts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
    }))

    return (
        <div className="space-y-8">
            <PageHeader 
                title="Painel de Controle" 
                subtitle="Visão geral de toda a plataforma CRM LAX"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <stat.icon className="w-8 h-8 text-[#404F4F] opacity-70" />
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
                <div className="bg-card p-6 rounded-2xl border border-border flex flex-col h-full">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#404F4F]" />
                        Atividade Recente
                    </h3>
                    <div className="space-y-6 flex-1">
                        {recentLogs && recentLogs.length > 0 ? (
                            recentLogs.map((log: any) => (
                                <div key={log.id} className="flex gap-4">
                                    <div className="mt-1">
                                        <div className="w-2 h-2 rounded-full bg-[#FFE600]" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            <span className="font-bold">{(log.profiles as any)?.full_name || 'Sistema'}</span>{' '}
                                            <span className="text-muted-foreground">fez {(log.details as any)?.message || log.action}</span>
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-semibold uppercase text-[10px] tracking-wide bg-muted px-1.5 py-0.5 rounded">
                                                {(log.tenants as any)?.name || 'Global'}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground italic h-full flex items-center justify-center">
                                Nenhuma atividade registrada recentemente.
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="bg-card p-6 rounded-2xl border border-border">
                    <h3 className="text-lg font-bold mb-4">Distribuição por Plano</h3>
                    <div className="mt-2 text-center">
                        <PlanDistributionChart data={distribution} />
                    </div>
                </div>
            </div>
        </div>
    )
}
