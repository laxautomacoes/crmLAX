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
    let columnMapping: Record<string, string> | null = null;
    if (mode === 'tabela' && property_id) {
      const { data: parentProperty } = await supabaseClient
        .from('properties')
        .select('title, price_table_template_mapping, details')
        .eq('id', property_id)
        .single();
      if (parentProperty) {
        parentPropertyTitle = parentProperty.title;
        templateMapping = parentProperty.price_table_template_mapping;
        // Extrair mapeamento de colunas definido pelo admin
        const details = parentProperty.details as Record<string, any> | null;
        if (details?.empreendimento?.column_mapping) {
          const cm = details.empreendimento.column_mapping;
          // Verificar se pelo menos um campo foi preenchido
          const hasValues = Object.values(cm).some((v: any) => v && v.trim() !== '');
          if (hasValues) columnMapping = cm;
        }
      }
    }

    const hasTorre = !!(columnMapping && (columnMapping as any).torre?.trim() && (columnMapping as any).torre?.trim() !== '-');
    const hasTipo = !!(columnMapping && (columnMapping as any).tipo?.trim() && (columnMapping as any).tipo?.trim() !== '-');
    const hasVaga = !!(columnMapping && (columnMapping as any).vaga?.trim() && (columnMapping as any).vaga?.trim() !== '-');
    const hasHB = !!(columnMapping && (columnMapping as any).hb?.trim() && (columnMapping as any).hb?.trim() !== '-');
    const hasAto = !!(columnMapping && (columnMapping as any).ato?.trim() && (columnMapping as any).ato?.trim() !== '-');
    const hasMensais = !!(columnMapping && (columnMapping as any).mensais?.trim() && (columnMapping as any).mensais?.trim() !== '-');
    const hasReforcos = !!(columnMapping && (columnMapping as any).reforcos?.trim() && (columnMapping as any).reforcos?.trim() !== '-');
    const hasChaves = !!(columnMapping && (columnMapping as any).chaves?.trim() && (columnMapping as any).chaves?.trim() !== '-');
    const hasSaldo = !!(columnMapping && (columnMapping as any).saldo?.trim() && (columnMapping as any).saldo?.trim() !== '-');
    const hasFinanciamento = !!(columnMapping && (columnMapping as any).financiamento?.trim() && (columnMapping as any).financiamento?.trim() !== '-');

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

      // Construir bloco de instruções de mapeamento
      let columnMappingBlock = '';
      if (columnMapping) {
        const mappingLines: string[] = [];
        const cm = columnMapping as any;

        // Mapeamento de nomes de colunas
        if (cm.apto?.trim() && cm.apto.trim() !== '-') {
          mappingLines.push(`- A coluna de **Número do Apartamento/Unidade** na tabela se chama: "${cm.apto.trim()}"`);
        }
        if (cm.torre?.trim() === '-') {
          mappingLines.push(`- **TORRE/BLOCO: NÃO EXISTE** neste empreendimento. Este empreendimento possui APENAS UMA torre/bloco. Portanto, "block_tower" DEVE SER SEMPRE null para TODAS as unidades.`);
        } else if (cm.torre?.trim()) {
          mappingLines.push(`- A coluna de **Torre/Bloco** na tabela se chama: "${cm.torre.trim()}"`);
        }
        if (cm.tipo?.trim() === '-') {
          mappingLines.push(`- **TIPOLOGIA/TIPO: NÃO possui coluna dedicada.** As tipologias aparecem como LINHAS DE SEÇÃO (linhas que abrangem toda a largura da tabela e não possuem dados numéricos). Essas linhas devem ser lidas como o campo "extra_data.secao" de todas as unidades que aparecem ABAIXO delas, até a próxima linha de seção. ATENÇÃO: Extraia APENAS a tipologia e OMITA o indicador de final/posição (ex: "FINAL 01 - 2 SUÍTES", extraia apenas "2 SUÍTES").`);
        } else if (cm.tipo?.trim()) {
          mappingLines.push(`- A coluna de **Tipologia** na tabela se chama: "${cm.tipo.trim()}". ATENÇÃO: Extraia APENAS a tipologia e OMITA o indicador de final/posição (ex: "FINAL 01 - 2 SUÍTES", extraia apenas "2 SUÍTES").`);
        }
        if (cm.vaga?.trim() === '-') {
          mappingLines.push(`- **VAGA/GARAGEM: NÃO EXISTE** nesta tabela. Deixe "garage_number" como null.`);
        } else if (cm.vaga?.trim()) {
          mappingLines.push(`- A coluna de **Vaga/Garagem** na tabela se chama: "${cm.vaga.trim()}"`);
        }
        if (cm.hb?.trim() === '-') {
          mappingLines.push(`- **HOBBY BOX/DEPÓSITO: NÃO EXISTE** nesta tabela. Deixe "hobby_box" como null.`);
        } else if (cm.hb?.trim()) {
          mappingLines.push(`- A coluna de **Hobby Box/Depósito** na tabela se chama: "${cm.hb.trim()}"`);
        }
        if (cm.area_privativa?.trim() && cm.area_privativa.trim() !== '-') {
          mappingLines.push(`- A coluna de **Área Privativa** na tabela se chama: "${cm.area_privativa.trim()}"`);
        }
        if (cm.valor_total?.trim() && cm.valor_total.trim() !== '-') {
          mappingLines.push(`- A coluna de **Valor Total** na tabela se chama: "${cm.valor_total.trim()}"`);
        }
        if (cm.ato?.trim() === '-') {
          mappingLines.push(`- **ATO/ENTRADA: NÃO EXISTE** nesta tabela. Deixe "valor_ato" como null.`);
        } else if (cm.ato?.trim()) {
          mappingLines.push(`- A coluna de **Ato / Entrada** na tabela se chama: "${cm.ato.trim()}"`);
        }
        if (cm.mensais?.trim() === '-') {
          mappingLines.push(`- **MENSAIS: NÃO EXISTE** nesta tabela. Deixe "valor_mensais" como null.`);
        } else if (cm.mensais?.trim()) {
          mappingLines.push(`- A coluna de **Mensais** na tabela se chama: "${cm.mensais.trim()}"`);
        }
        if (cm.reforcos?.trim() === '-') {
          mappingLines.push(`- **REFORÇOS/INTERMEDIÁRIAS: NÃO EXISTE** nesta tabela. Deixe "valor_reforcos" como null.`);
        } else if (cm.reforcos?.trim()) {
          mappingLines.push(`- A coluna de **Reforços / Intermediárias** na tabela se chama: "${cm.reforcos.trim()}"`);
        }
        if (cm.chaves?.trim() === '-') {
          mappingLines.push(`- **CHAVES: NÃO EXISTE** nesta tabela. Deixe "valor_chaves" como null.`);
        } else if (cm.chaves?.trim()) {
          mappingLines.push(`- A coluna de **Chaves** na tabela se chama: "${cm.chaves.trim()}"`);
        }
        if (cm.saldo?.trim() === '-') {
          mappingLines.push(`- **SALDO DEVEDOR / POUPANÇA: NÃO EXISTE** nesta tabela. Deixe "soma_poupanca" como null.`);
        } else if (cm.saldo?.trim()) {
          mappingLines.push(`- A coluna de **Saldo devedor / Poupança** na tabela se chama: "${cm.saldo.trim()}"`);
        }
        if (cm.financiamento?.trim() === '-') {
          mappingLines.push(`- **FINANCIAMENTO: NÃO EXISTE** nesta tabela. Deixe "valor_financiamento" como null.`);
        } else if (cm.financiamento?.trim()) {
          mappingLines.push(`- A coluna de **Financiamento** na tabela se chama: "${cm.financiamento.trim()}"`);
        }

        if (mappingLines.length > 0) {
          columnMappingBlock = `\n\n## ⚠️ MAPEAMENTO DE COLUNAS (OBRIGATÓRIO — DEFINIDO PELO ADMINISTRADOR)
O administrador deste empreendimento definiu as seguintes regras MANDATÓRIAS para a leitura desta tabela. Estas regras TÊM PRIORIDADE ABSOLUTA sobre qualquer inferência sua:
${mappingLines.join('\n')}

**IMPORTANTE**: Respeite rigorosamente este mapeamento. Se o administrador diz que um campo NÃO EXISTE, ele NÃO EXISTE — não tente inferir ou preencher com dados de outra coluna.`;
        }
      }

      // Construir PASSO 1 condicional (com ou sem torres)
      let passo1Text = '';
      let passo1Example = '';
      if (hasTorre) {
        passo1Text = `## PASSO 1: O Checklist das Torres
Faça uma varredura estritamente VERTICAL de cima a baixo nas colunas da tabela que contém a palavra "Torre" (ou equivalente definido no mapeamento acima). 
Liste exaustivamente **TODOS os números de apartamentos visíveis** embaixo de cada torre na imagem, não importa a linha. Se houver células mescladas como "301 401 402", adicione "301", "401" e "402" na lista daquela torre.
**REGRA DE OURO:** NUNCA confunda vagas de garagem (que frequentemente possuem barras ou letras, como "99/99V", "101/101L") com números de apartamentos. Liste no checklist APENAS os números que representam genuinamente os apartamentos reais (números puros).
Isso formará o "passo1_checklist_torres_e_apartamentos".`;
        passo1Example = `"passo1_checklist_torres_e_apartamentos": [
     { "torre": "Torre 01", "apartamentos": ["301", "501", "502", "701"] },
     { "torre": "Torre 02", "apartamentos": ["201", "301", "401", "601"] }
  ]`;
      } else {
        passo1Text = `## PASSO 1: O Checklist de Seções e Apartamentos
⚠️ Este empreendimento NÃO possui múltiplas torres. A tabela está organizada por **SEÇÕES DE TIPOLOGIA** — linhas que abrangem toda a largura da tabela e funcionam como cabeçalhos/divisórias.
ATENÇÃO: Você DEVE OMITIR o indicador de posição/final. Se a seção for "FINAL 01 - 2 SUÍTES + LAVABO", considere apenas "2 SUÍTES + LAVABO".

Faça uma varredura de CIMA PARA BAIXO na tabela e:
1. Identifique cada **LINHA DE SEÇÃO** (linha que abrange todas as colunas e NÃO contém dados numéricos de apartamento — ela contém apenas o nome/descrição da tipologia). OMITA O FINAL.
2. Abaixo de cada seção, liste TODOS os números de apartamentos/unidades visíveis.
**REGRA DE OURO:** NUNCA confunda vagas de garagem (barras, letras como "99/99V") com números de apartamentos.
Isso formará o "passo1_checklist_torres_e_apartamentos" — mas usando a descrição limpa da seção no lugar de "torre".`;
        passo1Example = `"passo1_checklist_torres_e_apartamentos": [
     { "torre": "2 SUÍTES + LAVABO", "apartamentos": ["201"] },
     { "torre": "2 DORMITÓRIOS SENDO 1 SUÍTE", "apartamentos": ["206", "306"] },
     { "torre": "LOJAS", "apartamentos": ["4", "5", "6", "7", "8"] }
  ]`;
      }

      // Construir PASSO 2 condicional
      let passo2BlockTower = '';
      let passo2Example = '';
      if (hasTorre) {
        passo2BlockTower = `- \`block_tower\`: A torre correspondente (ex: "Torre 02").`;
        passo2Example = `{
         "unit_number": "301",
         "block_tower": "Torre 01",
         "floor": 3,
         "garage_number": "67/118L",
         "garage_type": null,
         "hobby_box": "12",
         "area_privativa": 122.42,
         "area_total": 223.48,
         "valor_ato": 120000.00,
         "valor_mensais": 8500.00,
         "valor_reforcos": 25000.00,
         "valor_chaves": 80000.00,
         "soma_poupanca": 450000.00,
         "valor_financiamento": 1163753.44,
         "valor_total": 1613753.44,
         "extra_data": { "secao": "3 Dormitórios (2 Suítes) + Dependência" }
      }`;
      } else {
        passo2BlockTower = `- \`block_tower\`: DEVE SER SEMPRE null (este empreendimento não possui múltiplas torres).`;
        passo2Example = `{
         "unit_number": "201",
         "block_tower": null,
         "floor": 2,
         "garage_number": "45",
         "garage_type": null,
         "hobby_box": "56",
         "area_privativa": 81.45,
         "area_total": 121.78,
         "valor_ato": null,
         "valor_mensais": 4500.00,
         "valor_reforcos": null,
         "valor_chaves": 50000.00,
         "soma_poupanca": 350000.00,
         "valor_financiamento": 969714.64,
         "valor_total": 1319714.64,
         "extra_data": { "secao": "2 SUÍTES + LAVABO" }
      }`;
      }

      prompt = `Você é um especialista em OCR imobiliário e extração de dados estruturados. Sua missão é ler as tabelas de preços da imagem com **EXTREMA CONSTÂNCIA E PRECISÃO**. Analise a TABELA DE PREÇOS do empreendimento "${parentPropertyTitle}".${templateHint}${columnMappingBlock}

Para garantir que você não omita apartamentos devido ao layout confuso ou buracos na tabela, você aplicará o método **Chain-of-Thought (Checklist CoT)** em 2 passos obrigatórios.

${passo1Text}

## PASSO 2: A Extração Baseada no Checklist
Agora, você usará o array gerado no PASSO 1 como seu guia. **Para CADA apartamento listado no seu checklist**, você vai olhar a linha horizontal a que ele pertence e extrair os detalhes (vagas e preços).
- Nunca omita um apartamento listado no checklist. Se você listou 20 apartamentos no passo 1, o array "passo2_unidades_detalhadas" DEVE conter exatamente 20 objetos.
- \`unit_number\`: O número do apartamento extraído do checklist (ex: "402").
${passo2BlockTower}
- \`floor\`: Inferido pelo apartamento (ex: "402" -> 4).
- \`garage_number\`: O número da vaga na mesma linha.${!hasVaga ? ' (Este empreendimento não possui coluna de vaga — use null)' : ' Atenção aos emparelhamentos (ex: se o apartamento é o segundo do agrupamento "401 402", pegue a segunda vaga do agrupamento correspondente "84/85L - 82/83L" -> "82/83L").'}
- \`garage_type\`: "Coberta" ou "Descoberta" (Preencha apenas se a classificação estiver explicitamente escrita na tabela, caso contrário deixe null).
- \`hobby_box\`: O número do hobby box ou depósito na mesma linha.${!hasHB ? ' (Este empreendimento não possui coluna de hobby box — use null)' : ' Atenção: extraia o hobby box de CADA unidade individualmente. Se houver células mescladas (ex: vários apartamentos agrupados compartilhando hobby boxes), distribua cada hobby box ao apartamento correspondente na mesma ordem de cima para baixo. NUNCA deixe hobby_box como null se a coluna existe e contém dados — leia atentamente CADA célula.'}
- \`area_privativa\` e \`area_total\`: Valores com ponto flutuante.
- Valores Financeiros: Extraia os valores financeiros de cada unidade nos seguintes campos (retorne null caso a coluna correspondente não exista ou o valor seja nulo):
  - \`valor_ato\`: O valor do ato/entrada.
  - \`valor_mensais\`: O valor das parcelas mensais.
  - \`valor_reforcos\`: O valor das parcelas de reforço/intermediárias.
  - \`valor_chaves\`: O valor das parcelas de chaves/entrega.
  - \`soma_poupanca\`: O valor do saldo devedor/poupança.
  - \`valor_financiamento\`: O valor a ser financiado.
  - \`valor_total\`: O valor total do imóvel.
  NUNCA invente ou deduza valores. Se múltiplos apartamentos compartilham a mesma célula de preços, repita o exato valor para todos os apartamentos do grupo.
- \`extra_data.secao\`: A tipologia à qual este apartamento pertence. ATENÇÃO: Extraia APENAS a descrição do tipo de imóvel e OMITA indicadores de final/posição (como "FINAL 01 - ", etc.), pois essa informação já está implícita no número do apto. Exemplo: se na tabela diz "FINAL 01 - 2 SUÍTES + LAVABO", retorne APENAS "2 SUÍTES + LAVABO".

Retorne APENAS um JSON válido seguindo a estrutura:
{
  "payment_structure": {
    "ato": { "pct": null, "parcelas": null, "label": "Ato/Entrada" }
  },
  ${passo1Example},
  "passo2_unidades_detalhadas": [
     ${passo2Example}
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
        extractedData.units.forEach((u: any) => {
          if (!hasTorre) u.block_tower = null;
          if (!hasTipo) {
             if (u.extra_data) u.extra_data.secao = null;
          }
          if (!hasVaga) {
             u.garage_number = null;
             u.garage_type = null;
          }
          if (!hasHB) u.hobby_box = null;
          if (!hasAto) u.valor_ato = null;
          if (!hasMensais) u.valor_mensais = null;
          if (!hasReforcos) u.valor_reforcos = null;
          if (!hasChaves) u.valor_chaves = null;
          if (!hasSaldo) u.soma_poupanca = null;
          if (!hasFinanciamento) u.valor_financiamento = null;
        });
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
      if (columnMapping) {
        const cm = columnMapping as any;
        if (cm.mensais_meses) {
          if (!paymentStructure.mensais) paymentStructure.mensais = {};
          paymentStructure.mensais.parcelas = parseInt(cm.mensais_meses) || paymentStructure.mensais.parcelas || null;
        }
        if (cm.reforcos_periodo) {
          if (!paymentStructure.reforcos) paymentStructure.reforcos = {};
          paymentStructure.reforcos.periodo = cm.reforcos_periodo;
          paymentStructure.reforcos.label = cm.reforcos_periodo === 'semestral' ? 'Semestrais' : (cm.reforcos_periodo === 'anual' ? 'Anuais' : cm.reforcos_periodo);
        }
        if (cm.financiamento_meses) {
          if (!paymentStructure.financiamento) paymentStructure.financiamento = {};
          paymentStructure.financiamento.parcelas = parseInt(cm.financiamento_meses) || paymentStructure.financiamento.parcelas || null;
        }
      }

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
