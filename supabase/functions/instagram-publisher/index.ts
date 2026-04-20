import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenant_id, asset_id, profile_id, image_url, custom_caption } = await req.json();

    if (!tenant_id || !asset_id || !image_url) {
      throw new Error("Parâmetros ausentes: tenant_id, asset_id e image_url são obrigatórios.");
    }

    // 1. Buscar Integração do Instagram
    const { data: integration, error: intError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('provider', 'instagram')
      .eq('status', 'active')
      .single();

    if (intError || !integration) {
      throw new Error("Integração com Instagram não encontrada ou inativa para este tenant.");
    }

    // Acessando via credentials JSONB
    const credentials = integration.credentials || {};
    const accessToken = credentials.access_token;
    const igAccountId = credentials.account_id;

    if (!accessToken || !igAccountId) {
      throw new Error("Configuração da integração incompleta (token ou ID da conta ausente).");
    }

    let caption = custom_caption;

    // 2. Gerar Legenda com Gemini se não foi fornecida
    if (!caption) {
      const { data: asset, error: assetError } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', asset_id)
        .single();

      if (assetError || !asset) {
        throw new Error("Imóvel não encontrado.");
      }

      const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_GEMINI_API_KEY') ?? '');
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Você é um Social Media Manager vendedor. Crie uma legenda IRRESISTÍVEL para o Instagram sobre este property imobiliário.
      Imóvel: ${asset.title}
      Preço: R$ ${asset.price?.toLocaleString('pt-BR')}
      Tipo: ${asset.type}
      Detalhes: ${JSON.stringify(asset.details)}
      
      Regras:
      - Use emojis estratégicos.
      - Foque nos benefícios e estilo de vida.
      - Finalize com um CTA (Call to Action) para entrar em contato via Direct.
      - Adicione 5 hashtags relevantes de mercado imobiliário.
      - Retorne APENAS o texto da legenda.`;

      const aiResult = await model.generateContent(prompt);
      caption = aiResult.response.text();

      // Log ai_usage
      await supabaseClient.from('ai_usage').insert({
        tenant_id,
        profile_id,
        model: 'gemini-2.0-flash',
        total_tokens: 500, // Estimativa
        feature_context: 'instagram-caption'
      });
    }

    // 3. Meta API Step 1: Criar Media Container
    const createContainerUrl = `https://graph.facebook.com/v21.0/${igAccountId}/media`;
    const containerResponse = await fetch(createContainerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: image_url,
        caption: caption,
        access_token: accessToken
      })
    });

    const containerData = await containerResponse.json();
    if (containerData.error) {
      console.error('Meta API Error (Container):', containerData.error);
      throw new Error(`Erro Meta Container: ${containerData.error.message}`);
    }

    const creationId = containerData.id;

    // 4. Meta API Step 2: Publicar
    const publishUrl = `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`;
    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken
      })
    });

    const publishData = await publishResponse.json();
    if (publishData.error) {
      console.error('Meta API Error (Publish):', publishData.error);
      throw new Error(`Erro Meta Publish: ${publishData.error.message}`);
    }

    // 5. Registrar Interação
    await supabaseClient.from('interactions').insert({
      lead_id: null,
      tenant_id: tenant_id,
      type: 'system',
      content: `Imóvel postado no Instagram com sucesso via Automação IA.`,
      metadata: { 
        ig_post_id: publishData.id,
        asset_id: asset_id,
        caption: caption
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      post_id: publishData.id,
      caption: caption 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Instagram Publisher Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

