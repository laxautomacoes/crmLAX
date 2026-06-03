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
        ? `\nMAPEAMENTO ANTERIOR (use como referência): ${JSON.stringify(templateMapping)}`
        : '';
      
      prompt = `
Você é um especialista em OCR imobiliário. Analise esta TABELA DE PREÇOS do empreendimento "${parentPropertyTitle}".${templateHint}

## INSTRUÇÕES CRÍTICAS

### ETAPA 1 — Identifique a estrutura da tabela
Leia CUIDADOSAMENTE o cabeçalho da tabela. Cada tabela de empreendimento tem colunas DIFERENTES.
Exemplos de colunas reais que você pode encontrar:
- "Aptos", "Vaga Garagem", "HB", "Área Priv.", "Área Total", "Garagem (m²)"
- "Entrada", "Ato", "Sinal" → mapear para "valor_ato" 
- "Mensais", "31 X mensais", "29 X mensais" → mapear para "valor_mensais" (valor de CADA parcela)
- "Reforços", "Reforço 5X", "Reforço 2X" → mapear para "valor_reforcos" (valor de CADA reforço)
- "Chaves", "Chaves Dez/2028" → mapear para "valor_chaves"
- "Soma Poupança", "Saldo p/ FCTO" → mapear para "soma_poupanca"
- "Financiamento", "60 x mensais", "120 x mensais" → mapear para "valor_financiamento" (valor de CADA parcela de financiamento)
- "Valor Total", "Total R$" → mapear para "valor_total"

### ETAPA 2 — Identifique seções
Tabelas podem ter SEÇÕES como:
- "Apartamentos 1 Dormitório sem Garagem"
- "Apartamentos 2 Dormitórios com Garagem"
Se houver seções, use-as para preencher informações ausentes.

### ETAPA 3 — Extraia CADA unidade com valores INDIVIDUAIS
CADA LINHA da tabela é uma unidade com valores PRÓPRIOS e DIFERENTES.
NÃO use o mesmo valor para todas as unidades. Leia CADA célula individualmente.

### REGRAS DE AGRUPAMENTO
Algumas tabelas agrupam 2-4 unidades com o mesmo fluxo de pagamento.
Neste caso, os valores de pagamento aparecem em uma única célula alinhada ao grupo.
Você DEVE replicar esses valores para TODAS as unidades do grupo.

### REGRAS DE FORMATAÇÃO
- Valores monetários: usar PONTO como decimal, SEM separador de milhar (ex: 78473.00, não "78.473,00")
- Áreas: número decimal com ponto (ex: 34.56)
- Se uma célula está vazia ou tem "—", use null
- unit_number: string (ex: "1003", "303 GARDEM")
- floor: extrair do número do apto (1003 = andar 10, 601 = andar 6)
- garage_type: "Coberta" ou "Descoberta" ("Cobt." = Coberta, "Desct." = Descoberta)
- garage_number: número da vaga. Se houver "—" ou vazio, use null
- hobby_box: tipo ("G1", "G2", "G3", "PII"). Se houver "—" ou vazio, use null

### ESTRUTURA DE PAGAMENTO (payment_structure)
Extraia do CABEÇALHO da tabela:
- Identifique percentuais (ex: "8%", "12%", "10%", "60%")
- Identifique quantidade de parcelas (ex: "31 X", "5 X", "120 X")
- Mapeie para: ato, mensais, reforcos, chaves, poupanca, financiamento

Retorne APENAS um JSON válido:
{
  "payment_structure": {
    "ato": { "pct": 8, "parcelas": 1, "label": "Entrada" },
    "mensais": { "pct": 12, "parcelas": 31, "label": "31 X mensais" },
    "reforcos": { "pct": 10, "parcelas": 5, "label": "Reforço 5X" },
    "chaves": { "pct": 10, "parcelas": 1, "label": "Chaves Dez/2028" },
    "poupanca": { "pct": null, "parcelas": null, "label": "Saldo p/ FCTO direto 60 meses" },
    "financiamento": { "pct": 60, "parcelas": 60, "label": "60 x mensais" }
  },
  "units": [
    {
      "unit_number": "1003",
      "block_tower": null,
      "floor": 10,
      "garage_type": null,
      "garage_number": null,
      "hobby_box": null,
      "hobby_box_number": null,
      "area_total": 48.45,
      "area_privativa": 34.56,
      "valor_ato": 78473.00,
      "valor_mensais": 3142.00,
      "valor_reforcos": 8118.00,
      "valor_chaves": 54120.00,
      "soma_poupanca": 405895.00,
      "valor_financiamento": 6764.92,
      "valor_total": 676480.00,
      "extra_data": { "secao": "Apartamentos 1 Dormitório sem Garagem" }
    }
  ]
}

IMPORTANTE: Cada unidade DEVE ter valores DIFERENTES lidos da tabela. NÃO repita o mesmo valor para todas.
Não inclua texto fora do JSON.
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
        const base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
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
