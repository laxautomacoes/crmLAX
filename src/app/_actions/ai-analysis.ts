'use server'

import { aiModel } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";
import { requirePlanFeature } from "@/lib/utils/plan-guard";

interface LeadDetails {
    tenant_id: string;
    profile_id: string;
    name: string;
    phone: string;
    source?: string;
    interactions: string[];
}

/**
 * Analisa a probabilidade de fechamento de um lead via Gemini.
 * Requer plano Pro. Registra consumo em ai_usage.
 */
export async function analyzeLeadProbability(details: LeadDetails) {
    await requirePlanFeature(details.tenant_id, 'ai');

    const prompt = `Você é um especialista no mercado imobiliário brasileiro.
Analise este lead e determine a probabilidade de fechamento (0-100%).

Nome: ${details.name}
Origem: ${details.source || 'Não informada'}
Interações registradas: ${details.interactions.length > 0 ? details.interactions.join(' | ') : 'Nenhuma ainda'}

Retorne:
1. Probabilidade: X%
2. Resumo conciso (2-3 frases) sobre o perfil e principais sinais de interesse ou desinteresse.`;

    try {
        const result = await aiModel.generateContent(prompt);
        const text = result.response.text();
        const supabase = await createClient();

        await supabase.from('ai_usage').insert({
            tenant_id: details.tenant_id,
            profile_id: details.profile_id,
            model: 'gemini-2.0-flash',
            total_tokens: result.response.usageMetadata?.totalTokenCount || 0,
            feature_context: 'lead_analysis'
        });

        return { success: true, analysis: text };
    } catch (error: any) {
        console.error('AI Lead Analysis Error (Gemini):', error.message);
        throw new Error('Falha na análise de IA do lead.');
    }
}
