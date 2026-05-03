import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { 
  Building, 
  Users, 
  Cpu, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  BarChart3
} from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { GrowthChart } from '@/components/superadmin/reports/GrowthChart'
import { PlanDistributionChart } from '@/components/superadmin/PlanDistributionChart'

export default async function SuperadminReportsPage() {
  const supabase = await createClient()

  // 1. Fetch Tenants for Growth and Distribution
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, plan_type, created_at, status')
    .eq('is_system', false)

  // 2. Fetch AI Usage
  const { data: aiUsage } = await supabase
    .from('ai_usage')
    .select('total_tokens, tenant_id, tenants(name)')
  
  // 3. Fetch Lead creation count (Global)
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  // 4. Calculate Stats
  const activeTenants = tenants?.filter((t: any) => t.status === 'active')?.length || 0
  const totalTenants = tenants?.length || 0
  const suspendedTenants = totalTenants - activeTenants

  // MRR Estimation (Hardcoded values from DB check)
  const pricing: Record<string, number> = {
    'pro': 247,
    'starter': 97,
    'freemium': 0
  }

  const estimatedMRR = tenants?.reduce((acc: number, t: any) => {
    if (t.status === 'active') {
      return acc + (pricing[t.plan_type || 'freemium'] || 0)
    }
    return acc
  }, 0) || 0

  // 5. Growth Data (Last 6 months)
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i)
    return {
      name: format(date, 'MMM', { locale: ptBR }),
      monthStart: startOfMonth(date),
      monthEnd: endOfMonth(date),
      count: 0
    }
  }).reverse()

  tenants?.forEach((t: any) => {
    const createdDate = new Date(t.created_at)
    last6Months.forEach(m => {
      if (createdDate >= m.monthStart && createdDate <= m.monthEnd) {
        m.count++
      }
    })
  })

  // Cumulative Growth
  const growthData = last6Months.reduce<Array<{ month: string; total: number; new: number }>>((acc, m) => {
    const previousTotal = acc.length > 0 ? acc[acc.length - 1].total : 0
    return [
      ...acc,
      {
        month: m.name,
        total: previousTotal + m.count,
        new: m.count
      }
    ]
  }, [])

  // 6. AI Usage Ranking
  const aiRankingMap = new Map()
  aiUsage?.forEach((u: any) => {
    const tenantName = (u.tenants as any)?.name || 'Desconhecido'
    const current = aiRankingMap.get(tenantName) || 0
    aiRankingMap.set(tenantName, current + (u.total_tokens || 0))
  })

  const aiRanking = Array.from(aiRankingMap.entries())
    .map(([name, tokens]: [string, number]) => ({ name, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5)

  // 7. Plan Distribution for Chart
  const planCounts = tenants?.reduce((acc: Record<string, number>, curr: any) => {
    const type = curr.plan_type || 'freemium'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {}) || {}

  const distribution = Object.entries(planCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value as number
  }))

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <PageHeader 
        title="Relatórios Estratégicos" 
        subtitle="Métricas globais de desempenho e crescimento da plataforma"
      />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Empresas Ativas" 
          value={activeTenants} 
          subValue={`${totalTenants} total`}
          icon={Building}
          trend="+5%" 
        />
        <StatCard 
          label="MRR Estimado" 
          value={`R$ ${estimatedMRR.toLocaleString('pt-BR')}`} 
          subValue="Receita Mensal"
          icon={TrendingUp}
          color="success"
        />
        <StatCard 
          label="Total de Leads" 
          value={totalLeads || 0} 
          subValue="Capturados globalmente"
          icon={Users}
        />
        <StatCard 
          label="Susspensos" 
          value={suspendedTenants} 
          subValue="Inadimplentes ou outros"
          icon={AlertCircle}
          color="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Growth Chart - Placeholder for now, will create real component next */}
        <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-[#404F4F]">
              <BarChart3 className="w-5 h-5" />
              Crescimento de Tenants
            </h3>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider bg-muted px-2 py-1 rounded">
              Últimos 6 meses
            </div>
          </div>
          <div className="h-[300px] w-full">
            <GrowthChart data={growthData} />
          </div>
        </div>

        {/* AI Ranking */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[#404F4F]">
            <Cpu className="w-5 h-5" />
            Top Uso de IA
          </h3>
          <div className="space-y-4">
            {aiRanking.map((item, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-sm font-bold truncate max-w-[150px]">{item.name}</p>
                  <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#FFE600] rounded-full transition-all duration-1000"
                      style={{ width: `${(item.tokens / (aiRanking[0].tokens || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-medium text-[#404F4F]">
                    {(item.tokens / 1000).toFixed(1)}k
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">tokens</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-2 text-xs font-bold text-[#404F4F] bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100">
            Ver Relatório Completo de IA
          </button>
        </div>
      </div>

      {/* Detailed Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
           <h3 className="text-lg font-bold mb-4 text-[#404F4F]">Distribuição por Plano</h3>
           <PlanDistributionChart data={distribution} />
        </div>
        
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-[#404F4F]">Saúde das Contas (Resumo)</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-sm font-bold text-emerald-700">Contas Ativas</span>
                    <span className="text-lg font-black text-emerald-800">{activeTenants}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <span className="text-sm font-bold text-rose-700">Contas Suspensas</span>
                    <span className="text-lg font-black text-rose-800">{suspendedTenants}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-sm font-bold text-slate-700">Taxa de Conversão Plano Pro</span>
                    <span className="text-lg font-black text-slate-800">
                        {((tenants?.filter((t: any) => t.plan_type === 'pro').length || 0) / (totalTenants || 1) * 100).toFixed(1)}%
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* Tenant Health Preview */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#404F4F]">Saúde das Contas (Mais recentes)</h3>
            <span className="text-xs text-muted-foreground">Monitoramento de Status e Planos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Tenant</th>
                <th className="pb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Plano</th>
                <th className="pb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                <th className="pb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants?.slice(0, 5).map((tenant: any) => (
                <tr key={tenant.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-4">
                    <p className="text-sm font-bold text-[#404F4F]">{tenant.name}</p>
                    <p className="text-[10px] text-muted-foreground">ID: {tenant.id.slice(0, 8)}...</p>
                  </td>
                  <td className="py-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                      tenant.plan_type === 'pro' ? 'bg-[#FFE600] text-[#404F4F]' :
                      tenant.plan_type === 'starter' ? 'bg-[#404F4F] text-white' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {tenant.plan_type}
                    </span>
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex justify-center">
                        {tenant.status === 'active' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, subValue, icon: Icon, trend, color }: any) {
  const colorMap: any = {
    success: 'text-emerald-500',
    danger: 'text-rose-500',
    default: 'text-[#404F4F]'
  }

  return (
    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:border-slate-300 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl bg-slate-50 group-hover:bg-[#FFE600]/10 transition-colors`}>
          <Icon className={`w-5 h-5 ${color ? colorMap[color] : 'text-[#404F4F]'}`} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-black text-[#404F4F] tracking-tight">{value}</h3>
        <p className="text-[13px] font-bold text-slate-800">{label}</p>
        <p className="text-[11px] text-muted-foreground">{subValue}</p>
      </div>
    </div>
  )
}
