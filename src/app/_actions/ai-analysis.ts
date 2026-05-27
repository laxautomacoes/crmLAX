'use server'

import { runAI } from "@/lib/ai/factory";
import { createClient } from "@/lib/supabase/server";
import { requirePlanFeature } from "@/lib/utils/plan-guard";

interface LeadDetails {
    tenant_id: string;
    profile_id: string;
    name: string;
    phone: string;
    source?: string;
    interactions: string[];
    lead_temperature?: string;
    days_since_interaction?: number | null;
}

/**
 * Analisa a probabilidade de fechamento de um lead usando o provedor de IA configurado.
 * Requer plano Pro. Registra consumo em ai_usage.
 */
export async function analyzeLeadProbability(details: LeadDetails) {
    await requirePlanFeature(details.tenant_id, 'ai');

    const temperatureContext = details.lead_temperature 
        ? `\nClassificação de Engajamento: ${details.lead_temperature}${details.days_since_interaction != null ? ` (${details.days_since_interaction} dias desde a última interação)` : ''}`
        : '';

    const prompt = `Você é um especialista no mercado imobiliário brasileiro.
Analise este lead e determine a probabilidade de fechamento (0-100%).

Nome: ${details.name}
Origem: ${details.source || 'Não informada'}
Interações registradas: ${details.interactions.length > 0 ? details.interactions.join(' | ') : 'Nenhuma ainda'}${temperatureContext}

Retorne:
1. Probabilidade: X%
2. Resumo conciso (2-3 frases) sobre o perfil e principais sinais de interesse ou desinteresse.
3. Se o lead estiver morno, frio ou inativo, inclua uma recomendação de ação para retomar o engajamento.`;

    try {
        const result = await runAI(details.tenant_id, prompt);
        const supabase = await createClient();

        await supabase.from('ai_usage').insert({
            tenant_id: details.tenant_id,
            profile_id: details.profile_id,
            model: result.model,
            total_tokens: result.usage.total_tokens,
            feature_context: 'lead_analysis'
        });

        return { success: true, analysis: result.text };
    } catch (error: any) {
        console.error('AI Lead Analysis Error:', error.message);
        throw new Error('Falha na análise de IA do lead.');
    }
}
