import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('Received payload:', JSON.stringify(payload, null, 2));

    // Lógica Básica de Normalização (Exemplo Simplificado)
    let leadData = {
      name: payload.name || payload.contact?.name || 'Lead s/ Nome',
      email: payload.email || payload.contact?.email,
      phone: payload.phone || payload.contact?.phone,
      source: payload.source || 'Direct',
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      tenant_id: payload.tenant_id // Em produção, validar via API Key
    };

    if (!leadData.tenant_id) {
        throw new Error("tenant_id is required");
    }

    // 1. Upsert no Contact
    const { data: contact, error: contactError } = await supabaseClient
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

    // 2. Criar Lead
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .insert({
        contact_id: contact.id,
        tenant_id: leadData.tenant_id,
        status: 'novo',
        source: leadData.source,
        utm_source: leadData.utm_source,
        utm_medium: leadData.utm_medium,
        utm_campaign: leadData.utm_campaign
      })
      .select()
      .single();

    if (leadError) throw leadError;

    // 3. Registrar Interação Inicial
    await supabaseClient
      .from('interactions')
      .insert({
        lead_id: lead.id,
        type: 'system',
        content: `Lead recebido via ${leadData.source}.`,
        metadata: { payload }
      });

    return new Response(JSON.stringify({ success: true, lead_id: lead.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing webhook:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
