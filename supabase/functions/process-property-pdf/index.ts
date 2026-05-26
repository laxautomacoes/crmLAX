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
    const pdfFile = formData.get('file') as File;
    const tenant_id = formData.get('tenant_id') as string;
    const mode = (formData.get('mode') as string) || 'cadastro';
    const ai_provider = (formData.get('ai_provider') as string) || 'gemini';
    const ai_model = (formData.get('ai_model') as string) || 'gemini-2.0-flash';
    const property_id = formData.get('property_id') as string;
    const pageImagesJson = formData.get('page_images') as string;

    if (!pdfFile && !pageImagesJson && !tenant_id) {
      throw new Error("Arquivo PDF (ou imagens) e tenant_id são obrigatórios.");
    }

    // Obter dados do empreendimento pai se for modo tabela
    let parentPropertyTitle = "";
    if (mode === 'tabela' && property_id) {
      const { data: parentProperty } = await supabaseClient
        .from('properties')
        .select('title')
        .eq('id', property_id)
        .single();
      if (parentProperty) {
        parentPropertyTitle = parentProperty.title;
      }
    }

    // 1. Preparar Prompt específico para cada modo
    let prompt = "";
    if (mode === 'cadastro') {
      prompt = `
        Você é um especialista em OCR imobiliário. Analise os dados deste imóvel e extraia as informações estruturadas.
        Retorne APENAS um JSON válido contendo um array "properties" com o seguinte formato:
        {
          "properties": [
            {
              "title": "Nome/Título do Imóvel (Ex: Casa Duplex Alphaville)",
              "price": 1200000 (número),
              "type": "house | apartment | land | commercial",
              "description": "Descrição detalhada do imóvel",
              "details": {
                "area": 250 (número em m²),
                "quartos": 4 (número),
                "vagas": 3 (número),
                "suites": 2 (número),
                "banheiros": 5 (número)
              }
            }
          ]
        }
        Seja rigoroso com tipos e valores. Não inclua texto explicativo fora do JSON.
      `;
    } else if (mode === 'tabela') {
      prompt = `
        Você é um especialista em OCR imobiliário. Analise esta tabela de preços de unidades e extraia os dados estruturados de cada apartamento/casa disponível.
        O nome do empreendimento pai é "${parentPropertyTitle}".
        Retorne APENAS um JSON válido contendo um array "units" com o seguinte formato:
        {
          "units": [
            {
              "unit_number": "101 (número ou string da unidade)",
              "block": "Torre A (bloco ou torre, se houver)",
              "price": 420000 (número),
              "area": 75.5 (área privativa em m², número),
              "details": {
                "vagas": 1 (número),
                "quartos": 2 (número)
              }
            }
          ]
        }
        Extraia o máximo de unidades que conseguir identificar na tabela de preços. Não inclua textos explicativos.
      `;
    } else {
      // Modo Book
      prompt = `
        Você é um especialista em marketing imobiliário. Analise este book de apresentação do empreendimento.
        Extraia as principais características, descrição comercial persuasiva e amenidades.
        Retorne APENAS um JSON no formato:
        {
          "title": "Nome do Empreendimento",
          "type": "apartment | house | commercial",
          "description": "Descrição persuasiva sobre o empreendimento",
          "amenities": ["Piscina", "Salão de Festas", "Academia"],
          "price_indicator": 450000 (estimativa de preço a partir de, número)
        }
      `;
    }

    let responseText = "";
    let totalTokens = 0;

    // 2. Chamar IA (Gemini ou OpenAI)
    if (ai_provider === 'openai') {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || "";
      if (!openaiApiKey) throw new Error("Chave de API da OpenAI não configurada.");
      
      const openai = new OpenAI({ apiKey: openaiApiKey });

      // Preparar payload multimodal para OpenAI (usando as imagens das páginas do PDF renderizadas pelo frontend)
      const images: string[] = pageImagesJson ? JSON.parse(pageImagesJson) : [];
      if (images.length === 0) {
        throw new Error("Imagens das páginas do PDF são necessárias para processamento com a OpenAI.");
      }

      const content = [
        { type: "text", text: prompt },
        ...images.map(img => ({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${img}` }
        }))
      ];

      const response = await openai.chat.completions.create({
        model: ai_model || "gpt-4o",
        messages: [{ role: "user", content: content as any }],
        temperature: 0.2,
      });

      responseText = response.choices[0].message.content || "";
      totalTokens = response.usage?.total_tokens || 0;

    } else {
      // Gemini
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_GEMINI_API_KEY') || "";
      if (!geminiApiKey) throw new Error("Chave de API do Gemini não configurada.");

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: ai_model || "gemini-2.0-flash" });

      let result;
      // Se tiver imagens base64, usar multimodal. Senão, enviar o arquivo PDF bruto.
      const images: string[] = pageImagesJson ? JSON.parse(pageImagesJson) : [];
      if (images.length > 0) {
        const content = [
          prompt,
          ...images.map(img => ({
            inlineData: {
              data: img,
              mimeType: "image/jpeg"
            }
          }))
        ];
        result = await model.generateContent(content);
      } else {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: "application/pdf"
            }
          }
        ]);
      }

      responseText = result.response.text();
      totalTokens = result.response.usageMetadata?.totalTokenCount || 0;
    }

    // 3. Processar resposta JSON
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const extractedData = JSON.parse(cleanJson);

    let action = "";
    let title = "";
    let units_count = 0;
    let price_from = 0;
    let images_count = 0;

    if (mode === 'cadastro') {
      const propertiesList = extractedData.properties || [];
      for (const prop of propertiesList) {
        const { data } = await supabaseClient
          .from('properties')
          .insert({
            tenant_id: tenant_id,
            title: prop.title,
            price: prop.price,
            type: prop.type || 'apartment',
            status: 'Disponível',
            description: prop.description,
            details: prop.details || {}
          })
          .select()
          .single();
        if (data) {
          title = data.title;
          price_from = data.price;
        }
      }
      action = "created";
      units_count = propertiesList.length;

    } else if (mode === 'tabela' && property_id) {
      const unitsList = extractedData.units || [];
      for (const unit of unitsList) {
        const unitTitle = `${parentPropertyTitle} - Apto ${unit.unit_number} ${unit.block ? '- ' + unit.block : ''}`;
        
        await supabaseClient
          .from('properties')
          .upsert({
            tenant_id: tenant_id,
            title: unitTitle,
            price: unit.price,
            type: 'apartment',
            status: 'Disponível',
            details: {
              ...unit.details,
              area: unit.area,
              parent_property_id: property_id,
              is_unit: true
            }
          }, { onConflict: 'title,tenant_id' });
      }
      action = "updated";
      title = parentPropertyTitle;
      units_count = unitsList.length;
      if (unitsList.length > 0) {
        price_from = Math.min(...unitsList.map((u: any) => u.price || Infinity));
      }

    } else {
      // Modo Book
      const { data } = await supabaseClient
        .from('properties')
        .insert({
          tenant_id: tenant_id,
          title: extractedData.title || "Novo Empreendimento",
          price: extractedData.price_indicator || null,
          type: extractedData.type || 'apartment',
          status: 'Disponível',
          description: extractedData.description,
          details: {
            amenities: extractedData.amenities || []
          }
        })
        .select()
        .single();
      if (data) {
        title = data.title;
        price_from = data.price || 0;
      }
      action = "created_book";
    }

    // 4. Log de Uso IA
    await supabaseClient.from('ai_usage').insert({
      tenant_id: tenant_id,
      model: ai_model,
      total_tokens: totalTokens,
      feature_context: `property-pdf-import-${mode}`
    });

    return new Response(
      JSON.stringify({
        success: true,
        action,
        title,
        units_count,
        price_from,
        images_count
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error processing PDF:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
