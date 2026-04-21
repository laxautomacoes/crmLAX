import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // 2. Meta Webhook Verification (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === Deno.env.get('META_WEBHOOK_VERIFY_TOKEN')) {
      console.log('Webhook Meta validado com sucesso!');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Verification failed', { status: 403 });
  }

  try {
    const payload = await req.json();
    console.log('Webhook recebido:', JSON.stringify(payload, null, 2));

    // 3. Detecção de Lead da Meta
    if (payload.object === 'page' && payload.entry) {
      return await handleMetaLead(payload, supabaseClient);
    }

    // 4. Ingestão Genérica (Lógica existente ajustada)
    return await handleGenericLead(payload, supabaseClient);

  } catch (error: any) {
    console.error('Erro no processamento do webhook:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

/**
 * Lógica para processar Leads vindos da Meta (Lead Ads)
 */
async function handleMetaLead(payload: any, supabase: any) {
  console.log('--- INÍCIO PROCESSAMENTO META (v2.2) ---');
  for (const entry of payload.entry) {
    const pageId = String(entry.id);
    
    for (const change of entry.changes) {
      if (change.field === 'leadgen') {
        const leadgenId = change.value.leadgen_id;
        console.log(`[Webhook] Lead Ads detectado. Page: ${pageId}, Lead: ${leadgenId}`);

        // A. Buscar integrações ativas
        const { data: integrations, error: intError } = await supabase
          .from('integrations')
          .select('*')
          .eq('provider', 'facebook & instagram ads')
          .eq('status', 'active');

        if (intError) {
          console.error('[Database] Erro ao listar integrações:', intError);
          continue;
        }

        console.log(`[Database] Total de integrações ativas: ${integrations?.length || 0}`);
        integrations?.forEach(i => console.log(` - ID Configurado: ${i.credentials?.page_id} (Tenant: ${i.tenant_id})`));

        // 1. Tentar match exato por page_id (garantindo comparação como string)
        let integration = integrations?.find((i: any) => 
          String(i.credentials?.page_id) === pageId
        );

        // 2. Fallback: Se não encontrar por ID, mas houver integrações ativas
        // Priorizamos o match, mas se não houver, pegamos a primeira para não perder o lead
        if (!integration && integrations && integrations.length > 0) {
          console.warn(`[Fallback] ID ${pageId} não encontrado. Usando primeira integração ativa do banco.`);
          integration = integrations[0];
        }

        if (!integration || !integration.credentials?.access_token) {
          console.error(`[Erro] Sem integração configurada para processar o lead.`);
          continue;
        }

        console.log(`[Sucesso] Processando para Tenant ID: ${integration.tenant_id}.`);

        // B. Buscar detalhes do lead na Graph API
        try {
          const metaApiUrl = `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${integration.credentials.access_token}`;
          const response = await fetch(metaApiUrl);
          const metaLead = await response.json();

          if (metaLead.error) {
            console.error('[Meta] Erro na Graph API:', JSON.stringify(metaLead.error, null, 2));
            continue;
          }

          // C. Mapear campos
          const leadData: any = {
            tenant_id: integration.tenant_id,
            source: 'Meta Lead Ads',
            name: 'Lead Meta Ads',
            utm_source: 'facebook'
          };

          if (metaLead.field_data) {
            metaLead.field_data.forEach((field: any) => {
              const name = field.name.toLowerCase();
              const value = field.values[0];
              if (name === 'full_name' || name === 'name') leadData.name = value;
              if (name === 'email') leadData.email = value;
              if (name === 'phone_number' || name === 'phone' || name === 'whatsapp') leadData.phone = value;
            });
          }

          if (!leadData.phone) leadData.phone = `meta_${leadgenId}`;

          // D. Salvar no Banco
          console.log(`[CRM] Salvando lead: ${leadData.name}`);
          const result = await saveLeadToCRM(leadData, supabase, payload);
          console.log(`--- SUCESSO TOTAL: ${leadgenId} ---`);

        } catch (err: any) {
          console.error('[Erro] Crítico no processamento:', err.message);
        }
      }
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

/**
 * Lógica para processar Webhooks Genéricos/Manuais
 */
async function handleGenericLead(payload: any, supabase: any) {
  const leadData = {
    name: payload.name || payload.contact?.name || 'Lead s/ Nome',
    email: payload.email || payload.contact?.email,
    phone: payload.phone || payload.contact?.phone,
    source: payload.source || 'Direct',
    tenant_id: payload.tenant_id,
    utm_source: payload.utm_source,
    utm_medium: payload.utm_medium,
    utm_campaign: payload.utm_campaign
  };

  if (!leadData.tenant_id) throw new Error("tenant_id is required for generic ingestion");

  await saveLeadToCRM(leadData, supabase, payload);

  return new Response(JSON.stringify({ success: true, type: 'generic' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

/**
 * Função unificada para persistência
 */
async function saveLeadToCRM(leadData: any, supabase: any, rawPayload: any) {
  // 1. Upsert no Contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .upsert({ 
      tenant_id: leadData.tenant_id,
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email
    }, { onConflict: 'phone,tenant_id' })
    .select()
    .single();

  if (contactError) throw contactError;

  // 2. Criar Lead (com vinculação ao estágio correto)
  let stageId = null;
  try {
    const { data: stages } = await supabase
      .from('lead_stages')
      .select('id')
      .eq('tenant_id', leadData.tenant_id)
      .order('order_index', { ascending: true })
      .limit(1);
    
    if (stages && stages.length > 0) {
      stageId = stages[0].id;
    }
  } catch (err) {
    console.error('[ERRO] Falha ao buscar estágio padrão:', err);
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      contact_id: contact.id,
      tenant_id: leadData.tenant_id,
      stage_id: stageId, // Vincula o lead à primeira coluna (ex: NOVO)
      status: 'novo',
      source: leadData.source,
      utm_source: leadData.utm_source,
      utm_medium: leadData.utm_medium,
      utm_campaign: leadData.utm_campaign
    })
    .select()
    .single();

  if (leadError) {
    console.error('[ERRO] Falha ao inserir lead:', leadError);
    throw leadError;
  }

  // 3. Interação
  await supabase
    .from('interactions')
    .insert({
      lead_id: lead.id,
      tenant_id: leadData.tenant_id,
      type: 'system',
      content: `Lead recebido via ${leadData.source}.`,
      metadata: { payload: rawPayload }
    });
}
