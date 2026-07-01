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
    profileId: string,
    promptId?: string
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

    let customSystemPrompt = '';
    if (promptId) {
        const { data: aiPrompt } = await supabase.from('ai_prompts').select('system_prompt').eq('id', promptId).single();
        if (aiPrompt) customSystemPrompt = `\n\nINSTRUÇÕES GERAIS DE TOM E IDENTIDADE (OBRIGATÓRIO SEGUIR):\n${aiPrompt.system_prompt}\n`;
    }

    const d = property.details || {};
    const price = property.price
        ? `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(property.price)}`
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
Modalidade: Venda
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
${customSystemPrompt}
TAREFA:
Crie 3 versões de copy para anúncio deste property:
1. CURTA (max 300 caracteres): Para WhatsApp e Stories. Direta, com destaque no maior diferencial.
2. MÉDIA (max 600 caracteres): Para Facebook e Instagram. Tom envolvente, CTA claro.  
3. COMPLETA (sem limite): Para portais imobiliários. Descritiva, detalhada, com todos os benefícios.

REGRAS CRÍTICAS DE FORMATAÇÃO (OBRIGATÓRIO):
1. ESPAÇAMENTO: Separe cada frase ou parágrafo por uma linha em branco para melhor legibilidade. No JSON, utilize duas quebras de linha ("\\n\\n") entre as frases.
2. HASHTAGS: Insira todas as hashtags no final do texto, com cada hashtag obrigatoriamente em sua própria linha separada. No JSON, utilize quebras de linha ("\\n") para separar as hashtags.
3. VALIDADE DO JSON: Certifique-se de que o JSON é válido, escapando as quebras de linha dentro das strings como "\\n".

EXEMPLO DE RETORNO ESPERADO:
{
  "short": "Texto da frase um.\\n\\nTexto da frase dois.\\n\\n#HashtagUm\\n#HashtagDois",
  "medium": "Texto médio detalhando o imóvel.\\n\\nMais detalhes importantes aqui.\\n\\n#HashtagUm\\n#HashtagDois",
  "full": "Descrição completa do imóvel.\\n\\nOutro parágrafo detalhado com diferenciais.\\n\\n#HashtagUm\\n#HashtagDois"
}

Retorne APENAS o JSON válido acima, sem markdown, tags ou explicações fora do JSON.`;

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
    profileId: string,
    mediaUrls?: string[],
    promptId?: string
): Promise<{ success: boolean; data?: CopyVariants; error?: string }> {
    await requirePlanFeature(tenantId, 'ai');

    const supabase = await createClient();

    let customSystemPrompt = '';
    if (promptId) {
        const { data: aiPrompt } = await supabase.from('ai_prompts').select('system_prompt').eq('id', promptId).single();
        if (aiPrompt) customSystemPrompt = `\n\nINSTRUÇÕES GERAIS DE TOM E IDENTIDADE (OBRIGATÓRIO SEGUIR):\n${aiPrompt.system_prompt}\n`;
    }

    const hasMedia = mediaUrls && mediaUrls.length > 0;
    const topicSection = topic ? `TÓPICO DO POST / INSTRUÇÕES DO USUÁRIO:\n"${topic}"` : '';
    const mediaSection = hasMedia 
        ? `O usuário anexou ${mediaUrls.length} arquivo(s) de mídia. ANALISE visualmente o conteúdo de cada imagem/vídeo fornecido e crie copies que descrevam, combinem ou se baseiem no conteúdo visual presente nelas de forma criativa, perspicaz e altamente contextualizada. Se houver instruções ou tópicos textuais fornecidos acima, use-os como direção complementar.`
        : 'Crie copies persuasivos com base estritamente no tópico/sugestão fornecido.';

    const prompt = `Você é um copywriter especialista em marketing brasileiro de alto nível. Crie copies persuasivos, com linguagem natural e emojis estratégicos.

${topicSection}
${mediaSection}
${customSystemPrompt}
TAREFA:
Crie 3 versões de copy para a publicação:
1. CURTA (max 300 caracteres): Para WhatsApp e Stories. Direta e impactante.
2. MÉDIA (max 600 caracteres): Para Facebook e Instagram. Tom envolvente, contextualizado ao conteúdo visual se houver, com storytelling se apropriado, e CTA claro.
3. COMPLETA (sem limite): Post detalhado para Blog ou LinkedIn.

REGRAS CRÍTICAS DE FORMATAÇÃO (OBRIGATÓRIO):
1. ESPAÇAMENTO: Separe cada frase ou parágrafo por uma linha em branco para melhor legibilidade. No JSON, utilize duas quebras de linha ("\\n\\n") entre as frases.
2. HASHTAGS: Insira todas as hashtags no final do texto, com cada hashtag obrigatoriamente em sua própria linha separada. No JSON, utilize quebras de linha ("\\n") para separar as hashtags.
3. VALIDADE DO JSON: Certifique-se de que o JSON é válido, escapando as quebras de linha dentro das strings como "\\n".

EXEMPLO DE RETORNO ESPERADO:
{
  "short": "Texto da frase um.\\n\\nTexto da frase dois.\\n\\n#HashtagUm\\n#HashtagDois",
  "medium": "Texto médio detalhando o tema.\\n\\nMais detalhes importantes aqui.\\n\\n#HashtagUm\\n#HashtagDois",
  "full": "Descrição completa sobre o assunto.\\n\\nOutro parágrafo detalhado.\\n\\n#HashtagUm\\n#HashtagDois"
}

Retorne APENAS o JSON válido acima, sem markdown, tags ou explicações fora do JSON.`;

    try {
        const result = await runAI(tenantId, prompt, mediaUrls);
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
