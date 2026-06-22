import { createClient } from "@/lib/supabase/server";
import { getAIUsageStats, getAIPlanConfigs, getDetailedAIUsage } from "@/app/_actions/ai-usage";
import { AIUsageStats } from "@/components/settings/ias/AIUsageStats";
import { AIUsageChart } from "@/components/settings/ias/AIUsageChart";
import { AIPlanConfig } from "@/components/settings/ias/AIPlanConfig";
import { AIUsageTable } from "@/components/settings/ias/AIUsageTable";
import { AISystemPromptManager } from "@/components/settings/ias/AISystemPromptManager";
import { getAIPrompts } from "@/app/_actions/ai-prompts";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";

export default async function AIConfigurationPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (profile?.role === 'user') {
        redirect('/dashboard');
    }

    const isSuperadmin = profile?.role === 'superadmin';
    
    const [stats, detailedUsage, planConfigs, tenantPrompts] = await Promise.all([
        getAIUsageStats(),
        getDetailedAIUsage(50),
        isSuperadmin ? getAIPlanConfigs() : Promise.resolve([]),
        getAIPrompts(profile.tenant_id) // Add tenant prompts  
    ]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <PageHeader 
                title="Inteligência Artificial"
                subtitle="Gestão centralizada de infraestrutura neural e monitoramento de consumo."
            />

            <hr className="hidden md:block border-border -mt-2" />

                {/* Stats Grid */}
                <AIUsageStats stats={stats} />

                {/* Configuration Section (Superadmin Only) */}
                {isSuperadmin && planConfigs.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <span className="h-6 w-1 bg-secondary rounded-full" />
                            <h3 className="text-xl font-bold text-foreground">Configuração Estratégica</h3>
                        </div>
                        <AIPlanConfig configs={planConfigs as any} />
                    </div>
                )}

                {/* Activity & Performance Section */}
                <div className="py-2 md:py-4">
                    <hr className="border-border/60" />
                </div>

                <AISystemPromptManager prompts={tenantPrompts} tenantId={profile.tenant_id} isSuperadmin={false} />
                
                <div className="py-2 md:py-4">
                    <hr className="border-border/60" />
                </div>

                <AIUsageChart data={stats.usage_by_day} />

                <div className="py-2 md:py-4">
                    <hr className="border-border/60" />
                </div>

                <AIUsageTable records={detailedUsage as any[]} isSuperadmin={isSuperadmin} />
        </div>
    );
}
