'use server'

import { getAIModel } from '@/lib/ai/gemini';
import { createClient } from '@/lib/supabase/server';
import { requirePlanFeature } from '@/lib/utils/plan-guard';

interface AssetMatch {
    asset_id: string;
    score: number;
    reason: string;
}

interface MatchingResult {
    matches: AssetMatch[];
    lead_profile_summary: string;
}

/**
 * Motor de Matchmaking: analisa o perfil do lead e ranqueia os
 * imóveis do tenant por compatibilidade. Requer plano Pro.
 */
export async function matchLeadToProperties(leadId: string, tenantId: string, profileId: string) {
    await requirePlanFeature(tenantId, 'ai');

    const supabase = await createClient();

    // 1. Buscar dados do lead + contato
    const { data: lead } = await supabase
        .from('leads')
        .select(`
            id, source, status,
            contacts (name, phone, email, tags),
            interactions (type, content, created_at)
        `)
        .eq('id', leadId)
        .single();

    if (!lead) throw new Error('Lead não encontrado.');

    // 2. Buscar imóveis ativos do tenant
    const { data: assets } = await supabase
        .from('assets')
        .select('id, title, type, price, status, details')
        .eq('tenant_id', tenantId)
        .eq('status', 'available')
        .limit(30);

    if (!assets || assets.length === 0) {
        return { success: false, error: 'Nenhum imóvel disponível para comparar.' };
    }

    // 3. Montar prompt rico
    const interactionsSummary = (lead.interactions as any[])
        ?.slice(-10)
        .map((i: any) => `[${i.type}] ${i.content}`)
        .join('\n') || 'Sem interações registradas.';

    const assetsCatalog = assets.map((a: any) => {
        const d = a.details || {};
        return `ID:${a.id} | ${a.title} | Tipo:${a.type} | Preço:R$${a.price} | ${d.dormitorios || d.quartos || 0} dormitórios | ${d.area_privativa || 0}m² | Bairro:${d.endereco?.bairro || 'N/A'}`;
    }).join('\n');

    const prompt = `Você é um consultor imobiliário especialista em matchmaking entre compradores e imóveis.

PERFIL DO LEAD:
- Nome: ${(lead.contacts as any)?.name}
- Origem: ${lead.source || 'Não informada'}
- Histórico de interações:
${interactionsSummary}

CATÁLOGO DE IMÓVEIS DISPONÍVEIS:
${assetsCatalog}

TAREFA:
1. Analise o perfil e comportamento do lead para inferir suas preferências (tipo de imóvel, faixa de preço, localização, tamanho).
2. Ranqueie os imóveis do catálogo do mais ao menos compatível.
3. Retorne APENAS um JSON válido com este formato exato, sem markdown:
{
  "lead_profile_summary": "Resumo do perfil em 2-3 frases",
  "matches": [
    {"asset_id": "uuid-aqui", "score": 95, "reason": "Justificativa de 1 frase"},
    {"asset_id": "uuid-aqui", "score": 82, "reason": "Justificativa de 1 frase"}
  ]
}
Inclua no máximo 5 imóveis com score acima de 50. Se nenhum tiver score > 50, retorne os 3 mais próximos.`;

    try {
        const model = getAIModel();
        const result = await model.generateContent(prompt);
        const rawText = result.response.text().trim();

        // Parse do JSON retornado pelo Gemini
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        const jsonStr = rawText.substring(jsonStart, jsonEnd + 1);
        const parsed: MatchingResult = JSON.parse(jsonStr);

        // Log de uso
        await supabase.from('ai_usage').insert({
            tenant_id: tenantId,
            profile_id: profileId,
            model: 'gemini-2.0-flash',
            total_tokens: result.response.usageMetadata?.totalTokenCount || 0,
            feature_context: 'lead_matching'
        });

        return { success: true, data: parsed };
    } catch (error: any) {
        console.error('AI Matching Error (Gemini):', error.message);
        throw new Error('Falha no matchmaking de IA.');
    }
}
