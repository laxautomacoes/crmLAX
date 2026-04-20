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

    const formData = await req.formData();
    const pdfFile = formData.get('file') as File;
    const tenant_id = formData.get('tenant_id') as string;

    if (!pdfFile || !tenant_id) {
      throw new Error("Arquivo PDF e tenant_id são obrigatórios.");
    }

    // 1. Inicializar Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 2. Converter PDF para Base64 (simplificado para o prompt)
    const arrayBuffer = await pdfFile.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // 3. Prompt para extração
    const prompt = `
      Você é um especialista em OCR imobiliário. Analise esta tabela de preços em PDF e extraia os dados estruturados.
      Retorne APENAS um JSON no formato:
      {
        "properties": [
          {
            "unit": "string (ex: Apto 101)",
            "price": number,
            "area": number,
            "status": "string (ex: Disponível, Reservado)",
            "details": { "vagas": number, "quartos": number }
          }
        ]
      }
      Seja preciso com os números. Se não encontrar um campo, deixe nulo.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf"
        }
      }
    ]);

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const extractedData = JSON.parse(cleanJson);

    // 4. Atualizar Assets (Simulação de Upsert por Título/Unidade)
    // Nota: Em produção, ideal ter um external_id ou vinculação por empreendimento.
    for (const prop of extractedData.properties) {
      await supabaseClient
        .from('properties')
        .upsert({
          tenant_id: tenant_id,
          title: prop.unit,
          price: prop.price,
          status: prop.status,
          details: { ...prop.details, area: prop.area }
        }, { onConflict: 'title,tenant_id' }); // Supondo que 'title' seja único por tenant para simplificar
    }

    // 5. Log de Uso IA
    await supabaseClient.from('ai_usage').insert({
      tenant_id: tenant_id,
      model: 'gemini-2.0-flash',
      feature_context: 'property-ocr-pdf'
    });

    return new Response(JSON.stringify({ success: true, count: extractedData.properties.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing PDF:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
