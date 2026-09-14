'use server';

import { runAI } from "@/lib/ai/factory";
import { createClient } from "@/lib/supabase/server";
import { requirePlanFeature } from "@/lib/utils/plan-guard";

export interface ViabilityMetrics {
    appreciationRate: number; // e.g. 15 (means 15% per year)
    appreciationSource: string; // e.g. "FipeZap 2023"
    rentalYield: number; // e.g. 0.5 (means 0.5% per month)
    rentalSource: string;
    averagePricePerSqm: number;
}

export async function analyzeViabilityMetrics(city: string, neighborhood: string, propertyType: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
        if (!profile) throw new Error("Perfil não encontrado");

        await requirePlanFeature(profile.tenant_id, 'ai');

        const serperKey = process.env.SERPER_API_KEY;
        if (!serperKey) throw new Error("Chave Serper não configurada.");

        // Busca 1: Valorização imobiliária
        const queryVal = `valorização imobiliária m2 ${neighborhood} ${city} índice fipezap anual`.trim().replace(/\s+/g, ' ');
        const serperResVal = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
            body: JSON.stringify({ q: queryVal, gl: "br", hl: "pt-br", num: 10 })
        });
        const serperDataVal = await serperResVal.json();

        // Busca 2: Rentabilidade (Yield) de aluguel
        const queryRent = `rentabilidade aluguel yield mensal ${propertyType} ${neighborhood} ${city}`.trim().replace(/\s+/g, ' ');
        const serperResRent = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
            body: JSON.stringify({ q: queryRent, gl: "br", hl: "pt-br", num: 10 })
        });
        const serperDataRent = await serperResRent.json();

        const prompt = `Você é um analista de investimentos imobiliários.
Analise os resultados brutos de busca abaixo para estimar a valorização anual e rentabilidade mensal de aluguel (yield) na região especificada.

LOCALIZAÇÃO: ${neighborhood}, ${city}
TIPO: ${propertyType}

RESULTADOS DA BUSCA (Valorização):
${JSON.stringify((serperDataVal.organic || []).map((r: any) => ({ t: r.title, s: r.snippet })).slice(0, 5))}

RESULTADOS DA BUSCA (Rentabilidade Aluguel):
${JSON.stringify((serperDataRent.organic || []).map((r: any) => ({ t: r.title, s: r.snippet })).slice(0, 5))}

REGRAS:
1. "appreciationRate": Extraia ou estime um valor realista de valorização ANUAL em %. Se não houver dados exatos, use uma média de mercado para o estado/cidade (ex: 12.5). Retorne apenas o número.
2. "rentalYield": Extraia ou estime um valor realista de rentabilidade MENSAL (Yield) em %. Valores normais variam de 0.3 a 0.8. Retorne apenas o número (ex: 0.5).
3. Especifique fontes resumidas ("FipeZap", "Notícias Locais", "Estimativa IA").
4. "averagePricePerSqm": Tente encontrar o valor médio do m² na região, ou retorne 0.

Retorne EXATAMENTE um objeto JSON:
{
  "appreciationRate": number,
  "appreciationSource": "string",
  "rentalYield": number,
  "rentalSource": "string",
  "averagePricePerSqm": number
}`;

        const result = await runAI(profile.tenant_id, prompt);
        const cleanJson = result.text.replace(/```json|```/g, '').trim();
        const data: ViabilityMetrics = JSON.parse(cleanJson);

        await supabase.from('ai_usage').insert({
            tenant_id: profile.tenant_id,
            profile_id: user.id,
            model: result.model,
            total_tokens: result.usage.total_tokens,
            feature_context: 'viability_analysis'
        });

        return { success: true, data };
    } catch (error: any) {
        console.error('Viability AI Error:', error);
        return { success: false, error: error.message };
    }
}
