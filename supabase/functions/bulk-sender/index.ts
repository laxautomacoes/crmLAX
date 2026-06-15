import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Processar 1 contato por invocação para segurança anti-ban
const BATCH_SIZE = 1;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
// Timeout para chamadas à Evolution API (evitar que um número travado derrube a função)
// 60s é suficiente — vídeos são enviados por URL, a Evolution baixa em background
const EVOLUTION_TIMEOUT_MS = 60000;

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EVOLUTION_TIMEOUT_MS);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
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
      let msg = data?.response?.message || data?.message || data?.error || `Evolution API error: ${response.statusText}`;
      if (typeof msg === 'object') {
        try {
          msg = JSON.stringify(msg);
        } catch (e) {
          msg = String(msg);
        }
      }
      throw new Error(msg);
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Normalizar Telefone ────────────────────────────────────────────────────

function normalizeWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    if (cleaned.length === 12 && ['6', '7', '8', '9'].includes(cleaned[4])) {
      return cleaned.substring(0, 4) + '9' + cleaned.substring(4);
    }
    return cleaned;
  }
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = `55${cleaned}`;
    if (cleaned.length === 12 && ['6', '7', '8', '9'].includes(cleaned[4])) {
      cleaned = cleaned.substring(0, 4) + '9' + cleaned.substring(4);
    }
    return cleaned;
  }
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
      // Verificar número — skip se tem mídia (economia de tempo)
      if (!mediaUrl) {
        try {
          const checkResult = await evolutionFetch(`/chat/whatsappNumbers/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({ numbers: [normalizedNumber] }),
          });

          // Parse robusto: a API pode retornar array, objeto, ou string JSON
          let checkParsed = checkResult;
          if (typeof checkResult === 'string') {
            try { checkParsed = JSON.parse(checkResult); } catch { /* ignore */ }
          }
          const checkItem = Array.isArray(checkParsed) ? checkParsed[0] : checkParsed;
          if (checkItem && checkItem.exists === false) {
            return { success: false, error: 'Número não possui WhatsApp ativo.' };
          }
        } catch (_checkErr: any) {
          // Se verificação falhar (timeout, etc), tentar enviar mesmo assim
          console.warn(`[bulk-sender] Verificação de número falhou (${_checkErr.message}), tentando envio direto.`);
        }
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
      const isTimeout = err.name === 'AbortError';
      const errorMsg = isTimeout ? 'Timeout na Evolution API' : err.message;
      console.error(`[bulk-sender] Tentativa ${attempt}/${MAX_RETRIES} falhou para ${recipient.phone}: ${errorMsg}`);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      } else {
        return { success: false, error: errorMsg };
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
    const speedSetting = campaign.speed_setting || 'safe';
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

    // 4. Verificar delay mínimo entre mensagens
    // O delay entre mensagens é controlado aqui: se a última atividade foi muito recente,
    // respondemos 200 sem enviar — o cron job re-disparará quando o tempo passar
    if (startIndex > 0 && campaign.last_activity_at) {
      const lastActivity = new Date(campaign.last_activity_at).getTime();
      const now = Date.now();
      const speedRanges: Record<string, [number, number]> = {
        safe: [60000, 120000],
        ultra: [120000, 240000]
      };
      const [minDelay] = speedRanges[speedSetting] || speedRanges.safe;
      const elapsed = now - lastActivity;

      if (elapsed < minDelay) {
        const remaining = Math.round((minDelay - elapsed) / 1000);
        console.log(`[bulk-sender] Delay não cumprido (${Math.round(elapsed / 1000)}s/${Math.round(minDelay / 1000)}s). Aguardando ${remaining}s. Cron re-disparará.`);

        // Agendar próxima invocação via pg_net para não depender apenas do cron
        try {
          await supabase.rpc('schedule_next_bulk_send', { p_campaign_id: campaign_id });
          console.log('[bulk-sender] Próxima invocação agendada via pg_net.');
        } catch (schedErr: any) {
          console.warn('[bulk-sender] Falha ao agendar via pg_net (cron cuidará):', schedErr.message);
        }

        return new Response(JSON.stringify({
          status: 'waiting_delay',
          elapsed_seconds: Math.round(elapsed / 1000),
          min_delay_seconds: Math.round(minDelay / 1000)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 5. Processar lote (1 contato por vez)
    const endIndex = Math.min(startIndex + BATCH_SIZE, recipients.length);
    let totalSuccess = campaign.total_success || 0;
    let totalErrors = campaign.total_errors || 0;

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
          completed_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        }).eq('id', campaign_id);

        // Notificar cancelamento
        const cancelTitle = campaign.title || 'Disparo em Massa';
        await supabase.from('notifications').insert({
          user_id: campaign.profile_id,
          tenant_id: campaign.tenant_id,
          title: `⛔ Disparo interrompido: ${cancelTitle}`,
          message: `${totalSuccess} enviadas, ${totalErrors} com erro. Interrompido em ${i}/${recipients.length}.`,
          type: 'warning',
          read: false,
          created_at: new Date().toISOString()
        });

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

      // Atualizar progresso na campanha + last_activity_at
      await supabase.from('bulk_campaigns').update({
        current_index: i + 1,
        total_success: totalSuccess,
        total_errors: totalErrors,
        last_activity_at: new Date().toISOString()
      }).eq('id', campaign_id);
    }

    // 6. Verificar se há mais destinatários
    if (endIndex < recipients.length) {
      console.log(`[bulk-sender] Lote concluído (${startIndex}-${endIndex - 1}). Agendando próximo envio via pg_net...`);

      // Agendar próxima invocação via pg_net (sem delay interno!)
      // O delay será verificado no início da próxima invocação (passo 4)
      try {
        await supabase.rpc('schedule_next_bulk_send', { p_campaign_id: campaign_id });
        console.log('[bulk-sender] Próxima invocação agendada com sucesso via pg_net.');
      } catch (schedErr: any) {
        console.error('[bulk-sender] Falha ao agendar via pg_net:', schedErr.message);

        // Fallback: marcar como stalled — o cron job de safety net irá detectar e re-disparar
        console.log('[bulk-sender] Cron job watchdog irá re-disparar em até 2 minutos.');

        // Notificar o usuário apenas se for improvável que o cron resolva
        await supabase.from('notifications').insert({
          user_id: campaign.profile_id,
          tenant_id: campaign.tenant_id,
          title: `⚠️ Disparo em andamento: ${campaign.title || 'Disparo em Massa'}`,
          message: `Enviadas ${endIndex}/${recipients.length}. O sistema irá continuar automaticamente.`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString()
        });
      }

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

    // 7. Todos processados — marcar como concluído
    console.log(`[bulk-sender] Campanha ${campaign_id} concluída! Success: ${totalSuccess}, Errors: ${totalErrors}`);

    await supabase.from('bulk_campaigns').update({
      status: 'completed',
      total_success: totalSuccess,
      total_errors: totalErrors,
      current_index: recipients.length,
      completed_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    }).eq('id', campaign_id);

    // 8. Notificar o usuário que disparou
    const campaignTitle = campaign.title || 'Disparo em Massa';
    await supabase.from('notifications').insert({
      user_id: campaign.profile_id,
      tenant_id: campaign.tenant_id,
      title: `✅ Disparo concluído: ${campaignTitle}`,
      message: `${totalSuccess} enviadas com sucesso, ${totalErrors} com erro (de ${recipients.length} total).`,
      type: 'success',
      read: false,
      created_at: new Date().toISOString()
    });

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
