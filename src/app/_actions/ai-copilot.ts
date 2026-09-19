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
        // 1. Fetch Lead info separately to avoid left join ambiguity
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('name, property_id')
            .eq('id', leadId)
            .eq('tenant_id', tenantId)
            .single();

        if (leadError || !lead) {
            console.error('generateCopilotReply DB Error (Lead):', leadError);
            throw new Error(`Erro ao buscar lead: ${leadError?.message || 'Lead não encontrado.'}`);
        }

        let propertyContext = '';

        if (lead.property_id) {
            const { data: property, error: propError } = await supabase
                .from('properties')
                .select('title, price, type, details')
                .eq('id', lead.property_id)
                .single();

            if (propError) {
                console.warn('generateCopilotReply DB Warning (Property):', propError);
            }

            if (property) {
                const d = (property as any).details || {};
                const price = property.price
                    ? `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(property.price)}`
                    : 'Preço sob consulta';

                const typeLabels: Record<string, string> = {
                    house: 'Casa',
                    apartment: 'Apartamento',
                    land: 'Terreno',
                    commercial: 'Imóvel Comercial'
                };

                propertyContext = `
DADOS DO EMPREENDIMENTO/IMÓVEL DE INTERESSE:
Título: ${property.title}
Tipo: ${typeLabels[property.type || ''] || property.type || 'Não informado'}
Preço: ${price}
Dormitórios: ${d.dormitorios || d.quartos || 'N/A'}
Suítes: ${d.suites || 'N/A'}
Área privativa: ${d.area_privativa ? `${d.area_privativa}m²` : 'N/A'}
Vagas de garagem: ${d.vagas_garagem || d.garagem || 'N/A'}
Bairro: ${d.endereco?.bairro || 'N/A'}
Cidade: ${d.endereco?.cidade || 'N/A'}
Diferenciais: ${d.diferenciais?.join(', ') || 'N/A'}
`;
            }
        }

        if (!propertyContext) {
            propertyContext = 'O lead ainda não possui um empreendimento específico vinculado ao seu interesse inicial ou não foi possível carregar os detalhes.';
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

        const prompt = `Você é um corretor de imóveis experiente, altamente persuasivo e atua como a "IA LAX", o cérebro inteligente de vendas do CRM.
O seu papel é analisar o contexto do imóvel e a dúvida do cliente para sugerir uma resposta rápida, empática e focada no fechamento ou no avanço da negociação.

INFORMAÇÕES DO LEAD:
Nome do Lead: ${lead.name}

${propertyContext}

MENSAGEM RECEBIDA DO LEAD (ÚLTIMA DÚVIDA/PERGUNTA):
"${lastLeadMessage}"

TAREFA:
Crie uma sugestão de resposta para enviar via WhatsApp para este lead.
- Responda diretamente à dúvida levantada utilizando os dados e argumentos disponíveis.
- Seja cordial, profissional, mas com uma linguagem natural de WhatsApp (pode usar emojis adequados).
- Utilize os dados e o relatório do empreendimento para agregar valor à resposta, se aplicável.
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
