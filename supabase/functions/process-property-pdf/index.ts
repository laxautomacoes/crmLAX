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
    const ai_model = (formData.get('ai_model') as string) || 'gemini-2.5-flash';
    const property_id = formData.get('property_id') as string;
    const pageImagesJson = formData.get('page_images') as string;
    
    // Novos campos para modo tabela
    const reference_month = formData.get('reference_month') as string;
    const index_type = (formData.get('index_type') as string) || 'CUB';
    const index_value = formData.get('index_value') as string;

    if (!pdfFile && !pageImagesJson && !tenant_id) {
      throw new Error("Arquivo PDF (ou imagens) e tenant_id são obrigatórios.");
    }

    // Obter dados do empreendimento pai se for modo tabela
    let parentPropertyTitle = "";
    let templateMapping = null;
    if (mode === 'tabela' && property_id) {
      const { data: parentProperty } = await supabaseClient
        .from('properties')
        .select('title, price_table_template_mapping')
        .eq('id', property_id)
        .single();
      if (parentProperty) {
        parentPropertyTitle = parentProperty.title;
        templateMapping = parentProperty.price_table_template_mapping;
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
      // Prompt detalhado para extração de tabela de preços
      const templateHint = templateMapping && Object.keys(templateMapping).length > 0
        ? `\nO mapeamento de colunas deste empreendimento é: ${JSON.stringify(templateMapping)}\nUse este mapeamento como referência para identificar os campos corretamente.`
        : '';
      
      prompt = `
        Você é um especialista em OCR imobiliário, focado em tabelas de preços de empreendimentos.
        O nome do empreendimento é "${parentPropertyTitle}".${templateHint}
        
        Analise esta tabela de preços e extraia TODOS os dados estruturados.
        
        IMPORTANTE: 
        - Extraia TODAS as unidades/apartamentos da tabela
        - Para valores monetários, use APENAS números (sem R$, sem pontos de milhar, use ponto como decimal)
        - Alguns apartamentos podem compartilhar valores de fluxo com outros (agrupados). Neste caso, replique os valores para todas as unidades do grupo.
        - Identifique a estrutura de pagamento do cabeçalho (percentuais e quantidade de parcelas)
        
        Retorne APENAS um JSON válido no formato:
        {
          "payment_structure": {
            "ato": { "pct": 8, "parcelas": 1 },
            "mensais": { "pct": 12, "parcelas": 29 },
            "reforcos": { "pct": 10, "parcelas": 2 },
            "chaves": { "pct": 10, "parcelas": 1 },
            "financiamento": { "pct": 60, "parcelas": 120 }
          },
          "units": [
            {
              "unit_number": "601",
              "block_tower": "Torre 2",
              "floor": 6,
              "garage_type": "Coberta",
              "garage_number": "173",
              "hobby_box": "G3",
              "hobby_box_number": "",
              "area_total": 100.50,
              "area_privativa": 55.44,
              "valor_ato": 65250.39,
              "valor_mensais": 3375.02,
              "valor_reforcos": 40781.49,
              "valor_chaves": 81562.99,
              "soma_poupanca": 326251.95,
              "valor_financiamento": 489377.92,
              "valor_total": 815629.86,
              "extra_data": {}
            }
          ]
        }
        
        Regras de extração:
        1. "unit_number": Número do apartamento (ex: "601", "1005")
        2. "block_tower": Nome da torre ou bloco (ex: "Torre 2", "Bloco A"). Se não houver, use null.
        3. "floor": Andar do apartamento. Extraia do número (601 = andar 6, 1005 = andar 10). Se não for claro, use null.
        4. "garage_type": "Coberta" ou "Descoberta" (pode aparecer como "Cobt." ou "Desct.")
        5. "garage_number": Número da vaga de garagem
        6. "hobby_box": Tipo do hobby box (ex: "G1", "G2", "G3", "PII")
        7. "hobby_box_number": Número do hobby box, se houver
        8. Todos os valores monetários devem ser números decimais (ex: 65250.39, não "65.250,39")
        9. Se um apartamento não tem valores de fluxo próprios (célula vazia), verifique se faz parte de um grupo e replique os valores do grupo.
        10. Se realmente não houver valor, use null.
        
        Não inclua textos explicativos fora do JSON.
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
      const model = genAI.getGenerativeModel({ model: ai_model || "gemini-2.5-flash" });

      let result;
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
      const paymentStructure = extractedData.payment_structure || {};

      // Upload do PDF para o Storage (se houver arquivo)
      let fileUrl = null;
      if (pdfFile) {
        const fileName = `price-tables/${tenant_id}/${property_id}/${Date.now()}-${pdfFile.name}`;
        const { data: uploadData } = await supabaseClient.storage
          .from('documents')
          .upload(fileName, pdfFile, { contentType: 'application/pdf' });
        if (uploadData) {
          const { data: urlData } = supabaseClient.storage.from('documents').getPublicUrl(fileName);
          fileUrl = urlData?.publicUrl || null;
        }
      }

      // Desativar tabelas anteriores
      await supabaseClient
        .from('property_price_tables')
        .update({ is_active: false })
        .eq('property_id', property_id)
        .eq('is_active', true);

      // Criar nova tabela de preços
      const refMonth = reference_month || new Date().toISOString().slice(0, 7);
      const { data: priceTableData } = await supabaseClient
        .from('property_price_tables')
        .insert({
          property_id: property_id,
          tenant_id: tenant_id,
          reference_month: refMonth,
          index_type: index_type || 'CUB',
          index_value: index_value ? parseFloat(index_value) : null,
          payment_structure: paymentStructure,
          file_url: fileUrl,
          total_units: unitsList.length,
          available_units: unitsList.length,
          is_active: true,
          uploaded_by: null  // Será resolvido pelo RLS
        })
        .select()
        .single();

      if (!priceTableData) {
        throw new Error("Erro ao criar registro da tabela de preços.");
      }

      // Inserir unidades
      const unitsToInsert = unitsList.map((unit: any) => ({
        property_id: property_id,
        tenant_id: tenant_id,
        price_table_id: priceTableData.id,
        unit_number: String(unit.unit_number),
        block_tower: unit.block_tower || null,
        floor: unit.floor || null,
        garage_type: unit.garage_type || null,
        garage_number: unit.garage_number ? String(unit.garage_number) : null,
        hobby_box: unit.hobby_box || null,
        hobby_box_number: unit.hobby_box_number ? String(unit.hobby_box_number) : null,
        area_total: unit.area_total || null,
        area_privativa: unit.area_privativa || null,
        valor_ato: unit.valor_ato || null,
        valor_mensais: unit.valor_mensais || null,
        valor_reforcos: unit.valor_reforcos || null,
        valor_chaves: unit.valor_chaves || null,
        soma_poupanca: unit.soma_poupanca || null,
        valor_financiamento: unit.valor_financiamento || null,
        valor_total: unit.valor_total || null,
        extra_data: unit.extra_data || {},
        status: 'available'
      }));

      if (unitsToInsert.length > 0) {
        await supabaseClient
          .from('property_units')
          .insert(unitsToInsert);
      }

      // Atualizar preço do empreendimento pai com o menor valor total
      const validPrices = unitsList
        .filter((u: any) => u.valor_total && u.valor_total > 0)
        .map((u: any) => u.valor_total);
      
      if (validPrices.length > 0) {
        const minPrice = Math.min(...validPrices);
        await supabaseClient
          .from('properties')
          .update({ price: minPrice })
          .eq('id', property_id);
      }

      // Salvar o template_mapping da IA para uso futuro
      if (paymentStructure && Object.keys(paymentStructure).length > 0) {
        await supabaseClient
          .from('properties')
          .update({ price_table_template_mapping: paymentStructure })
          .eq('id', property_id);
      }

      action = "updated";
      title = parentPropertyTitle;
      units_count = unitsList.length;
      if (validPrices.length > 0) {
        price_from = Math.min(...validPrices);
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
