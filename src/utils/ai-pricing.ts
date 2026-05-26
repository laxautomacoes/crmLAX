// Tabela de preços por modelo (USD por 1M tokens — média input/output)
// Cotação fixa: R$ 5,80
export const AI_PRICING: Record<string, { inputPer1M: number; outputPer1M: number; label: string }> = {
    'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00, label: 'GPT-4o' },
    'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60, label: 'GPT-4o Mini' },
    'gpt-5.4': { inputPer1M: 5.00, outputPer1M: 15.00, label: 'GPT-5.4' },
    'gpt-5.4-mini': { inputPer1M: 0.30, outputPer1M: 1.20, label: 'GPT-5.4 Mini' },
    'gemini-2.0-flash': { inputPer1M: 0.10, outputPer1M: 0.40, label: 'Gemini 2.0 Flash' },
    'gemini-3-flash': { inputPer1M: 0.075, outputPer1M: 0.30, label: 'Gemini 3 Flash' },
    'gemini-3.1-pro': { inputPer1M: 1.25, outputPer1M: 5.00, label: 'Gemini 3.1 Pro' },
    'gemini-3.1-pro-preview': { inputPer1M: 1.25, outputPer1M: 5.00, label: 'Gemini 3.1 Pro Preview' },
    'gemini-3.1-flash-lite': { inputPer1M: 0.02, outputPer1M: 0.10, label: 'Gemini 3.1 Flash-Lite' },
    'gemini-2.5-pro': { inputPer1M: 1.25, outputPer1M: 10.00, label: 'Gemini 2.5 Pro' },
};

export const USD_TO_BRL = 5.80;

/**
 * Calcula o custo estimado em R$ para uma operação de IA.
 * Sem input/output separados, usa a média (60% input / 40% output).
 */
export function calculateCostBRL(model: string, totalTokens: number): number {
    const pricing = AI_PRICING[model];
    if (!pricing) {
        // Fallback: preço médio genérico
        return (totalTokens / 1_000_000) * 1.00 * USD_TO_BRL;
    }
    // Estimativa: 60% input, 40% output (padrão de uso comum)
    const inputTokens = totalTokens * 0.6;
    const outputTokens = totalTokens * 0.4;
    const costUSD = (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M;
    return costUSD * USD_TO_BRL;
}

/**
 * Formata custo em Reais.
 */
export function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
