'use server'

import { runAI } from '@/lib/ai/factory';
import { createClient } from '@/lib/supabase/server';
import { requirePlanFeature } from '@/lib/utils/plan-guard';
import { getWhatsAppChat } from '@/app/_actions/whatsapp';

export async function generateCopilotReply(
    leadId: string,
    tenantId: string,
    profileId: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    await requirePlanFeature(tenantId, 'ai');

    const supabase = await createClient();

    try {
        // 1. Fetch Lead & Property info
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select(`
                name,
                property_id,
                properties (
                    title,
                    price,
                    type,
                    details
                )
            `)
            .eq('id', leadId)
            .eq('tenant_id', tenantId)
            .single();

        if (leadError || !lead) {
            throw new Error('Lead não encontrado.');
        }

        const property = lead.properties;
        let propertyContext = '';

        if (property) {
            const d = (property as any).details || {};
            const price = (property as any).price
                ? `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((property as any).price)}`
                : 'Preço sob consulta';

            const typeLabels: Record<string, string> = {
                house: 'Casa',
                apartment: 'Apartamento',
                land: 'Terreno',
                commercial: 'Imóvel Comercial'
            };

            propertyContext = `
DADOS DO EMPREENDIMENTO/IMÓVEL DE INTERESSE:
Título: ${(property as any).title}
Tipo: ${typeLabels[(property as any).type] || (property as any).type}
Preço: ${price}
Dormitórios: ${d.dormitorios || d.quartos || 'N/A'}
Suítes: ${d.suites || 'N/A'}
Área privativa: ${d.area_privativa ? `${d.area_privativa}m²` : 'N/A'}
Vagas de garagem: ${d.vagas_garagem || d.garagem || 'N/A'}
Bairro: ${d.endereco?.bairro || 'N/A'}
Cidade: ${d.endereco?.cidade || 'N/A'}
Diferenciais: ${d.diferenciais?.join(', ') || 'N/A'}
`;
        } else {
            propertyContext = 'O lead ainda não possui um empreendimento específico vinculado ao seu interesse inicial.';
        }

        // 2. Fetch Chat History to get the last message from the lead
        const { chat } = await getWhatsAppChat(leadId);
        
        let lastLeadMessage = '';
        if (chat && chat.length > 0) {
            // Encontra a última mensagem que NÃO foi enviada por nós (ou seja, enviada pelo lead)
            const leadMessages = chat.filter((msg: any) => !msg.fromMe);
            if (leadMessages.length > 0) {
                lastLeadMessage = leadMessages[leadMessages.length - 1].text || leadMessages[leadMessages.length - 1].message || '';
            }
        }

        if (!lastLeadMessage) {
            return { success: false, error: 'Não há mensagens recebidas do lead para gerar uma resposta.' };
        }

        const prompt = `Você é um corretor de imóveis experiente e altamente persuasivo.
O seu papel é atuar como um "Copilot" (Assistente Virtual) sugerindo uma resposta rápida, empática e focada no fechamento ou no avanço da negociação.

INFORMAÇÕES DO LEAD:
Nome do Lead: ${lead.name}

${propertyContext}

MENSAGEM RECEBIDA DO LEAD (ÚLTIMA DÚVIDA/PERGUNTA):
"${lastLeadMessage}"

TAREFA:
Crie uma sugestão de resposta para enviar via WhatsApp para este lead.
- Responda diretamente à dúvida levantada.
- Seja cordial, profissional, mas com uma linguagem natural de WhatsApp (pode usar emojis adequados).
- Utilize os dados do empreendimento para agregar valor à resposta, se aplicável.
- Sempre termine com uma pergunta de engajamento (Call to Action) para manter a conversa fluindo (ex: "Podemos agendar uma visita?", "Você prefere uma simulação de financiamento?").
- Retorne APENAS o texto da mensagem sugerida, sem aspas, sem marcadores de markdown, e sem texto introdutório como "Aqui está a sugestão". Apenas o texto puro que será colado no campo de mensagem do corretor.`;

        const result = await runAI(tenantId, prompt);

        await supabase.from('ai_usage').insert({
            tenant_id: tenantId,
            profile_id: profileId,
            model: result.model,
            total_tokens: result.usage.total_tokens,
            feature_context: 'copilot_reply'
        });

        return { success: true, data: result.text.trim() };

    } catch (error: any) {
        console.error('AI Copilot Error:', error.message);
        return { success: false, error: error.message || 'Falha ao gerar sugestão de resposta.' };
    }
}
