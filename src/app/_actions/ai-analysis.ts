'use server'

import { openai } from "@/lib/ai/openai";
import { createClient } from "@/lib/supabase/server";

interface LeadDetails {
    tenant_id: string;
    profile_id: string;
    name: string;
    phone: string;
    source?: string;
    interactions: string[];
}

/**
 * Server Action para analisar a probabilidade de fechamento de um lead.
 * Registra o consumo em ai_usage após a chamada.
 */
export async function analyzeLeadProbability(details: LeadDetails) {
    try {
        const prompt = `Analise este lead de venda de veículos e determine a probabilidade de fechamento (0-100%).
    Nome: ${details.name}
    Origem: ${details.source || 'Não informada'}
    Interações: ${details.interactions.join(' | ')}
    
    Retorne apenas um resumo conciso e a porcentagem.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Você é um especialista em vendas de veículos." },
                { role: "user", content: prompt }
            ],
        });

        const text = completion.choices[0]?.message?.content || "Não foi possível gerar análise.";
        const supabase = await createClient();

        // Registro de consumo em ai_usage
        await supabase.from('ai_usage').insert({
            tenant_id: details.tenant_id,
            profile_id: details.profile_id,
            model: "gpt-4o-mini",
            total_tokens: completion.usage?.total_tokens || 0,
            feature_context: "lead_analysis"
        });

        return { success: true, analysis: text };
    } catch (error: any) {
        console.error("AI Analysis Error (OpenAI):", error.message);
        throw new Error("Falha na análise de IA.");
    }
}
