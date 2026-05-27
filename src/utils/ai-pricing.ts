// Tabela de preços por modelo (USD por 1M tokens — tier Standard/Paid)
// Fonte OpenAI: developers.openai.com/api/docs/pricing
// Fonte Gemini: ai.google.dev/pricing
// Atualizado em: 2026-05-26
export const AI_PRICING: Record<string, { inputPer1M: number; outputPer1M: number; label: string }> = {
    // === OpenAI ===
    'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00, label: 'GPT-4o' },
    'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60, label: 'GPT-4o Mini' },
    'gpt-5.5': { inputPer1M: 5.00, outputPer1M: 30.00, label: 'GPT-5.5' },
    'gpt-5.4': { inputPer1M: 2.50, outputPer1M: 15.00, label: 'GPT-5.4' },
    'gpt-5.4-mini': { inputPer1M: 0.75, outputPer1M: 4.50, label: 'GPT-5.4 Mini' },
    // === Google Gemini ===
    'gemini-3.5-flash': { inputPer1M: 1.50, outputPer1M: 9.00, label: 'Gemini 3.5 Flash' },
    'gemini-3.1-pro': { inputPer1M: 2.00, outputPer1M: 12.00, label: 'Gemini 3.1 Pro' },
    'gemini-3.1-pro-preview': { inputPer1M: 2.00, outputPer1M: 12.00, label: 'Gemini 3.1 Pro Preview' },
    'gemini-3.1-flash-lite': { inputPer1M: 0.25, outputPer1M: 1.50, label: 'Gemini 3.1 Flash-Lite' },
    'gemini-3-flash': { inputPer1M: 0.50, outputPer1M: 3.00, label: 'Gemini 3 Flash' },
    'gemini-3-flash-preview': { inputPer1M: 0.50, outputPer1M: 3.00, label: 'Gemini 3 Flash Preview' },
    'gemini-2.5-pro': { inputPer1M: 1.25, outputPer1M: 10.00, label: 'Gemini 2.5 Pro' },
    'gemini-2.5-flash': { inputPer1M: 0.30, outputPer1M: 2.50, label: 'Gemini 2.5 Flash' },
    'gemini-2.5-flash-lite': { inputPer1M: 0.10, outputPer1M: 0.40, label: 'Gemini 2.5 Flash-Lite' },
};

// ─── Cotação USD → BRL (dinâmica com cache) ──────────────────────────────

const FALLBACK_RATE = 5.80;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

let _cachedRate: number = FALLBACK_RATE;
let _cacheTimestamp: number = 0;

/** Retorna a cotação cacheada (síncrona). */
export function getUsdToBrl(): number {
    return _cachedRate;
}

/**
 * Busca a cotação USD/BRL em tempo real via AwesomeAPI (Banco Central).
 * Usa cache de 1h para evitar requisições excessivas.
 * Fallback para R$ 5,80 em caso de erro.
 */
export async function refreshExchangeRate(): Promise<number> {
    // Se cache ainda é válido, retorna direto
    if (Date.now() - _cacheTimestamp < CACHE_TTL_MS && _cachedRate !== FALLBACK_RATE) {
        return _cachedRate;
    }

    try {
        const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL', {
            next: { revalidate: 3600 }, // Cache do Next.js de 1h
        });

        if (!res.ok) throw new Error(`API retornou ${res.status}`);

        const data = await res.json();
        const bid = parseFloat(data?.USDBRL?.bid);

        if (isNaN(bid) || bid <= 0) throw new Error('Cotação inválida');

        _cachedRate = bid;
        _cacheTimestamp = Date.now();
        return bid;
    } catch (err) {
        console.warn('[ai-pricing] Erro ao buscar cotação USD/BRL, usando fallback:', err);
        // Se já tinha uma cotação válida anterior, mantém ela
        if (_cachedRate !== FALLBACK_RATE) return _cachedRate;
        return FALLBACK_RATE;
    }
}

/** @deprecated Use getUsdToBrl() — mantido para compatibilidade */
export const USD_TO_BRL = FALLBACK_RATE;

// ─── Cálculo de custo ────────────────────────────────────────────────────

/**
 * Calcula o custo estimado em R$ para uma operação de IA.
 * Usa a cotação cacheada (chame refreshExchangeRate() antes para atualizar).
 * Sem input/output separados, usa a média (60% input / 40% output).
 */
export function calculateCostBRL(model: string, totalTokens: number): number {
    const rate = getUsdToBrl();
    const pricing = AI_PRICING[model];
    if (!pricing) {
        // Fallback: preço médio genérico
        return (totalTokens / 1_000_000) * 1.00 * rate;
    }
    // Estimativa: 60% input, 40% output (padrão de uso comum)
    const inputTokens = totalTokens * 0.6;
    const outputTokens = totalTokens * 0.4;
    const costUSD = (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M;
    return costUSD * rate;
}

/**
 * Formata custo em Reais.
 */
export function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

