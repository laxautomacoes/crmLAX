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

function deduplicateUnits(unitsList: any[]): any[] {
  const uniqueUnitsMap = new Map();
  for (const unit of unitsList) {
    const key = `${unit.block_tower}-${unit.unit_number}`;
    if (!uniqueUnitsMap.has(key)) {
      uniqueUnitsMap.set(key, unit);
    }
  }
  return Array.from(uniqueUnitsMap.values());
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
    const pdfFile = formData.get('file') as File;
    const tenant_id = formData.get('tenant_id') as string;
    const mode = (formData.get('mode') as string) || 'cadastro';
    const ai_provider = (formData.get('ai_provider') as string) || 'gemini';
    const ai_model = (formData.get('ai_model') as string) || 'gemini-2.5-flash';
    const property_id = formData.get('property_id') as string;
    const pageImagesJson = formData.get('page_images') as string;
    const block_tower = formData.get('block_tower') as string;
    
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
      const templateHint = templateMapping && Object.keys(templateMapping).length > 0
        ? `\nMAPEAMENTO ANTERIOR (use como referência): ${JSON.stringify(templateMapping)}`
        : '';
      prompt = `Você é um especialista em OCR imobiliário e extração de dados estruturados. Sua missão é ler as tabelas de preços da imagem com **EXTREMA CONSTÂNCIA E PRECISÃO**. Analise a TABELA DE PREÇOS do empreendimento "${parentPropertyTitle}".${templateHint}

Para garantir que você não omita apartamentos devido ao layout confuso ou buracos na tabela, você aplicará o método **Chain-of-Thought (Checklist CoT)** em 2 passos obrigatórios.

## PASSO 1: O Checklist das Torres
Faça uma varredura estritamente VERTICAL de cima a baixo nas colunas da tabela que contém a palavra "Torre" (ex: "Torre 01", "Torre 02"). 
Liste exaustivamente **TODOS os números de apartamentos visíveis** embaixo de cada torre na imagem, não importa a linha. Se houver células mescladas como "301 401 402", adicione "301", "401" e "402" na lista daquela torre.
**REGRA DE OURO:** NUNCA confunda vagas de garagem (que frequentemente possuem barras ou letras, como "99/99V", "101/101L") com números de apartamentos. Liste no checklist APENAS os números que representam genuinamente os apartamentos reais (números puros).
Isso formará o "passo1_checklist_torres_e_apartamentos".

## PASSO 2: A Extração Baseada no Checklist
Agora, você usará o array gerado no PASSO 1 como seu guia. **Para CADA apartamento listado no seu checklist**, você vai olhar a linha horizontal a que ele pertence e extrair os detalhes (vagas e preços).
- Nunca omita um apartamento listado no checklist. Se você listou 20 apartamentos no passo 1, o array "passo2_unidades_detalhadas" DEVE conter exatamente 20 objetos.
- \`unit_number\`: O número do apartamento extraído do checklist (ex: "402").
- \`block_tower\`: A torre correspondente (ex: "Torre 02").
- \`floor\`: Inferido pelo apartamento (ex: "402" -> 4).
- \`garage_number\`: O número da vaga na mesma linha. Atenção aos emparelhamentos (ex: se o apartamento é o segundo do agrupamento "401 402", pegue a segunda vaga do agrupamento correspondente "84/85L - 82/83L" -> "82/83L").
- \`garage_type\`: "Coberta" ou "Descoberta" (Preencha apenas se a classificação estiver explicitamente escrita na tabela, caso contrário deixe null).
- \`area_privativa\` e \`area_total\`: Valores com ponto flutuante.
- Valores Financeiros: Extraia APENAS os valores explicitamente presentes na tabela. Se o empreendimento não possuir "Ato", "Mensais" ou "Chaves" (por exemplo, se estiver pronto e tiver apenas "Valor Total"), preencha esses campos ausentes com null. NUNCA invente ou deduza valores. (Porém, lembre-se: se vários apartamentos estiverem agrupados na mesma célula compartilhando os preços à direita, você DEVE repetir o exato mesmo valor para TODOS os apartamentos desse grupo, não deixando nulo por estarem agrupados).
- \`extra_data.secao\`: O título da tipologia.

Retorne APENAS um JSON válido seguindo a estrutura:
{
  "payment_structure": {
    "ato": { "pct": null, "parcelas": null, "label": "Ato/Entrada" }
  },
  "passo1_checklist_torres_e_apartamentos": [
     { "torre": "Torre 01", "apartamentos": ["301", "501", "502", "701", "702", "801", "1001", "1002"] },
     { "torre": "Torre 02", "apartamentos": ["201", "202", "301", "401", "402", "601", "602", "801", "802", "901", "1001", "1002"] }
  ],
  "passo2_unidades_detalhadas": [
     {
        "unit_number": "301",
        "block_tower": "Torre 01",
        "floor": 3,
        "garage_number": "67/118L",
        "garage_type": null,
        "area_privativa": 122.42,
        "area_total": 223.48,
        "valor_ato": 120000.00,
        "valor_total": 1613753.44,
        "extra_data": { "secao": "3 Dormitórios (2 Suítes) + Dependência" }
     }
  ]
}

Seja metódico. Não engula nenhum apartamento.`;
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

    let totalTokens = 0;
    const images: string[] = pageImagesJson ? JSON.parse(pageImagesJson) : [];

    // Objeto que guardará os resultados consolidados
    let extractedData: any = null;

    if (mode === 'tabela') {
      extractedData = { payment_structure: {}, units: [] };
    } else if (mode === 'cadastro') {
      extractedData = { properties: [] };
    } else {
      extractedData = { title: "", type: "apartment", description: "", amenities: [], price_indicator: null };
    }

    if (images.length > 0) {
      console.log(`Iniciando processamento sequencial de ${images.length} páginas...`);
      for (let idx = 0; idx < images.length; idx++) {
        const img = images[idx];
        let pageResponseText = "";
        console.log(`Processando página ${idx + 1}/${images.length}...`);

        if (ai_provider === 'openai') {
          const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || "";
          if (!openaiApiKey) throw new Error("Chave de API da OpenAI não configurada.");
          const openai = new OpenAI({ apiKey: openaiApiKey });

          const content = [
            { type: "text", text: `${prompt}\n\nATENÇÃO: Você está processando a imagem da PÁGINA ${idx + 1} de um total de ${images.length} páginas.` },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${img}` }
            }
          ];

          const response = await openai.chat.completions.create({
            model: ai_model || "gpt-4o",
            messages: [{ role: "user", content: content as any }],
            temperature: 0.1,
          });

          pageResponseText = response.choices[0].message.content || "";
          totalTokens += response.usage?.total_tokens || 0;

        } else {
          // Gemini
          const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_GEMINI_API_KEY') || "";
          if (!geminiApiKey) throw new Error("Chave de API do Gemini não configurada.");
          const genAI = new GoogleGenerativeAI(geminiApiKey);
          const model = genAI.getGenerativeModel({ model: ai_model || "gemini-2.5-flash" });

          const content = [
            `${prompt}\n\nATENÇÃO: Você está processando a imagem da PÁGINA ${idx + 1} de um total de ${images.length} páginas.`,
            {
              inlineData: {
                data: img,
                mimeType: "image/jpeg"
              }
            }
          ];
          const result = await model.generateContent(content);
          pageResponseText = result.response.text();
          totalTokens += result.response.usageMetadata?.totalTokenCount || 0;
        }

        // Processar resposta JSON da página
        try {
          const cleanJson = pageResponseText.replace(/```json|```/g, "").trim();
          const pageData = JSON.parse(cleanJson);

          if (mode === 'tabela') {
            if (pageData.passo2_unidades_detalhadas && Array.isArray(pageData.passo2_unidades_detalhadas)) {
              extractedData.units.push(...pageData.passo2_unidades_detalhadas);
              console.log(`Página ${idx + 1} processada com sucesso via CoT. Unidades: ${pageData.passo2_unidades_detalhadas.length}`);
            } else {
              console.warn(`Página ${idx + 1} não retornou a estrutura CoT esperada. Tentando fallback para estrutura antiga...`);
              if (pageData.units && Array.isArray(pageData.units)) {
                extractedData.units.push(...pageData.units);
              }
            }
            if (pageData.payment_structure && Object.keys(extractedData.payment_structure).length === 0) {
              extractedData.payment_structure = pageData.payment_structure;
            }
          } else if (mode === 'cadastro') {
            if (pageData.properties && Array.isArray(pageData.properties)) {
              extractedData.properties.push(...pageData.properties);
            }
            console.log(`Página ${idx + 1} processada com sucesso. Imóveis extraídos: ${pageData.properties?.length || 0}`);
          } else {
            extractedData.title = pageData.title || extractedData.title;
            extractedData.type = pageData.type || extractedData.type;
            if (pageData.description) {
              extractedData.description += (extractedData.description ? "\n" : "") + pageData.description;
            }
            if (pageData.amenities && Array.isArray(pageData.amenities)) {
              extractedData.amenities = Array.from(new Set([...extractedData.amenities, ...pageData.amenities]));
            }
            extractedData.price_indicator = pageData.price_indicator || extractedData.price_indicator;
            console.log(`Página ${idx + 1} processada com sucesso (modo book).`);
          }
        } catch (err) {
          console.error(`Erro ao processar/parsear JSON da página ${idx + 1}:`, err.message);
          console.error("Resposta crua da IA:", pageResponseText);
        }
      }
    } else {
      // PDF direto para Gemini (sem imagens renderizadas)
      console.log("Processando PDF diretamente via Gemini...");
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_GEMINI_API_KEY') || "";
      if (!geminiApiKey) throw new Error("Chave de API do Gemini não configurada.");
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: ai_model || "gemini-2.5-flash" });

      const arrayBuffer = await pdfFile.arrayBuffer();
      const base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
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
      totalTokens = result.response.usageMetadata?.totalTokenCount || 0;

      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      extractedData = JSON.parse(cleanJson);
    }

    // Converter e deduplicar
    if (mode === 'tabela') {
      if (extractedData.passo2_unidades_detalhadas && Array.isArray(extractedData.passo2_unidades_detalhadas)) {
        extractedData.units = extractedData.passo2_unidades_detalhadas;
      }
      if (extractedData.units && Array.isArray(extractedData.units)) {
        extractedData.units = deduplicateUnits(extractedData.units);
      }
    }

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
      let deactivateQuery = supabaseClient
        .from('property_price_tables')
        .update({ is_active: false })
        .eq('property_id', property_id)
        .eq('is_active', true);

      if (block_tower) {
        deactivateQuery = deactivateQuery.eq('block_tower', block_tower);
      } else {
        deactivateQuery = deactivateQuery.is('block_tower', null);
      }

      await deactivateQuery;

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
          uploaded_by: null,  // Será resolvido pelo RLS
          block_tower: block_tower || null
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
        block_tower: unit.block_tower || block_tower || null,
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
