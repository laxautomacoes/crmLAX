'use server'

import { runAI } from '@/lib/ai/factory';
import { createClient } from '@/lib/supabase/server';
import { requirePlanFeature } from '@/lib/utils/plan-guard';

interface CopyVariants {
    short: string;     // Para WhatsApp e Stories
    medium: string;    // Para Facebook e Instagram
    full: string;      // Para portais imobiliários
}

/**
 * Gera 3 variações de copy de anúncio para um property usando o provedor de IA configurado.
 * Requer plano Pro.
 */
export async function generatePropertyCopy(
    propertyId: string,
    tenantId: string,
    profileId: string
): Promise<{ success: boolean; data?: CopyVariants; error?: string }> {
    await requirePlanFeature(tenantId, 'ai');

    const supabase = await createClient();

    // 1. Buscar dados completos do property
    const { data: property } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('tenant_id', tenantId)
        .single();

    if (!property) throw new Error('Property não encontrado.');

    const d = property.details || {};
    const price = property.price
        ? `R$ ${new Intl.NumberFormat('pt-BR').format(property.price)}`
        : 'Preço sob consulta';

    const typeLabels: Record<string, string> = {
        house: 'Casa',
        apartment: 'Apartamento',
        land: 'Terreno',
        commercial: 'Property Comercial'
    };

    const propertyProfile = `
Título: ${property.title}
Tipo: ${typeLabels[property.type] || property.type}
Preço: ${price}
Modalidade: ${property.transaction_type === 'rent' ? 'Aluguel' : 'Venda'}
Dormitórios: ${d.dormitorios || d.quartos || 'N/A'}
Suítes: ${d.suites || 'N/A'}
Área privativa: ${d.area_privativa ? `${d.area_privativa}m²` : 'N/A'}
Vagas de garagem: ${d.vagas_garagem || d.garagem || 'N/A'}
Bairro: ${d.endereco?.bairro || 'N/A'}
Cidade: ${d.endereco?.cidade || 'N/A'}
Diferenciais: ${d.diferenciais?.join(', ') || 'N/A'}
Descrição do corretor: ${property.description || 'Não informada'}`;

    const prompt = `Você é um copywriter especialista em marketing imobiliário brasileiro. Crie copies persuasivos, com linguagem natural e emojis estratégicos.

DADOS DO IMÓVEL:
${propertyProfile}

TAREFA:
Crie 3 versões de copy para anúncio deste property:
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
        const result = await runAI(tenantId, prompt);
        const rawText = result.text.trim();

        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        const jsonStr = rawText.substring(jsonStart, jsonEnd + 1);
        const parsed: CopyVariants = JSON.parse(jsonStr);

        await supabase.from('ai_usage').insert({
            tenant_id: tenantId,
            profile_id: profileId,
            model: result.model,
            total_tokens: result.usage.total_tokens,
            feature_context: 'property_copy'
        });

        return { success: true, data: parsed };
    } catch (error: any) {
        console.error('AI Copy Error:', error.message);
        throw new Error('Falha ao gerar copy do anúncio.');
    }
}
/**
 * Gera posts de marketing para um tópico livre (não atrelado a um property específico).
 */
export async function generateGeneralCopy(
    topic: string,
    tenantId: string,
    profileId: string
): Promise<{ success: boolean; data?: CopyVariants; error?: string }> {
    await requirePlanFeature(tenantId, 'ai');

    const supabase = await createClient();

    const prompt = `Você é um copywriter especialista em marketing brasileiro. Crie copies persuasivos, com linguagem natural e emojis estratégicos.
    
TÓPICO DO POST: ${topic}

TAREFA:
Crie 3 versões de copy para o tópico acima:
1. CURTA (max 300 caracteres): Para WhatsApp e Stories. Direta e impactante.
2. MÉDIA (max 600 caracteres): Para Facebook e Instagram. Tom envolvente, com storytelling se apropriado, e CTA claro.
3. COMPLETA (sem limite): Post detalhado para Blog ou LinkedIn.

Retorne APENAS um JSON válido com este formato exato, sem markdown:
{
  "short": "Texto curto aqui",
  "medium": "Texto médio aqui",
  "full": "Texto completo aqui"
}`;

    try {
        const result = await runAI(tenantId, prompt);
        const rawText = result.text.trim();

        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        const jsonStr = rawText.substring(jsonStart, jsonEnd + 1);
        const parsed: CopyVariants = JSON.parse(jsonStr);

        await supabase.from('ai_usage').insert({
            tenant_id: tenantId,
            profile_id: profileId,
            model: result.model,
            total_tokens: result.usage.total_tokens,
            feature_context: 'general_marketing_copy'
        });

        return { success: true, data: parsed };
    } catch (error: any) {
        console.error('AI General Copy Error:', error);
        throw new Error('Falha ao gerar copy do post: ' + (error.message || 'Erro desconhecido.'));
    }
}
