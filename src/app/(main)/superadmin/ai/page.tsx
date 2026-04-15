import { createClient } from "@/lib/supabase/server";
import { getAIUsageStats, getAIPlanConfigs, getDetailedAIUsage } from "@/app/_actions/ai-usage";
import { AIUsageStats } from "@/components/settings/ias/AIUsageStats";
import { AIUsageChart } from "@/components/settings/ias/AIUsageChart";
import { AIPlanConfig } from "@/components/settings/ias/AIPlanConfig";
import { AIUsageTable } from "@/components/settings/ias/AIUsageTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function SuperadminAIPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isSuperadmin = ['superadmin', 'super_admin', 'super administrador'].includes(profile?.role?.toLowerCase() || '');

    if (!isSuperadmin) {
        redirect('/dashboard');
    }
    
    const [stats, detailedUsage, planConfigs] = await Promise.all([
        getAIUsageStats(),
        getDetailedAIUsage(100), // Mais logs para superadmin
        getAIPlanConfigs()
    ]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-12">
            <PageHeader 
                title="Inteligência Artificial"
                subtitle="Gestão centralizada de infraestrutura neural e monitoramento global de consumo."
            />

            {/* Stats Grid */}
            <AIUsageStats stats={stats} />

            {/* Configuração Section */}
            {planConfigs.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <span className="h-6 w-1 bg-[#FFE600] rounded-full" />
                        <h3 className="text-xl font-bold text-[#404F4F]">Configuração Estratégica</h3>
                    </div>
                    <AIPlanConfig configs={planConfigs as any} />
                </div>
            )}

            {/* Activity & Performance Section */}
            <div className="space-y-8">
                <div className="flex items-center gap-2">
                    <span className="h-6 w-1 bg-[#FFE600] rounded-full" />
                    <h3 className="text-xl font-bold text-[#404F4F]">Análise de Performance Global</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-12">
                    <AIUsageChart data={stats.usage_by_day} />
                    <AIUsageTable records={detailedUsage as any[]} isSuperadmin={true} />
                </div>
            </div>
        </div>
    );
}
