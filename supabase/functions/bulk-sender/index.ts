import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BATCH_SIZE = 3;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Evolution API Helper ───────────────────────────────────────────────────

function getEvolutionConfig() {
  const url = (Deno.env.get('EVOLUTION_URL') || '').replace(/['"]/g, '').replace(/\/$/, '');
  const key = (Deno.env.get('EVOLUTION_GLOBAL_API_KEY') || '').replace(/['"]/g, '');
  if (!url || !key) throw new Error('Evolution API configuration missing (EVOLUTION_URL / EVOLUTION_GLOBAL_API_KEY)');
  return { url, key };
}

async function evolutionFetch(endpoint: string, options: RequestInit = {}) {
  const { url, key } = getEvolutionConfig();
  const fullUrl = `${url}${endpoint}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      ...options.headers,
    },
  });

  const text = await response.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { message: text }; }

  if (!response.ok) {
    const msg = data?.response?.message || data?.message || data?.error || `Evolution API error: ${response.statusText}`;
    const errorMsg = Array.isArray(msg) ? msg.join(', ') : msg;
    throw new Error(errorMsg);
  }

  return data;
}

// ─── Normalizar Telefone ────────────────────────────────────────────────────

function normalizeWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) return cleaned;
  if (cleaned.length === 10 || cleaned.length === 11) return `55${cleaned}`;
  return cleaned;
}

// ─── Enviar Mensagem Individual (com retry) ────────────────────────────────

async function sendSingleMessage(
  instanceName: string,
  recipient: { name: string; phone: string; lead_id?: string },
  message: string,
  mediaUrl?: string,
  mediaType?: string,
  mediaName?: string
): Promise<{ success: boolean; error?: string }> {

  const normalizedNumber = normalizeWhatsAppNumber(recipient.phone);
  const personalizedMessage = message
    .replace(/{nome}/g, recipient.name)
    .replace(/{primeiro_nome}/g, recipient.name.split(' ')[0]);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Verificar número (não-bloqueante)
      try {
        const checkResult = await evolutionFetch(`/chat/whatsappNumbers/${instanceName}`, {
          method: 'POST',
          body: JSON.stringify({ numbers: [normalizedNumber] }),
        });
        const parsed = Array.isArray(checkResult) ? checkResult[0] : checkResult;
        if (parsed && parsed.exists === false) {
          return { success: false, error: 'Número não possui WhatsApp ativo.' };
        }
      } catch (_checkErr) {
        // Se verificação falhar, tentar enviar mesmo assim
      }

      // Enviar mensagem
      if (mediaUrl && mediaType) {
        const mimetypeMap: Record<string, string> = { image: 'image/png', video: 'video/mp4' };
        if (mediaType === 'document') {
          await evolutionFetch(`/message/sendMedia/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
              number: normalizedNumber,
              options: { delay: 1200, presence: 'composing' },
              mediatype: 'document',
              mimetype: 'application/pdf',
              media: mediaUrl,
              fileName: mediaName || 'documento',
              caption: personalizedMessage || '',
            }),
          });
        } else {
          await evolutionFetch(`/message/sendMedia/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
              number: normalizedNumber,
              options: { delay: 1200, presence: 'composing' },
              mediatype: mediaType,
              mimetype: mimetypeMap[mediaType] || 'application/octet-stream',
              media: mediaUrl,
              caption: personalizedMessage || '',
            }),
          });
        }
      } else if (personalizedMessage) {
        await evolutionFetch(`/message/sendText/${instanceName}`, {
          method: 'POST',
          body: JSON.stringify({
            number: normalizedNumber,
            options: { delay: 1200, presence: 'composing' },
            text: personalizedMessage,
            textMessage: { text: personalizedMessage },
          }),
        });
      }

      return { success: true };

    } catch (err: any) {
      console.error(`[bulk-sender] Tentativa ${attempt}/${MAX_RETRIES} falhou para ${recipient.phone}:`, err.message);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      } else {
        return { success: false, error: err.message };
      }
    }
  }

  return { success: false, error: 'Falha após todas as tentativas.' };
}

// ─── Handler Principal ─────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[bulk-sender] Processando campanha: ${campaign_id}`);

    // 1. Carregar campanha
    const { data: campaign, error: fetchError } = await supabase
      .from('bulk_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (fetchError || !campaign) {
      console.error('[bulk-sender] Campanha não encontrada:', fetchError);
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Verificar cancelamento
    if (campaign.cancel_requested) {
      console.log(`[bulk-sender] Campanha ${campaign_id} cancelada pelo usuário.`);
      await supabase
        .from('bulk_campaigns')
        .update({ status: 'cancelled', completed_at: new Date().toISOString() })
        .eq('id', campaign_id);

      return new Response(JSON.stringify({ status: 'cancelled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Verificar se já completou
    if (campaign.status !== 'sending') {
      console.log(`[bulk-sender] Campanha ${campaign_id} não está em status 'sending' (${campaign.status}).`);
      return new Response(JSON.stringify({ status: campaign.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const recipients: any[] = campaign.recipients_data || [];
    const startIndex = campaign.current_index || 0;
    const instanceName = campaign.instance_name;
    const speedSetting = campaign.speed_setting || 'normal';
    const message = campaign.message || '';
    const mediaUrl = campaign.media_url;
    const mediaType = campaign.media_type;
    const mediaName = campaign.media_name;

    if (!instanceName) {
      console.error('[bulk-sender] instance_name não definido.');
      await supabase.from('bulk_campaigns').update({ status: 'cancelled', completed_at: new Date().toISOString() }).eq('id', campaign_id);
      return new Response(JSON.stringify({ error: 'instance_name missing' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Processar lote
    const endIndex = Math.min(startIndex + BATCH_SIZE, recipients.length);
    let totalSuccess = campaign.total_success || 0;
    let totalErrors = campaign.total_errors || 0;

    const speedRanges: Record<string, [number, number]> = {
      normal: [20000, 30000],
      safe: [30000, 60000],
      ultra: [60000, 120000]
    };

    for (let i = startIndex; i < endIndex; i++) {
      // Checar cancelamento a cada mensagem
      const { data: freshCampaign } = await supabase
        .from('bulk_campaigns')
        .select('cancel_requested')
        .eq('id', campaign_id)
        .single();

      if (freshCampaign?.cancel_requested) {
        console.log(`[bulk-sender] Cancelamento detectado durante processamento.`);
        await supabase.from('bulk_campaigns').update({
          status: 'cancelled',
          total_success: totalSuccess,
          total_errors: totalErrors,
          current_index: i,
          completed_at: new Date().toISOString()
        }).eq('id', campaign_id);

        return new Response(JSON.stringify({ status: 'cancelled', processed: i }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const recipient = recipients[i];
      console.log(`[bulk-sender] Enviando ${i + 1}/${recipients.length}: ${recipient.name} (${recipient.phone})`);

      const result = await sendSingleMessage(
        instanceName, recipient, message, mediaUrl, mediaType, mediaName
      );

      if (result.success) {
        totalSuccess++;
      } else {
        totalErrors++;
      }

      // Gravar resultado individual
      await supabase.from('bulk_campaign_recipients').insert({
        campaign_id,
        tenant_id: campaign.tenant_id,
        recipient_name: recipient.name,
        recipient_phone: recipient.phone,
        lead_id: recipient.lead_id || null,
        status: result.success ? 'success' : 'error',
        error_message: result.error || null
      });

      // Espelhar no chat do lead (se tiver lead_id)
      if (result.success && recipient.lead_id) {
        try {
          const personalizedMsg = message
            .replace(/{nome}/g, recipient.name)
            .replace(/{primeiro_nome}/g, recipient.name.split(' ')[0]);

          const { data: leadData } = await supabase
            .from('leads')
            .select('whatsapp_chat')
            .eq('id', recipient.lead_id)
            .single();

          const currentChat = Array.isArray(leadData?.whatsapp_chat) ? leadData.whatsapp_chat : [];
          const newMessage = {
            id: `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            text: personalizedMsg || (mediaUrl ? '📎 Mídia enviada' : ''),
            fromMe: true,
            timestamp: new Date().toISOString(),
            senderName: 'Você (Disparador)'
          };
          const updatedChat = [...currentChat, newMessage].slice(-20);

          await supabase.from('leads')
            .update({ whatsapp_chat: updatedChat })
            .eq('id', recipient.lead_id);

          // Log interaction
          const logMsg = personalizedMsg
            ? `Mensagem automatizada (Disparador): ${personalizedMsg.substring(0, 80)}...`
            : `Mídia enviada via Disparador em Massa`;

          await supabase.from('interactions').insert({
            lead_id: recipient.lead_id,
            tenant_id: campaign.tenant_id,
            type: 'whatsapp',
            content: logMsg
          });

        } catch (chatErr: any) {
          console.warn(`[bulk-sender] Erro ao espelhar chat do lead ${recipient.lead_id}:`, chatErr.message);
        }
      }

      // Atualizar progresso na campanha
      await supabase.from('bulk_campaigns').update({
        current_index: i + 1,
        total_success: totalSuccess,
        total_errors: totalErrors
      }).eq('id', campaign_id);

      // Aguardar intervalo (exceto última mensagem do lote)
      if (i + 1 < recipients.length) {
        const [min, max] = speedRanges[speedSetting] || speedRanges.normal;
        const delay = min + Math.random() * (max - min);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // 5. Verificar se há mais destinatários
    if (endIndex < recipients.length) {
      console.log(`[bulk-sender] Lote concluído (${startIndex}-${endIndex - 1}). Encadeando próximo lote...`);

      // Self-invocation: chamar a si mesma para o próximo lote (fire-and-forget)
      const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/bulk-sender`;
      fetch(selfUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ campaign_id })
      }).catch(err => {
        console.error('[bulk-sender] Erro na self-invocation:', err.message);
      });

      return new Response(JSON.stringify({
        status: 'batch_complete',
        processed: endIndex,
        total: recipients.length,
        success: totalSuccess,
        errors: totalErrors
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 6. Todos processados — marcar como concluído
    console.log(`[bulk-sender] Campanha ${campaign_id} concluída! Success: ${totalSuccess}, Errors: ${totalErrors}`);

    await supabase.from('bulk_campaigns').update({
      status: 'completed',
      total_success: totalSuccess,
      total_errors: totalErrors,
      current_index: recipients.length,
      completed_at: new Date().toISOString()
    }).eq('id', campaign_id);

    return new Response(JSON.stringify({
      status: 'completed',
      total: recipients.length,
      success: totalSuccess,
      errors: totalErrors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[bulk-sender] Erro fatal:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
