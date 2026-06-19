import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import OpenAI from "npm:openai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Converte Uint8Array para base64 em chunks para evitar stack overflow */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // 32KB por chunk
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

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
    const file = formData.get('file') as File;
    const tenant_id = formData.get('tenant_id') as string;
    const ai_provider = (formData.get('ai_provider') as string) || 'gemini';
    const ai_model = (formData.get('ai_model') as string) || 'gemini-2.5-flash';

    if (!file || !tenant_id) {
      throw new Error("Arquivo e tenant_id são obrigatórios.");
    }

    const prompt = `
      Você é um especialista em OCR e extração em massa de dados de CRM imobiliário.
      Analise o arquivo anexo (que pode ser uma imagem de tabela/print ou um documento PDF) contendo múltiplos leads.
      Extraia as informações de todos os leads encontrados no documento.
      Retorne APENAS um JSON válido contendo um array de leads no seguinte formato:
      {
        "leads": [
          {
            "name": "Nome Completo do Lead (se não estiver claro, use algo genérico como 'Lead via Importação')",
            "phone": "Telefone limpo (apenas números, incluindo código de país e área se disponíveis. Ex: 5548988231720 ou 48988231720)",
            "email": "Endereço de e-mail (ou null se não encontrado)",
            "notes": "Uma descrição curta com detalhes de perfil, interesses de compra/aluguel, faixa de preço, localização de preferência, corretor encarregado ou observações presentes no print/documento"
          }
        ]
      }
      Seja rigoroso ao extrair todos os leads. Não inclua texto explicativo fora do JSON.
    `;

    let responseText = "";
    let totalTokens = 0;

    // Converter arquivo para ArrayBuffer e depois para Base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
    const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png');

    // Chamar IA (Gemini ou OpenAI)
    if (ai_provider === 'openai') {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || "";
      if (!openaiApiKey) throw new Error("Chave de API da OpenAI não configurada.");
      
      const openai = new OpenAI({ apiKey: openaiApiKey });

      if (mimeType.startsWith('image/')) {
        const response = await openai.chat.completions.create({
          model: ai_model || "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64Data}` }
                }
              ]
            }
          ],
          temperature: 0.1,
        });

        responseText = response.choices[0].message.content || "";
        totalTokens = response.usage?.total_tokens || 0;
      } else {
        // Para PDF com OpenAI, como não suporta PDF direto via API do chat completion comum sem assistant,
        // vamos instruir que use Gemini, ou se for OpenAI podemos tentar enviar via Assistant ou dar erro amigável.
        // No entanto, podemos simplesmente usar o Gemini para PDFs que é 100% suportado nativamente.
        throw new Error("O processamento de PDFs com OpenAI não está habilitado neste endpoint. Use o Gemini.");
      }

    } else {
      // Gemini
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_GEMINI_API_KEY') || "";
      if (!geminiApiKey) throw new Error("Chave de API do Gemini não configurada.");

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: ai_model || "gemini-2.5-flash" });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
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
      feature_context: `lead-bulk-import`
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
    console.error('Error processing bulk leads:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
