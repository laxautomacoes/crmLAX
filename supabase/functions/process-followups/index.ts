import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Configuração da Evolution API ─────────────────────────────────────────────
const EVOLUTION_API_URL = (Deno.env.get('EVOLUTION_URL') || '').replace(/['"\/]+$/g, '').replace(/^['"\/]+/g, '');
const EVOLUTION_API_KEY = (Deno.env.get('EVOLUTION_GLOBAL_API_KEY') || '').replace(/['"\/]+$/g, '').replace(/^['"\/]+/g, '');

// ─── Funções de Envio WhatsApp ─────────────────────────────────────────────────

async function evolutionFetch(endpoint: string, options: RequestInit = {}) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API configuration missing');
  }
  const baseUrl = EVOLUTION_API_URL.endsWith('/') ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
      'Authorization': `Bearer ${EVOLUTION_API_KEY}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({ message: 'Parse error' }));
  if (!response.ok) {
    throw new Error(data?.message || `Evolution API error: ${response.statusText}`);
  }
  return data;
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = '55' + cleaned.substring(1);
  if (cleaned.length === 10 || cleaned.length === 11) cleaned = '55' + cleaned;
  return cleaned;
}

async function sendWhatsAppText(instanceName: string, number: string, message: string) {
  return evolutionFetch(`/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number,
      options: { delay: 1200, presence: 'composing' },
      text: message,
      textMessage: { text: message },
    }),
  });
}

async function sendWhatsAppMedia(instanceName: string, number: string, mediaUrl: string, mediaType: string, caption?: string, fileName?: string) {
  // Para documentos, usar endpoint específico
  if (mediaType === 'document') {
    return evolutionFetch(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        options: { delay: 1200, presence: 'composing' },
        mediatype: 'document',
        media: mediaUrl,
        caption: caption || '',
        fileName: fileName || 'documento',
        mediaMessage: { mediatype: 'document', media: mediaUrl, caption: caption || '', fileName: fileName || 'documento' }
      }),
    });
  }
  
  return evolutionFetch(`/message/sendMedia/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number,
      options: { delay: 1200, presence: 'composing' },
      mediatype: mediaType,
      media: mediaUrl,
      caption: caption || '',
      fileName: fileName || undefined,
      mediaMessage: { mediatype: mediaType, media: mediaUrl, caption: caption || '', fileName: fileName || undefined }
    }),
  });
}

async function checkNumber(instanceName: string, number: string) {
  return evolutionFetch(`/chat/whatsappNumbers/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({ numbers: [number] }),
  });
}

// ─── Personalização de Mensagem ────────────────────────────────────────────────

function personalizeMessage(
  template: string,
  contactName: string,
  propertyTitle?: string,
  brokerName?: string
): string {
  return template
    .replace(/{nome}/g, contactName || 'Cliente')
    .replace(/{primeiro_nome}/g, (contactName || 'Cliente').split(' ')[0])
    .replace(/{imovel}/g, propertyTitle || '')
    .replace(/{corretor}/g, brokerName || '');
}

// ─── Cálculo de próximo agendamento ────────────────────────────────────────────

function calculateNextActionAt(delayValue: number, delayUnit: string): string {
  const now = new Date();
  switch (delayUnit) {
    case 'minutes': now.setMinutes(now.getMinutes() + delayValue); break;
    case 'hours': now.setHours(now.getHours() + delayValue); break;
    case 'days': now.setDate(now.getDate() + delayValue); break;
    case 'weeks': now.setDate(now.getDate() + (delayValue * 7)); break;
    default: now.setDate(now.getDate() + delayValue);
  }
  return now.toISOString();
}

// ─── Handler Principal ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // 🕐 Anti-ban: verificar horário comercial (7h–20h, Brasília UTC-3)
    const nowUTC = new Date();
    const brasiliaHour = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000)).getUTCHours();
    const HOUR_START = 7;
    const HOUR_END = 20;

    if (brasiliaHour < HOUR_START || brasiliaHour >= HOUR_END) {
      console.log(`[Follow-Up] Fora do horário comercial (${brasiliaHour}h Brasília). Disparos suspensos até ${HOUR_START}h.`);
      return new Response(JSON.stringify({ processed: 0, reason: 'outside_business_hours', currentHour: brasiliaHour }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Follow-Up] Iniciando processamento (${brasiliaHour}h Brasília)...`);

    // 1. Buscar enrollments pendentes (next_action_at <= now e status = active)
    const { data: pendingEnrollments, error: fetchError } = await supabase
      .from('followup_enrollments')
      .select(`
        id,
        sequence_id,
        lead_id,
        tenant_id,
        current_step_index,
        followup_sequences!inner (
          id, name, is_active, exit_on_reply,
          tenant_id
        )
      `)
      .eq('status', 'active')
      .lte('next_action_at', new Date().toISOString())
      .limit(150);

    if (fetchError) {
      console.error('[Follow-Up] Erro ao buscar enrollments:', fetchError);
      throw fetchError;
    }

    if (!pendingEnrollments || pendingEnrollments.length === 0) {
      console.log('[Follow-Up] Nenhum enrollment pendente.');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Follow-Up] ${pendingEnrollments.length} enrollment(s) pendente(s).`);

    // 1.5 Agrupar por tenant_id, limitando a 3 enrollments por tenant
    const enrollmentsByTenant: Record<string, any[]> = {};
    for (const enr of pendingEnrollments) {
      if (!enrollmentsByTenant[enr.tenant_id]) {
        enrollmentsByTenant[enr.tenant_id] = [];
      }
      if (enrollmentsByTenant[enr.tenant_id].length < 3) {
        enrollmentsByTenant[enr.tenant_id].push(enr);
      }
    }

    let processed = 0;
    let errors = 0;
    const delayMs = (ms: number) => new Promise(res => setTimeout(res, ms));

    await Promise.all(Object.entries(enrollmentsByTenant).map(async ([tenantId, enrollments]) => {
      for (const enrollment of enrollments) {
        let sentMessageInThisIteration = false;

      try {
        const sequence = (enrollment as any).followup_sequences;

        // Verificar se a sequência ainda está ativa
        if (!sequence?.is_active) {
          console.log(`[Follow-Up] Sequência ${sequence?.name} inativa. Pulando enrollment ${enrollment.id}.`);
          await supabase
            .from('followup_enrollments')
            .update({ status: 'paused' })
            .eq('id', enrollment.id);
          continue;
        }

        // 2. Buscar a etapa atual
        const { data: steps } = await supabase
          .from('followup_steps')
          .select('*')
          .eq('sequence_id', enrollment.sequence_id)
          .order('order_index', { ascending: true });

        if (!steps || steps.length === 0) {
          console.warn(`[Follow-Up] Sequência ${enrollment.sequence_id} sem etapas.`);
          continue;
        }

        const currentStep = steps[enrollment.current_step_index];
        if (!currentStep) {
          // Não há mais etapas → marcar como completed
          await supabase
            .from('followup_enrollments')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', enrollment.id);
          console.log(`[Follow-Up] Enrollment ${enrollment.id} completado (todas as etapas).`);
          continue;
        }

        // 3. Buscar dados do lead + contact
        const { data: lead } = await supabase
          .from('leads')
          .select(`
            id, assigned_to, property_id, whatsapp_chat,
            contacts ( name, phone ),
            properties:property_id ( title, main_image_url, images ),
            profiles:assigned_to ( full_name, whatsapp_instance_name )
          `)
          .eq('id', enrollment.lead_id)
          .single();

        if (!lead || !(lead as any).contacts?.phone) {
          console.warn(`[Follow-Up] Lead ${enrollment.lead_id} sem telefone. Pulando.`);
          await supabase.from('followup_logs').insert({
            enrollment_id: enrollment.id,
            step_id: currentStep.id,
            tenant_id: enrollment.tenant_id,
            status: 'skipped',
            error_message: 'Lead sem telefone'
          });
          // Avançar para próxima etapa mesmo assim
          const nextIndex = enrollment.current_step_index + 1;
          if (nextIndex >= steps.length) {
            await supabase.from('followup_enrollments').update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              current_step_index: nextIndex
            }).eq('id', enrollment.id);
          } else {
            const nextStep = steps[nextIndex];
            await supabase.from('followup_enrollments').update({
              current_step_index: nextIndex,
              next_action_at: calculateNextActionAt(nextStep.delay_value, nextStep.delay_unit)
            }).eq('id', enrollment.id);
          }
          continue;
        }

        const contactName = (lead as any).contacts.name || 'Cliente';
        const contactPhone = normalizePhone((lead as any).contacts.phone);
        const propertyTitle = (lead as any).properties?.title || '';
        const brokerName = (lead as any).profiles?.full_name || '';
        const activeInstanceName = (lead as any).profiles?.whatsapp_instance_name;

        // 4. Buscar instância WhatsApp
        // Se o corretor não tem instância, buscar qualquer instância conectada do tenant
        let activeInstance = activeInstanceName;
        if (!activeInstance) {
          const { data: instances } = await supabase
            .from('whatsapp_instances')
            .select('instance_name')
            .eq('tenant_id', enrollment.tenant_id)
            .eq('status', 'connected')
            .limit(1);
          activeInstance = instances?.[0]?.instance_name;
        }

        if (!activeInstance) {
          console.warn(`[Follow-Up] Sem instância WhatsApp para tenant ${enrollment.tenant_id}.`);
          await supabase.from('followup_logs').insert({
            enrollment_id: enrollment.id,
            step_id: currentStep.id,
            tenant_id: enrollment.tenant_id,
            status: 'failed',
            error_message: 'Sem instância WhatsApp conectada'
          });
          errors++;
          continue;
        }

        // 5. Verificar número no WhatsApp
        try {
          const checkResult = await checkNumber(activeInstance, contactPhone);
          if (!checkResult || !checkResult[0] || !checkResult[0].exists) {
            console.warn(`[Follow-Up] Número ${contactPhone} não tem WhatsApp.`);
            await supabase.from('followup_logs').insert({
              enrollment_id: enrollment.id,
              step_id: currentStep.id,
              tenant_id: enrollment.tenant_id,
              status: 'failed',
              error_message: 'Número não possui WhatsApp ativo'
            });
            errors++;
            // Avançar para próxima etapa
            const nextIndex = enrollment.current_step_index + 1;
            if (nextIndex >= steps.length) {
              await supabase.from('followup_enrollments').update({
                status: 'completed', completed_at: new Date().toISOString(), current_step_index: nextIndex
              }).eq('id', enrollment.id);
            } else {
              const nextStep = steps[nextIndex];
              await supabase.from('followup_enrollments').update({
                current_step_index: nextIndex,
                next_action_at: calculateNextActionAt(nextStep.delay_value, nextStep.delay_unit)
              }).eq('id', enrollment.id);
            }
            continue;
          }
        } catch (checkErr) {
          console.error(`[Follow-Up] Erro ao verificar número:`, checkErr);
        }

        // 6. Personalizar e enviar mensagem
        const personalizedMessage = personalizeMessage(
          currentStep.message_template,
          contactName,
          propertyTitle,
          brokerName
        );

        // Resolver mídia dinâmica
        let finalMediaUrl = currentStep.media_url;
        let finalMediaType = currentStep.media_type;

        if (currentStep.media_url === '__PROPERTY_MAIN_IMAGE__') {
          const propMainImage = (lead as any).properties?.main_image_url;
          const propImages = (lead as any).properties?.images;
          const fallbackImage = Array.isArray(propImages) && propImages.length > 0 
            ? (typeof propImages[0] === 'string' ? propImages[0] : propImages[0]?.url) 
            : null;
          
          finalMediaUrl = propMainImage || fallbackImage || null;
          finalMediaType = finalMediaUrl ? 'image' : null;
        }

        try {
          if (finalMediaUrl && finalMediaType) {
            const mediaFileName = currentStep.media_name || undefined;
            await sendWhatsAppMedia(activeInstance, contactPhone, finalMediaUrl, finalMediaType, personalizedMessage, mediaFileName);
          } else {
            await sendWhatsAppText(activeInstance, contactPhone, personalizedMessage);
          }

          // Log de sucesso
          await supabase.from('followup_logs').insert({
            enrollment_id: enrollment.id,
            step_id: currentStep.id,
            tenant_id: enrollment.tenant_id,
            status: 'sent'
          });

          // Registrar no chat do lead
          const currentChat = Array.isArray((lead as any).whatsapp_chat) ? (lead as any).whatsapp_chat : [];
          const newMessage = {
            id: `followup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            text: personalizedMessage || (finalMediaUrl ? '📎 Mídia enviada' : ''),
            fromMe: true,
            timestamp: new Date().toISOString(),
            senderName: `Follow-Up: ${sequence.name}`
          };
          const updatedChat = [...currentChat, newMessage].slice(-20);
          await supabase.from('leads').update({ whatsapp_chat: updatedChat }).eq('id', enrollment.lead_id);

          // Registrar interação
          await supabase.from('interactions').insert({
            lead_id: enrollment.lead_id,
            type: 'whatsapp',
            content: `Follow-Up "${sequence.name}" (etapa ${enrollment.current_step_index + 1}): ${personalizedMessage.substring(0, 100)}...`,
            metadata: { followup_sequence: sequence.name, step_index: enrollment.current_step_index }
          });

          // Mover lead de estágio se configurado no step
          if (currentStep.target_stage_id) {
            try {
              // Buscar nome do estágio alvo para o log
              const { data: targetStage } = await supabase
                .from('lead_stages')
                .select('name')
                .eq('id', currentStep.target_stage_id)
                .single();

              const { error: stageErr } = await supabase
                .from('leads')
                .update({ stage_id: currentStep.target_stage_id })
                .eq('id', enrollment.lead_id);

              if (stageErr) {
                console.error(`[Follow-Up] ❌ Erro ao mover lead ${enrollment.lead_id} para estágio ${currentStep.target_stage_id}:`, stageErr.message);
              } else {
                console.log(`[Follow-Up] 🔄 Lead ${enrollment.lead_id} movido para estágio "${targetStage?.name || currentStep.target_stage_id}".`);
                // Registrar a mudança de estágio como interação
                await supabase.from('interactions').insert({
                  lead_id: enrollment.lead_id,
                  type: 'stage_change',
                  content: `Follow-Up "${sequence.name}" (etapa ${enrollment.current_step_index + 1}): lead movido automaticamente para o estágio "${targetStage?.name || 'Desconhecido'}"`,
                  metadata: {
                    followup_sequence: sequence.name,
                    step_index: enrollment.current_step_index,
                    target_stage_id: currentStep.target_stage_id,
                    target_stage_name: targetStage?.name || null,
                  }
                });
              }
            } catch (stageChangeErr: any) {
              console.error(`[Follow-Up] ❌ Erro inesperado ao mover estágio:`, stageChangeErr.message);
            }
          }

          processed++;
          sentMessageInThisIteration = true;
          console.log(`[Follow-Up] ✅ Mensagem enviada para ${contactName} (${contactPhone}), etapa ${enrollment.current_step_index + 1}.`);

        } catch (sendErr: any) {
          console.error(`[Follow-Up] ❌ Erro ao enviar para ${contactPhone}:`, sendErr.message);
          await supabase.from('followup_logs').insert({
            enrollment_id: enrollment.id,
            step_id: currentStep.id,
            tenant_id: enrollment.tenant_id,
            status: 'failed',
            error_message: sendErr.message
          });
          errors++;
        }

        // 7. Avançar para próxima etapa
        const nextIndex = enrollment.current_step_index + 1;
        if (nextIndex >= steps.length) {
          await supabase.from('followup_enrollments').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            current_step_index: nextIndex
          }).eq('id', enrollment.id);
          console.log(`[Follow-Up] Enrollment ${enrollment.id} completado.`);
        } else {
          const nextStep = steps[nextIndex];
          await supabase.from('followup_enrollments').update({
            current_step_index: nextIndex,
            next_action_at: calculateNextActionAt(nextStep.delay_value, nextStep.delay_unit)
          }).eq('id', enrollment.id);
        }

      } catch (enrollErr: any) {
        console.error(`[Follow-Up] Erro no enrollment ${enrollment.id}:`, enrollErr.message);
        errors++;
      }

      if (sentMessageInThisIteration) {
        await delayMs(30000);
      }
    }
  }));

    console.log(`[Follow-Up] Processamento concluído: ${processed} enviados, ${errors} erros.`);

    return new Response(JSON.stringify({ processed, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Follow-Up] Erro crítico:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
