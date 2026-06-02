'use server'

import { runAI } from "@/lib/ai/factory";
import { createClient } from "@/lib/supabase/server";
import { requirePlanFeature } from "@/lib/utils/plan-guard";

export interface MarketProperty {
    price: number;
    area: number;
    bedrooms: number;
    title: string;
    url: string;
}

export interface MarketAnalysisResult {
    averageValue: number;
    medianValue: number;
    minPrice: number;
    maxPrice: number;
    properties: MarketProperty[];
    chartData: { bedrooms: number; averageValue: number }[];
}

export interface SearchFilters {
    uf: string;
    city: string;
    neighborhood: string;
    propertyType?: string;
    bedrooms?: string;
    priceMin?: string;
    priceMax?: string;
}

/**
 * Realiza uma análise do valor do metro quadrado baseada em dados atuais do mercado.
 * Utiliza o provedor de IA configurado para buscar/simular dados fidedignos da região.
 */
export async function analyzeMarketValue(filters: SearchFilters) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
        if (!profile) throw new Error("Perfil não encontrado");

        // Validar plano (requer recurso de IA)
        await requirePlanFeature(profile.tenant_id, 'ai');

        // Condicionais do prompt baseados nos filtros
        const typeCondition = filters.propertyType ? `O TIPO DE IMÓVEL DEVE SER ESTRITAMENTE: ${filters.propertyType}.` : '';
        const bedroomsCondition = filters.bedrooms ? `OS IMÓVEIS DEVEM TER ESTRITAMENTE ${filters.bedrooms} QUARTO(S).` : '';
        
        let priceCondition = '';
        if (filters.priceMin || filters.priceMax) {
            priceCondition = `OS PREÇOS DOS IMÓVEIS DEVEM ESTAR ENTRE `;
            if (filters.priceMin) priceCondition += `NO MÍNIMO R$ ${filters.priceMin} `;
            if (filters.priceMax) priceCondition += `E NO MÁXIMO R$ ${filters.priceMax}`;
            priceCondition += `.`;
        }

        const serperKey = process.env.SERPER_API_KEY;
        if (!serperKey) throw new Error("Chave de API do Serper não configurada no servidor.");

        // 1. Construir query de busca com localidade explícita para forçar relevância geográfica
        const locationStr = `${filters.neighborhood}, ${filters.city} - ${filters.uf}`;
        const bedroomsStr = filters.bedrooms ? `${filters.bedrooms} quartos` : '';
        const searchQuery = `${filters.neighborhood} ${filters.city} ${filters.uf} comprar ${filters.propertyType || 'imóvel'} ${bedroomsStr} venda valor m2`.trim().replace(/\s+/g, ' ');
        
        // 2. Chamar API Serper.dev com mais resultados para compensar filtros rigorosos
        const serperRes = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": serperKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: searchQuery,
                gl: "br",
                hl: "pt-br",
                num: 20
            })
        });

        if (!serperRes.ok) {
            const errorText = await serperRes.text();
            console.error("Serper API Error:", serperRes.status, errorText);
            throw new Error(`Falha ao buscar dados reais do mercado (Serper API). Status: ${serperRes.status}`);
        }
        const serperData = await serperRes.json();
        
        const searchResults = serperData.organic || [];
        if (searchResults.length === 0) {
             throw new Error("Não encontramos anúncios reais no momento para este filtro específico.");
        }

        // 3. Montar Prompt passando os dados REAIS para a IA apenas parsear
        const prompt = `Você é um analista de dados imobiliários e extração estruturada.
Recebemos os seguintes resultados brutos de busca (snippets do Google) de anúncios de imóveis.

LOCALIZAÇÃO OBRIGATÓRIA: ${locationStr}
- BAIRRO: ${filters.neighborhood}
- CIDADE: ${filters.city}
- ESTADO: ${filters.uf}

RESULTADOS REAIS ENCONTRADOS:
${JSON.stringify(searchResults.map((r: any) => ({ title: r.title, link: r.link, snippet: r.snippet })), null, 2)}

${typeCondition}
${bedroomsCondition}
${priceCondition}

REGRAS ESTRITAS (OBEDEÇA TODAS SEM EXCEÇÃO):
1. Leia o 'title' e o 'snippet' de cada resultado e extraia: Preço total, Área (m²) e Quartos.
   - Se o anúncio exibir DUAS medidas de m² (ex: área privativa e área total), use sempre o MENOR valor.
   - Se o anúncio exibir apenas UMA medida de m², use esse valor.
2. Se a string contiver "R$ 500.000", extraia o number 500000.
3. A "url" DEVE SER EXATAMENTE a string "link" fornecida no resultado. NÃO invente URLs.
4. Só inclua o imóvel se o preço for plausível e legível no texto.
5. Se o resultado não bater com os filtros estritos acima (ex: é de aluguel em vez de venda, ou valor totalmente fora da faixa estipulada), ignore-o.

⚠️ REGRA CRÍTICA DE LOCALIZAÇÃO (PRIORIDADE MÁXIMA):
6. SOMENTE inclua imóveis que estejam EXPLICITAMENTE localizados em "${filters.neighborhood}", na cidade de "${filters.city}" - ${filters.uf}.
7. Se o snippet ou title mencionar QUALQUER OUTRA CIDADE ou ESTADO diferente de "${filters.city}/${filters.uf}", IGNORE o resultado completamente. Exemplo: se o filtro é "Florianópolis/SC" e o resultado menciona "Mauá/SP", descarte-o.
8. Na dúvida sobre a localização, DESCARTE o resultado. É melhor retornar menos imóveis do que retornar imóveis de localidade errada.

⚠️ REGRA CRÍTICA DE ZERO RESULTADOS:
9. Se algum snippet ou title contiver frases como "0 imóveis", "0 Apartamentos", "Nenhum resultado", "nenhum imóvel encontrado", "sem resultados", ou indicar que NÃO existem imóveis para aquele bairro/filtro, retorne "noResults": true e "properties": [].
10. Se os resultados forem TODOS de "bairros próximos", "imóveis similares" ou regiões diferentes da solicitada, retorne "noResults": true e "properties": []. NÃO inclua imóveis de bairros vizinhos.

Retorne EXATAMENTE um objeto JSON (e nada mais) com a seguinte estrutura:
{
  "noResults": boolean, // true se não há imóveis reais para o filtro, false se há
  "properties": [
    {
      "price": number, // Preço total do imóvel
      "area": number,  // Área PRIVATIVA/ÚTIL em m² (não a área total)
      "bedrooms": number, // Número de quartos (se não tiver, use 0 ou null, mas prefira inferir do texto)
      "title": "string", // Título resumido
      "url": "string"    // LINK REAL extraído
    }
  ]
}

NÃO adicione formatações markdown (\`\`\`json) se puder evitar. Retorne apenas o JSON limpo.`;

        const result = await runAI(profile.tenant_id, prompt);
        const text = result.text;
        
        // Limpeza simples de blocos de código se houver
        const cleanJson = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanJson);

        // Verificar flag de zero resultados
        if (data.noResults === true || !data.properties || data.properties.length === 0) {
            throw new Error(`Não encontramos imóveis à venda em ${filters.neighborhood}, ${filters.city}/${filters.uf} com os filtros selecionados. Tente ajustar o tipo de imóvel ou número de quartos.`);
        }

        const properties: MarketProperty[] = data.properties;

        // Filtrar propriedades com dados válidos (area > 0, price > 0)
        const validProperties = properties.filter((p: MarketProperty) => 
            p.area > 0 && p.price > 0 && isFinite(p.price) && isFinite(p.area)
        );

        if (validProperties.length === 0) {
            throw new Error("Não foi possível extrair dados válidos de preço/área para esta região.");
        }

        // Cálculos estatísticos (apenas com propriedades válidas)
        const valuesPerM2 = validProperties
            .map((p: MarketProperty) => p.price / p.area)
            .filter((v: number) => isFinite(v) && v > 0);

        if (valuesPerM2.length === 0) {
            throw new Error("Não foi possível calcular valores de m² para esta região.");
        }

        const averageValue = valuesPerM2.reduce((a, b) => a + b, 0) / valuesPerM2.length;
        
        const sortedValues = [...valuesPerM2].sort((a, b) => a - b);
        const medianValue = sortedValues[Math.floor(sortedValues.length / 2)];
        
        const minPrice = Math.min(...valuesPerM2);
        const maxPrice = Math.max(...valuesPerM2);

        // Agrupamento para o gráfico por número de quartos
        const bedroomGroups: Record<number, number[]> = {};
        validProperties.forEach((p: MarketProperty) => {
            const val = p.price / p.area;
            if (!isFinite(val) || val <= 0) return;
            if (!bedroomGroups[p.bedrooms]) bedroomGroups[p.bedrooms] = [];
            bedroomGroups[p.bedrooms].push(val);
        });

        const chartData = Object.entries(bedroomGroups).map(([bedrooms, values]) => ({
            bedrooms: Number(bedrooms),
            averageValue: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        })).sort((a, b) => a.bedrooms - b.bedrooms);

        // Registrar uso da IA
        await supabase.from('ai_usage').insert({
            tenant_id: profile.tenant_id,
            profile_id: user.id,
            model: result.model,
            total_tokens: result.usage.total_tokens,
            feature_context: 'market_analysis'
        });

        return {
            success: true,
            data: {
                averageValue: Math.round(averageValue),
                medianValue: Math.round(medianValue),
                minPrice: Math.round(minPrice),
                maxPrice: Math.round(maxPrice),
                properties: validProperties,
                chartData
            } as MarketAnalysisResult
        };

    } catch (error: any) {
        console.error('Market Analysis Error:', error);

        let errorMessage = "Erro desconhecido ao processar análise.";
        
        if (error.message?.includes('429') || error.message?.includes('usage limit') || error.message?.includes('quota')) {
            errorMessage = "Limite de uso da IA atingido. Por favor, aguarde alguns minutos.";
        } else if (error.message?.includes('503') || error.message?.includes('overloaded')) {
            errorMessage = "O serviço de IA está temporariamente sobrecarregado. Tente novamente em alguns instantes.";
        } else if (error.message) {
            errorMessage = error.message;
        }

        return { 
            success: false, 
            error: errorMessage
        };
    }
}
