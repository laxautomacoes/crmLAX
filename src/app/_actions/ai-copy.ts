'use server'

import { aiModel } from '@/lib/ai/gemini';
import { createClient } from '@/lib/supabase/server';
import { requirePlanFeature } from '@/lib/utils/plan-guard';

interface CopyVariants {
    short: string;     // Para WhatsApp e Stories
    medium: string;    // Para Facebook e Instagram
    full: string;      // Para portais imobiliários
}

/**
 * Gera 3 variações de copy de anúncio para um imóvel via Gemini.
 * Requer plano Pro.
 */
export async function generatePropertyCopy(
    assetId: string,
    tenantId: string,
    profileId: string
): Promise<{ success: boolean; data?: CopyVariants; error?: string }> {
    await requirePlanFeature(tenantId, 'ai');

    const supabase = await createClient();

    // 1. Buscar dados completos do imóvel
    const { data: asset } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .eq('tenant_id', tenantId)
        .single();

    if (!asset) throw new Error('Imóvel não encontrado.');

    const d = asset.details || {};
    const price = asset.price
        ? `R$ ${new Intl.NumberFormat('pt-BR').format(asset.price)}`
        : 'Preço sob consulta';

    const typeLabels: Record<string, string> = {
        house: 'Casa',
        apartment: 'Apartamento',
        land: 'Terreno',
        commercial: 'Imóvel Comercial'
    };

    const propertyProfile = `
Título: ${asset.title}
Tipo: ${typeLabels[asset.type] || asset.type}
Preço: ${price}
Modalidade: ${asset.transaction_type === 'rent' ? 'Aluguel' : 'Venda'}
Dormitórios: ${d.dormitorios || d.quartos || 'N/A'}
Suítes: ${d.suites || 'N/A'}
Área privativa: ${d.area_privativa ? `${d.area_privativa}m²` : 'N/A'}
Vagas de garagem: ${d.vagas_garagem || d.garagem || 'N/A'}
Bairro: ${d.endereco?.bairro || 'N/A'}
Cidade: ${d.endereco?.cidade || 'N/A'}
Diferenciais: ${d.diferenciais?.join(', ') || 'N/A'}
Descrição do corretor: ${asset.description || 'Não informada'}`;

    const prompt = `Você é um copywriter especialista em marketing imobiliário brasileiro. Crie copies persuasivos, com linguagem natural e emojis estratégicos.

DADOS DO IMÓVEL:
${propertyProfile}

TAREFA:
Crie 3 versões de copy para anúncio deste imóvel:
1. CURTA (max 300 caracteres): Para WhatsApp e Stories. Direta, com destaque no maior diferencial.
2. MÉDIA (max 600 caracteres): Para Facebook e Instagram. Tom envolvente, CTA claro.  
3. COMPLETA (sem limite): Para portais imobiliários. Descritiva, detalhada, com todos os benefícios.

Retorne APENAS um JSON válido com este formato exato, sem markdown:
{
  "short": "Texto curto aqui",
  "medium": "Texto médio aqui",
  "full": "Texto completo aqui"
}`;

    try {
        const result = await aiModel.generateContent(prompt);
        const rawText = result.response.text().trim();

        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        const jsonStr = rawText.substring(jsonStart, jsonEnd + 1);
        const parsed: CopyVariants = JSON.parse(jsonStr);

        await supabase.from('ai_usage').insert({
            tenant_id: tenantId,
            profile_id: profileId,
            model: 'gemini-2.0-flash',
            total_tokens: result.response.usageMetadata?.totalTokenCount || 0,
            feature_context: 'property_copy'
        });

        return { success: true, data: parsed };
    } catch (error: any) {
        console.error('AI Copy Error (Gemini):', error.message);
        throw new Error('Falha ao gerar copy do anúncio.');
    }
}
