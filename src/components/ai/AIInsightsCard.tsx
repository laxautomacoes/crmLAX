'use client'

import { useState } from 'react';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb, CheckCircle, RefreshCw } from 'lucide-react';
import { generateAIReportInsights } from '@/app/_actions/ai-reports';

interface AIInsightsCardProps {
    tenantId: string;
    profileId: string;
    period: string;
    hasAIAccess: boolean;
}

interface Insights {
    executive_summary: string;
    highlights: string[];
    alerts: string[];
    opportunities: string[];
    recommendation: string;
}

export default function AIInsightsCard({ tenantId, profileId, period, hasAIAccess }: AIInsightsCardProps) {
    const [insights, setInsights] = useState<Insights | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!hasAIAccess) {
        return (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#FFE600]/30 bg-gradient-to-r from-[#404F4F]/5 to-[#FFE600]/10 p-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE600]/20">
                        <Sparkles className="h-5 w-5 text-[#404F4F]" />
                    </div>
                    <div>
                        <p className="font-bold text-[#404F4F]">Insights de IA disponíveis no Plano Pro</p>
                        <p className="text-sm text-gray-500">Análise inteligente dos seus dados de crescimento e conversão.</p>
                    </div>
                </div>
                <a href="/settings/subscription" className="shrink-0 rounded-lg bg-[#FFE600] px-4 py-2 text-sm font-bold text-[#404F4F] hover:bg-[#F2DB00] transition-all">
                    Ver Planos →
                </a>
            </div>
        );
    }

    async function handleGenerate() {
        setLoading(true);
        setError(null);
        try {
            const res = await generateAIReportInsights(tenantId, profileId, period);
            if (res.success && res.data) setInsights(res.data);
            else setError(res.error || 'Erro ao gerar insights.');
        } catch (e: any) {
            setError(e.message || 'Erro ao gerar insights.');
        } finally {
            setLoading(false);
        }
    }

    if (!insights) {
        return (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE600]/20">
                        <Sparkles className="h-5 w-5 text-[#404F4F]" />
                    </div>
                    <div>
                        <p className="font-bold text-[#404F4F]">Insights de IA</p>
                        <p className="text-sm text-gray-500">Análise inteligente do período selecionado via Gemini.</p>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-[#FFE600] px-4 py-2 text-sm font-bold text-[#404F4F] transition-all hover:bg-[#F2DB00] active:scale-[0.99] disabled:opacity-60"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {loading ? 'Analisando dados...' : 'Gerar Análise Inteligente'}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFE600]/20">
                        <Sparkles className="h-4 w-4 text-[#404F4F]" />
                    </div>
                    <h3 className="font-bold text-[#404F4F]">Insights de IA</h3>
                    <span className="rounded-full bg-[#FFE600]/20 px-2 py-0.5 text-xs font-bold text-[#404F4F]">Pro</span>
                </div>
                <button onClick={handleGenerate} disabled={loading} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#404F4F] disabled:opacity-50">
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>

            {/* Resumo Executivo */}
            <div className="rounded-xl bg-[#404F4F]/5 p-4">
                <p className="text-sm text-gray-700 leading-relaxed">{insights.executive_summary}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Destaques */}
                {insights.highlights.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" /> Destaques
                        </div>
                        {insights.highlights.map((h, i) => (
                            <p key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                                {h}
                            </p>
                        ))}
                    </div>
                )}

                {/* Alertas */}
                {insights.alerts.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-orange-500">
                            <AlertTriangle className="h-3.5 w-3.5" /> Pontos de Atenção
                        </div>
                        {insights.alerts.map((a, i) => (
                            <p key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                                {a}
                            </p>
                        ))}
                    </div>
                )}

                {/* Oportunidades */}
                {insights.opportunities.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-500">
                            <TrendingUp className="h-3.5 w-3.5" /> Oportunidades
                        </div>
                        {insights.opportunities.map((o, i) => (
                            <p key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                                {o}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Recomendação Principal */}
            <div className="flex items-start gap-3 rounded-xl border border-[#FFE600]/30 bg-[#FFE600]/10 p-4">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#404F4F]" />
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#404F4F]">Recomendação Estratégica</p>
                    <p className="mt-1 text-sm text-gray-700">{insights.recommendation}</p>
                </div>
            </div>
        </div>
    );
}
