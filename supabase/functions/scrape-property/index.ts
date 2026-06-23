import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Prompt para extração de dados de imóveis ──────────────────────────

const PROMPT_SCRAPE = `
Você é um especialista em extração de dados imobiliários. Analise o conteúdo de texto de uma página web que contém informações de imóvel(is) e extraia os dados estruturados.

A página pode conter UM ÚNICO imóvel ou MÚLTIPLOS imóveis. Detecte automaticamente.

Para CADA imóvel encontrado, extraia:
- Título/nome do imóvel
- Preço (apenas números, sem R$, sem pontos de milhar — use null se não encontrar)
- Tipo: apartment | house | land | commercial | penthouse | studio
- Descrição completa
- Área privativa (m²)
- Área total (m²)
- Área do terreno (m²)
- Área construída (m²)
- Dormitórios/quartos
- Suítes
- Banheiros
- Vagas de garagem
- Valor do condomínio
- Valor do IPTU
- Situação: revenda | novo | lançamento | em construção | pronto
- Endereço: rua, número, bairro, cidade, estado (sigla UF), CEP
- Amenidades (como booleanos): portaria_24h, portaria_virtual, piscina, piscina_aquecida, espaco_gourmet, salao_festas, academia, sala_jogos, sala_estudos_coworking, sala_cinema, playground, brinquedoteca, home_market
- URLs de imagens encontradas na página
- Se é empreendimento: nome da construtora, previsão de entrega

Retorne APENAS um JSON válido no formato:
{
  "count": number,
  "properties": [
    {
      "title": "string",
      "price": number ou null,
      "type": "apartment|house|land|commercial|penthouse|studio",
      "description": "string",
      "details": {
        "area_privativa": "string" ou "",
        "area_total": "string" ou "",
        "area_terreno": "string" ou "",
        "area_construida": "string" ou "",
        "quartos": "string" ou "",
        "suites": "string" ou "",
        "banheiros": "string" ou "",
        "vagas": "string" ou "",
        "valor_condominio": "string" ou "",
        "valor_iptu": "string" ou "",
        "situacao": "string",
        "obs_dormitorios": "string" ou "",
        "is_empreendimento": boolean,
        "empreendimento": {
          "construtora": "string" ou "",
          "previsao_entrega": "string" ou ""
        },
        "portaria_24h": boolean,
        "portaria_virtual": boolean,
        "piscina": boolean,
        "piscina_aquecida": boolean,
        "espaco_gourmet": boolean,
        "salao_festas": boolean,
        "academia": boolean,
        "sala_jogos": boolean,
        "sala_estudos_coworking": boolean,
        "sala_cinema": boolean,
        "playground": boolean,
        "brinquedoteca": boolean,
        "home_market": boolean,
        "endereco": {
          "rua": "string" ou "",
          "numero": "string" ou "",
          "bairro": "string" ou "",
          "cidade": "string" ou "",
          "estado": "string (sigla UF)" ou "",
          "cep": "string" ou ""
        }
      },
      "source_images": ["url1", "url2"]
    }
  ]
}

Regras:
- Se encontrar apenas 1 imóvel, retorne count: 1 com um array de 1 elemento
- Se encontrar múltiplos, retorne todos (máximo 20)
- Campos não encontrados devem ser string vazia "" ou false (booleanos)
- Preço deve ser apenas número (sem formatação) ou null
- Tipo: se não identificar, use "apartment" como padrão
- Amenidades: marque true apenas se EXPLICITAMENTE mencionadas
- Situação: se não identificar, use "revenda" como padrão
`;

// ─── AI Providers ────────────────────────────────────────────────────────

interface AIResponse {
  text: string;
  tokens: number;
}

async function callGeminiText(text: string, modelName: string, prompt: string): Promise<AIResponse> {
  const apiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('API_KEY_MISSING:GEMINI');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent([
    prompt,
    `\n\n--- CONTEÚDO DA PÁGINA ---\n\n${text}`
  ]);
  return {
    text: result.response.text(),
    tokens: result.response.usageMetadata?.totalTokenCount || 0,
  };
}

async function callOpenAIText(text: string, modelName: string, prompt: string): Promise<AIResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('API_KEY_MISSING:OPENAI');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: `${prompt}\n\n--- CONTEÚDO DA PÁGINA ---\n\n${text}` }
        ]
      }]
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error (${response.status}): ${err?.error?.message || response.statusText}`);
  }
  const data = await response.json();
  const output = data.output?.find((o: any) => o.type === 'message')?.content?.find((c: any) => c.type === 'output_text')?.text;
  if (!output) throw new Error('Resposta vazia da OpenAI.');
  const totalTokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return { text: output, tokens: totalTokens };
}

async function callAI(text: string, provider: string, model: string, prompt: string): Promise<AIResponse> {
  let primaryError: any = null;
  try {
    if (provider === 'openai') return await callOpenAIText(text, model, prompt);
    return await callGeminiText(text, model, prompt);
  } catch (err: any) {
    primaryError = err;
    console.warn(`[Scrape] Provider ${provider} falhou: ${err.message}. Tentando fallback...`);
  }
  // Fallback
  try {
    if (provider === 'openai') return await callGeminiText(text, 'gemini-2.5-flash', prompt);
    return await callOpenAIText(text, 'gpt-4o', prompt);
  } catch (fbErr: any) {
    const keys: string[] = [];
    if (primaryError.message.includes('GEMINI') || fbErr.message.includes('GEMINI')) keys.push('GOOGLE_GEMINI_API_KEY');
    if (primaryError.message.includes('OPENAI') || fbErr.message.includes('OPENAI')) keys.push('OPENAI_API_KEY');
    if (keys.length) throw new Error(`Nenhuma chave de IA configurada. Adicione ${keys.join(' e/ou ')} nos Secrets do Supabase.`);
    throw new Error(`Falha em ambos os provedores. ${primaryError.message}`);
  }
}

// ─── Resolve AI Config ─────────────────────────────────────────────────

async function resolveAIConfig(supabase: any, tenantId: string, manualProvider?: string|null, manualModel?: string|null) {
  if (manualProvider && manualModel) return { provider: manualProvider, model: manualModel };
  const { data: tenant } = await supabase.from('tenants').select('plan_type').eq('id', tenantId).single();
  if (!tenant) return { provider: 'gemini', model: 'gemini-2.5-flash' };
  const { data: limit } = await supabase.from('plan_limits').select('ai_provider, ai_model').eq('plan_type', tenant.plan_type).single();
  return { provider: limit?.ai_provider || 'gemini', model: limit?.ai_model || 'gemini-2.5-flash' };
}

function parseAIResponse(text: string): any {
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ─── HTML Text Extraction ──────────────────────────────────────────────

function extractTextFromHTML(html: string): string {
  // Remove script, style, svg, noscript tags and their content
  let text = html.replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)));
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// ─── Smart Image Extraction ────────────────────────────────────────────

/**
 * Corta o HTML antes da seção de imóveis sugeridos/relacionados/semelhantes.
 * Retorna apenas o HTML do imóvel principal.
 */
function truncateBeforeSuggestions(html: string): string {
  const markers = [
    /im[oó]veis?\s+semelhantes/i,
    /im[oó]veis?\s+similares/i,
    /im[oó]veis?\s+relacionados/i,
    /im[oó]veis?\s+sugeridos/i,
    /outros\s+im[oó]veis/i,
    /voc[eê]\s+tamb[eé]m\s+pode\s+gostar/i,
    /tamb[eé]m\s+pode\s+te\s+interessar/i,
    /mais\s+im[oó]veis/i,
    /ListCards_Title/i,
    /propertyRelated|relatedProperties|similar-properties|suggested-properties/i,
  ];

  let cutPosition = html.length;

  for (const marker of markers) {
    const match = html.match(marker);
    if (match && match.index !== undefined && match.index < cutPosition) {
      // Recuar um pouco para capturar o container pai da seção
      const lookback = Math.max(0, match.index - 200);
      const segment = html.substring(lookback, match.index);
      // Encontrar o último <div ou <section aberto antes do marcador
      const lastDivMatch = segment.match(/.*(<(?:div|section|aside)[^>]*>)/si);
      if (lastDivMatch && lastDivMatch.index !== undefined) {
        cutPosition = Math.min(cutPosition, lookback + lastDivMatch.index);
      } else {
        cutPosition = Math.min(cutPosition, match.index);
      }
    }
  }

  return html.substring(0, cutPosition);
}

/**
 * Extrai URLs de atributos lazy-load de imagens (data-lazy, data-src, data-image, etc.).
 * Estes atributos são usados por sliders/galerias e contêm TODAS as fotos do imóvel.
 */
function extractLazyImageURLs(html: string, baseUrl: string): string[] {
  const lazyAttrs = [
    /data-lazy=["']([^"']+)["']/gi,
    /data-src=["']([^"']+\.(?:jpg|jpeg|png|webp|avif)[^"']*)["']/gi,
    /data-full=["']([^"']+)["']/gi,
    /data-image=["']([^"']+)["']/gi,
    /data-zoom=["']([^"']+)["']/gi,
    /data-big=["']([^"']+)["']/gi,
    /data-original=["']([^"']+)["']/gi,
    /data-highres=["']([^"']+)["']/gi,
  ];

  const urls: string[] = [];
  for (const regex of lazyAttrs) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      urls.push(match[1]);
    }
  }

  return resolveAndDedupe(urls, baseUrl);
}

/**
 * Extrai URLs de tags <img src="..."> e background-image: url(...) do HTML principal.
 */
function extractImgSrcURLs(html: string, baseUrl: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const bgRegex = /background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/gi;
  const urls: string[] = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  while ((match = bgRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }

  return resolveAndDedupe(urls, baseUrl);
}

/**
 * Resolve URLs relativas e remove duplicatas.
 */
function resolveAndDedupe(urls: string[], baseUrl: string): string[] {
  return urls
    .map(url => {
      try {
        if (url.startsWith('data:')) return null;
        return new URL(url, baseUrl).href;
      } catch {
        return null;
      }
    })
    .filter((url): url is string => url !== null)
    .filter((url, i, arr) => arr.indexOf(url) === i);
}

/**
 * Filtra URLs que NÃO são fotos de imóveis (ícones, logos, SVGs, placeholders, etc.).
 */
function filterPropertyImages(urls: string[]): string[] {
  return urls.filter(url => {
    // Remover SVGs (são ícones do site)
    if (url.endsWith('.svg')) return false;
    // Remover ícones, logos, sprites, tracking pixels
    if (/(favicon|icon|logo|sprite|pixel|1x1|tracking|badge|avatar|banner|button|arrow|check|close|menu|search)/i.test(url)) return false;
    // Remover assets genéricos do site (CSS, JS, fonts)
    if (/\/(asset|assets|dist|static|css|js|fonts|font)\//i.test(url) && !/image/i.test(url)) return false;
    // Remover imagens muito pequenas por heurística de URL
    if (/(\d+x\d+)/.test(url)) {
      const sizeMatch = url.match(/(\d+)x(\d+)/);
      if (sizeMatch) {
        const w = parseInt(sizeMatch[1]);
        const h = parseInt(sizeMatch[2]);
        if (w < 100 || h < 100) return false;
      }
    }
    // Manter apenas URLs com extensões de imagem conhecidas ou que pareçam ser imagens de API
    const hasImageExt = /\.(jpg|jpeg|png|webp|avif|gif|bmp|tiff)/i.test(url);
    const looksLikeImageApi = /\/image\/|\/foto\/|\/photo\/|\/img\//i.test(url);
    const hasImageInUrl = /imagem|image|photo|foto|media|upload/i.test(url);
    return hasImageExt || looksLikeImageApi || hasImageInUrl;
  });
}

/**
 * Extrai URLs de imagem brutas via expressão regular global no HTML.
 * Captura URLs embutidas em blocos de <script> (JSON de estado, Kenlo/MarkoJS, etc.)
 * que não são acessíveis pelas funções de extração por tags HTML.
 */
function extractRegexImageURLs(html: string, baseUrl: string): string[] {
  const regex = /https?:\/\/[^\s"'<>()]+\.(?:jpg|jpeg|png|webp|avif|gif)(?:[^\s"'<>()]*)?/gi;
  const raw = html.match(regex) || [];
  return resolveAndDedupe(raw, baseUrl);
}

/**
 * Extração inteligente de imagens: prioriza galeria principal e exclui sugeridos.
 */
function extractImageURLs(html: string, baseUrl: string): string[] {
  // 1. Cortar HTML antes da seção de imóveis sugeridos
  const mainHtml = truncateBeforeSuggestions(html);
  console.log(`[Scrape] HTML total: ${html.length} chars | Seção principal: ${mainHtml.length} chars`);

  // 2. Extrair URLs de atributos lazy-load (sliders/galerias) do HTML COMPLETO
  // pois a galeria oculta (Lightbox) geralmente fica no final do <body>
  const lazyUrls = extractLazyImageURLs(html, baseUrl);
  console.log(`[Scrape] Lazy images: ${lazyUrls.length}`);

  // 3. Extrair URLs de <img src> da seção principal
  const imgUrls = extractImgSrcURLs(mainHtml, baseUrl);
  console.log(`[Scrape] Img src images: ${imgUrls.length}`);

  // 4. Extrair URLs via regex global no HTML COMPLETO (captura imagens em <script> JSON/JS)
  const regexUrls = extractRegexImageURLs(html, baseUrl);
  console.log(`[Scrape] Regex global images: ${regexUrls.length}`);

  // 5. Mesclar priorizando lazy, depois img src, depois regex
  const merged = [...lazyUrls];
  for (const url of imgUrls) {
    if (!merged.includes(url)) {
      merged.push(url);
    }
  }
  for (const url of regexUrls) {
    if (!merged.includes(url)) {
      merged.push(url);
    }
  }

  // 6. Filtrar ícones, logos, SVGs, placeholders
  const filtered = filterPropertyImages(merged);
  console.log(`[Scrape] Filtered property images: ${filtered.length}`);

  // 7. Se após a filtragem não encontrou nada, usar fallback global completo
  if (filtered.length === 0) {
    console.log('[Scrape] Nenhuma imagem encontrada, usando fallback global...');
    const allLazy = extractLazyImageURLs(html, baseUrl);
    const allImg = extractImgSrcURLs(html, baseUrl);
    const allRegex = extractRegexImageURLs(html, baseUrl);
    const allMerged = [...new Set([...allLazy, ...allImg, ...allRegex])];
    return filterPropertyImages(allMerged).slice(0, 150);
  }

  return filtered.slice(0, 150);
}

// ─── Main Handler ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json();
    const { url, raw_text, tenant_id, ai_provider, ai_model } = body;

    if (!tenant_id) throw new Error('tenant_id é obrigatório.');
    if (!url && !raw_text) throw new Error('Informe a URL ou o texto da página.');

    const config = await resolveAIConfig(supabase, tenant_id, ai_provider, ai_model);
    console.log(`[Scrape] Tenant: ${tenant_id} | Provider: ${config.provider} | Model: ${config.model}`);

    let pageText: string;
    let imageUrls: string[] = [];
    let sourceUrl = url || '';

    if (url) {
      // Fetch the page HTML
      console.log(`[Scrape] Fetching URL: ${url}`);
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        redirect: 'follow',
      });

      if (!pageResponse.ok) {
        throw new Error(`Não foi possível acessar a URL (${pageResponse.status}). Tente colar o texto manualmente.`);
      }

      const html = await pageResponse.text();
      
      // Extract images from HTML with smart filtering
      imageUrls = extractImageURLs(html, url);
      
      // Extract clean text
      pageText = extractTextFromHTML(html);

      if (pageText.length < 50) {
        throw new Error('A página retornou pouco conteúdo. O site pode estar bloqueando acesso automatizado. Tente colar o texto manualmente.');
      }

      // Truncate to ~50k chars to stay within AI context limits
      if (pageText.length > 50000) {
        pageText = pageText.substring(0, 50000);
      }
    } else {
      // Use raw text pasted by user
      pageText = raw_text;
      if (pageText.length < 20) {
        throw new Error('Texto muito curto. Cole mais conteúdo da página.');
      }
    }

    console.log(`[Scrape] Text length: ${pageText.length} chars | Images found: ${imageUrls.length}`);

    // Call AI to extract structured data
    const aiResult = await callAI(pageText, config.provider, config.model, PROMPT_SCRAPE);
    const data = parseAIResponse(aiResult.text);

    if (!data.properties || !Array.isArray(data.properties) || data.properties.length === 0) {
      throw new Error('A IA não conseguiu identificar nenhum imóvel na página. Tente outra URL ou cole o texto manualmente.');
    }

    // Merge extracted image URLs into properties that have no source_images
    for (const prop of data.properties) {
      if (!prop.source_images || prop.source_images.length === 0) {
        prop.source_images = imageUrls;
      }
    }

    // Log AI usage
    await supabase.from('ai_usage').insert({
      tenant_id, model: config.model, total_tokens: aiResult.tokens, feature_context: 'property-scrape-url'
    });

    return new Response(
      JSON.stringify({
        success: true,
        count: data.properties.length,
        source_url: sourceUrl,
        properties: data.properties,
        provider: config.provider,
        model: config.model
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[Scrape] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
