import { createClient } from "@/lib/supabase/server";
import { getAIUsageStats, getAIPlanConfigs, getDetailedAIUsage } from "@/app/_actions/ai-usage";
import { AIUsageStats } from "@/components/settings/ias/AIUsageStats";
import { AIUsageChart } from "@/components/settings/ias/AIUsageChart";
import { AIPlanConfig } from "@/components/settings/ias/AIPlanConfig";
import { AIUsageTable } from "@/components/settings/ias/AIUsageTable";
import { redirect } from "next/navigation";

export default async function AIConfigurationPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role === 'user') {
        redirect('/dashboard');
    }

    const isSuperadmin = profile?.role === 'superadmin';
    
    const [stats, detailedUsage, planConfigs] = await Promise.all([
        getAIUsageStats(),
        getDetailedAIUsage(50),
        isSuperadmin ? getAIPlanConfigs() : Promise.resolve([])
    ]);

    return (
        <div className="flex-1 min-h-screen bg-[#fafafa] p-8 pt-12">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header Section */}
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Inteligência Artificial</h2>
                    <p className="text-sm text-slate-500 font-medium">
                        Gestão centralizada de infraestrutura neural e monitoramento de consumo.
                    </p>
                </div>

                {/* Stats Grid */}
                <AIUsageStats stats={stats} />

                {/* Configuration Section (Superadmin Only) */}
                {isSuperadmin && planConfigs.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <span className="h-6 w-1 bg-indigo-500 rounded-full" />
                            <h3 className="text-xl font-bold text-slate-900">Configuração Estratégica</h3>
                        </div>
                        <AIPlanConfig configs={planConfigs as any} />
                    </div>
                )}

                {/* Activity & Performance Section */}
                <div className="space-y-8">
                    <div className="flex items-center gap-2">
                        <span className="h-6 w-1 bg-indigo-500 rounded-full" />
                        <h3 className="text-xl font-bold text-slate-900">Análise de Performance</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-12">
                        <AIUsageChart data={stats.usage_by_day} />
                        <AIUsageTable records={detailedUsage as any[]} isSuperadmin={isSuperadmin} />
                    </div>
                </div>
            </div>
        </div>
    );
}
