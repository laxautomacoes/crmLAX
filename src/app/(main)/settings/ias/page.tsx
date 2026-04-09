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
        <div className="flex-1 space-y-10 p-8 pt-10 bg-[#fafafa]">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 font-outfit">Inteligência Artificial</h2>
                    <p className="text-sm text-slate-500">
                        Gerencie a infraestrutura neural e o consumo de IA do sistema.
                    </p>
                </div>
            </div>

            <AIUsageStats stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    <AIUsageChart data={stats.usage_by_day} />
                </div>
                <div className="lg:col-span-1">
                    {isSuperadmin && planConfigs.length > 0 ? (
                        <AIPlanConfig configs={planConfigs as any} />
                    ) : (
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center h-full">
                            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                                <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Monitoramento Ativo</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Seu acesso à IA está configurado globalmente. O consumo é monitorado por requisição.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4">
                <AIUsageTable records={detailedUsage as any[]} isSuperadmin={isSuperadmin} />
            </div>
        </div>
    );
}
