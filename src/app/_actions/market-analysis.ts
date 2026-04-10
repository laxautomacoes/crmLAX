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

/**
 * Realiza uma análise do valor do metro quadrado baseada em dados atuais do mercado.
 * Utiliza o provedor de IA configurado para buscar/simular dados fidedignos da região.
 */
export async function analyzeMarketValue(uf: string, city: string, neighborhood: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
        if (!profile) throw new Error("Perfil não encontrado");

        // Validar plano (requer recurso de IA)
        await requirePlanFeature(profile.tenant_id, 'ai');

        // Prompt otimizado para extração de dados reais
        const prompt = `Você é um analista sênior do mercado imobiliário brasileiro, com acesso em tempo real a dados de portais como ZapImóveis, VivaReal, Imovelweb e OLX.
        
Seu objetivo é extrair uma lista de pelo menos 10 exemplos de imóveis residenciais à venda no bairro ${neighborhood}, em ${city} - ${uf}.

Tente ser o mais fiel possível aos preços praticados HOJE nesse bairro específico. 
Se for um bairro nobre (ex: Itaim Bibi, Savassi, Leblon), os preços devem refletir o alto padrão.
Se for um bairro popular, devem refletir a realidade local.

Retorne EXATAMENTE um objeto JSON (e nada mais) com a seguinte estrutura:
{
  "properties": [
    {
      "price": number, // Preço total do imóvel
      "area": number,  // Área em m²
      "bedrooms": number, // Número de quartos
      "title": "string", // Título resumido (ex: 'Apto 3 qtos Próximo ao Metro')
      "url": "string"    // Link simulado ou real para a fonte (ex: zapimoveis.com.br/...)
    }
  ]
}

Não adicione textos explicativos antes ou depois do JSON.`;

        const result = await runAI(profile.tenant_id, prompt);
        const text = result.text;
        
        // Limpeza simples de blocos de código se houver
        const cleanJson = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanJson);
        const properties: MarketProperty[] = data.properties;

        if (!properties || properties.length === 0) {
            throw new Error("Não foi possível encontrar dados para esta região no momento.");
        }

        // Cálculos estatísticos
        const valuesPerM2 = properties.map((p: MarketProperty) => p.price / p.area);
        const averageValue = valuesPerM2.reduce((a, b) => a + b, 0) / valuesPerM2.length;
        
        const sortedValues = [...valuesPerM2].sort((a, b) => a - b);
        const medianValue = sortedValues[Math.floor(sortedValues.length / 2)];
        
        const minPrice = Math.min(...valuesPerM2);
        const maxPrice = Math.max(...valuesPerM2);

        // Agrupamento para o gráfico por número de quartos
        const bedroomGroups: Record<number, number[]> = {};
        properties.forEach((p: MarketProperty) => {
            if (!bedroomGroups[p.bedrooms]) bedroomGroups[p.bedrooms] = [];
            bedroomGroups[p.bedrooms].push(p.price / p.area);
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
                properties,
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
