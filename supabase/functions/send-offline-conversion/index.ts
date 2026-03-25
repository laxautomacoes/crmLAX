import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // O trigger do Supabase envia o novo registro no corpo da requisição
    const { record, old_record } = await req.json();

    // 1. Verificar se o status mudou para 'Ganho'
    // Precisamos identificar o ID do estágio de 'Ganho' para o tenant
    const { data: stages } = await supabaseClient
      .from('lead_stages')
      .select('id, name')
      .eq('tenant_id', record.tenant_id);

    const winStage = (stages as any[])?.find((s) =>
        s.name.toLowerCase().includes('ganho') ||
        s.name.toLowerCase().includes('fechado')
    );

    if (!winStage || record.stage_id !== winStage.id || old_record?.stage_id === winStage.id) {
        console.log("Conversão não qualificada para disparo.");
        return new Response(JSON.stringify({ message: "Skipped" }), { status: 200 });
    }

    // 2. Coletar dados do contato para o Hashing (conforme exigido pela Meta)
    const { data: contact } = await supabaseClient
      .from('contacts')
      .select('email, phone')
      .eq('id', record.contact_id)
      .single();

    if (!contact) throw new Error("Contact not found");

    // 3. Preparar Payload para Meta Conversions API
    const metaAccessToken = Deno.env.get('META_ACCESS_TOKEN');
    const pixelId = Deno.env.get('META_PIXEL_ID');

    if (!metaAccessToken || !pixelId) {
        console.warn("Meta credentials not configured. Skipping external call.");
        return new Response(JSON.stringify({ message: "Meta credentials missing" }), { status: 200 });
    }

    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'system_generated',
          user_data: {
            em: contact.email ? [await hashData(contact.email)] : [],
            ph: contact.phone ? [await hashData(contact.phone)] : [],
          },
          custom_data: {
            value: record.valor_estimado || 0,
            currency: 'BRL',
            lead_id: record.id
          }
        }
      ],
      test_event_code: Deno.env.get('META_TEST_EVENT_CODE') // Útil para debug no Events Manager
    };

    const response = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${metaAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Meta API response:', result);

    return new Response(JSON.stringify({ success: true, meta_response: result }), { status: 200 });

  } catch (error) {
    console.error('Error in offline conversion:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});

// Helper para SHA-256 Hashing (exigência da Meta)
async function hashData(data: string) {
  const msgUint8 = new TextEncoder().encode(data.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
