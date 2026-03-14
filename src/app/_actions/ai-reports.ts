'use server'

import { getAIModel } from '@/lib/ai/gemini';
import { createClient } from '@/lib/supabase/server';
import { requirePlanFeature } from '@/lib/utils/plan-guard';
import { getReportMetrics } from './reports';

interface AIReportInsights {
    executive_summary: string;
    highlights: string[];
    alerts: string[];
    opportunities: string[];
    recommendation: string;
}

/**
 * Gera análise inteligente dos relatórios do tenant via Gemini.
 * Lê os dados existentes de reports.ts e retorna insights em linguagem natural.
 * Requer plano Pro.
 */
export async function generateAIReportInsights(
    tenantId: string,
    profileId: string,
    period: string = '30_days'
): Promise<{ success: boolean; data?: AIReportInsights; error?: string }> {
    await requirePlanFeature(tenantId, 'ai');

    // 1. Buscar métricas existentes
    const metricsResult = await getReportMetrics(tenantId, period);
    if (!metricsResult.success || !metricsResult.data) {
        return { success: false, error: 'Não foi possível obter os dados dos relatórios.' };
    }

    const m = metricsResult.data;
    const supabase = await createClient();

    // 2. Buscar dados adicionais: total de imóveis e clientes convertidos
    const [{ count: totalAssets }, { count: totalClients }] = await Promise.all([
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)
    ]);

    // 3. Serializar dados para o prompt
    const topBroker = m.teamPerformance[0];
    const topProperty = m.topProperties[0];
    const topSource = m.leadsBySource[0];

    const dataContext = `
MÉTRICAS DO PERÍODO (${period.replace('_', ' ')}):
- Total de leads: ${m.kpis.totalLeads}
- Leads ativos: ${m.kpis.activeLeads}
- Conversões (vendas/aluguéis): ${m.kpis.conversions}
- Taxa de conversão: ${m.kpis.conversionRate}
- Total de imóveis cadastrados: ${totalAssets || 0}
- Total de clientes/contatos: ${totalClients || 0}

CANAL DE ORIGEM DOS LEADS:
${m.leadsBySource.map(s => `- ${s.name}: ${s.value} leads`).join('\n')}

TOP CORRETOR: ${topBroker ? `${topBroker.name} — ${topBroker.leadsCount} leads, ${topBroker.conversionCount} fechamentos` : 'Nenhum'}
TOP IMÓVEL: ${topProperty ? `${topProperty.title} — ${topProperty.leadsCount} leads, ${topProperty.conversionCount} conversões` : 'Nenhum'}
CANAL PRINCIPAL: ${topSource ? `${topSource.name} com ${topSource.value} leads` : 'Nenhum'}

EVOLUÇÃO DIÁRIA DE LEADS (últimos pontos):
${m.leadsEvolution.slice(-7).map(e => `${e.date}: ${e.count}`).join(' | ')}`;

    const prompt = `Você é um analista de negócios especialista em mercado imobiliário brasileiro.
Analise os dados abaixo de uma imobiliária e gere insights executivos em português.

${dataContext}

Retorne APENAS um JSON válido com este formato exato, sem markdown:
{
  "executive_summary": "Resumo executivo de 3-4 frases sobre o desempenho geral do período",
  "highlights": ["Ponto positivo 1", "Ponto positivo 2", "Ponto positivo 3"],
  "alerts": ["Ponto de atenção 1", "Ponto de atenção 2"],
  "opportunities": ["Oportunidade 1", "Oportunidade 2"],
  "recommendation": "Uma recomendação estratégica principal para os próximos 30 dias"
}`;

    try {
        const model = getAIModel();
        const result = await model.generateContent(prompt);
        const rawText = result.response.text().trim();

        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        const jsonStr = rawText.substring(jsonStart, jsonEnd + 1);
        const parsed: AIReportInsights = JSON.parse(jsonStr);

        await supabase.from('ai_usage').insert({
            tenant_id: tenantId,
            profile_id: profileId,
            model: 'gemini-2.0-flash',
            total_tokens: result.response.usageMetadata?.totalTokenCount || 0,
            feature_context: 'report_analysis'
        });

        return { success: true, data: parsed };
    } catch (error: any) {
        console.error('AI Report Insights Error (Gemini):', error.message);
        throw new Error('Falha ao gerar análise inteligente dos relatórios.');
    }
}
