import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import OpenAI from "npm:openai";

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

    const formData = await req.formData();
    const imageFile = formData.get('file') as File;
    const tenant_id = formData.get('tenant_id') as string;
    const ai_provider = (formData.get('ai_provider') as string) || 'gemini';
    const ai_model = (formData.get('ai_model') as string) || 'gemini-2.0-flash';

    if (!imageFile || !tenant_id) {
      throw new Error("Arquivo de imagem e tenant_id são obrigatórios.");
    }

    const prompt = `
      Você é um especialista em OCR e extração de dados de CRM imobiliário.
      Analise o print deste lead e extraia as informações estruturadas.
      Retorne APENAS um JSON válido contendo os dados identificados no seguinte formato:
      {
        "name": "Nome Completo do Lead (se houver, caso contrário crie um nome genérico como 'Lead via Print')",
        "phone": "Telefone limpo (apenas números, incluindo o DDI e DDD se disponível, ex: 5548984153533 ou 48984153533)",
        "email": "Endereço de e-mail (se houver, senão null)",
        "notes": "Uma descrição concisa das observações, perfil, orçamento ou interesse extraído da imagem (ex: 'Interesse em Venda de Empreendimento em São José/SC...')"
      }
      Seja rigoroso com tipos e valores. Não inclua texto explicativo fora do JSON.
    `;

    let responseText = "";
    let totalTokens = 0;

    // Converter imagem para ArrayBuffer e depois para Base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Chamar IA (Gemini ou OpenAI)
    if (ai_provider === 'openai') {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || "";
      if (!openaiApiKey) throw new Error("Chave de API da OpenAI não configurada.");
      
      const openai = new OpenAI({ apiKey: openaiApiKey });

      const response = await openai.chat.completions.create({
        model: ai_model || "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${imageFile.type};base64,${base64Data}` }
              }
            ]
          }
        ],
        temperature: 0.1,
      });

      responseText = response.choices[0].message.content || "";
      totalTokens = response.usage?.total_tokens || 0;

    } else {
      // Gemini
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_GEMINI_API_KEY') || "";
      if (!geminiApiKey) throw new Error("Chave de API do Gemini não configurada.");

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: ai_model || "gemini-2.0-flash" });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: imageFile.type
          }
        }
      ]);

      responseText = result.response.text();
      totalTokens = result.response.usageMetadata?.totalTokenCount || 0;
    }

    // Processar resposta JSON
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const extractedData = JSON.parse(cleanJson);

    // Log de Uso IA
    await supabaseClient.from('ai_usage').insert({
      tenant_id: tenant_id,
      model: ai_model,
      total_tokens: totalTokens,
      feature_context: `lead-image-import`
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error processing lead image:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
