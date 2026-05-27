'use client'

import { useState } from 'react';
import { Sparkles, Brain, Target, TrendingUp, Loader2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { analyzeLeadProbability } from '@/app/_actions/ai-analysis';
import { matchLeadToProperties } from '@/app/_actions/ai-matching';
import { LeadTemperatureBadge } from '@/components/dashboard/leads/LeadTemperatureBadge';
import { getLeadTemperature, getTemperatureLabel, getDaysSinceInteraction } from '@/lib/utils/lead-temperature';

interface LeadAICardProps {
    leadId: string;
    tenantId: string;
    profileId: string;
    leadName: string;
    leadSource?: string;
    interactions: string[];
    hasAIAccess: boolean;
    lastInteractionAt?: string | null;
}

interface MatchResult {
    property_id: string;
    score: number;
    reason: string;
    title?: string;
}

export default function LeadAICard({ leadId, tenantId, profileId, leadName, leadSource, interactions, hasAIAccess, lastInteractionAt }: LeadAICardProps) {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [matches, setMatches] = useState<MatchResult[] | null>(null);
    const [leadSummary, setLeadSummary] = useState<string | null>(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [loadingMatching, setLoadingMatching] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showMatches, setShowMatches] = useState(true);
    const [copied, setCopied] = useState(false);

    if (!hasAIAccess) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-accent-icon/30 bg-gradient-to-br from-[#404F4F]/5 to-accent-icon/10 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-icon/20">
                    <Sparkles className="h-6 w-6 text-[#404F4F]" />
                </div>
                <div>
                    <p className="font-bold text-[#404F4F]">Análise de IA — Plano Pro</p>
                    <p className="mt-1 text-sm text-gray-500">Análise de probabilidade e matchmaking com imóveis disponíveis.</p>
                </div>
                <a href="/settings/subscription" className="rounded-lg bg-[#FFE600] px-5 py-2 text-sm font-bold text-[#404F4F] hover:bg-[#F2DB00] transition-all">
                    Conhecer Plano Pro →
                </a>
            </div>
        );
    }

    async function handleAnalysis() {
        setLoadingAnalysis(true);
        setErrorMsg(null);
        try {
            const res = await analyzeLeadProbability({
                tenant_id: tenantId,
                profile_id: profileId,
                name: leadName,
                phone: '',
                source: leadSource,
                interactions,
                lead_temperature: getTemperatureLabel(getLeadTemperature(lastInteractionAt)),
                days_since_interaction: getDaysSinceInteraction(lastInteractionAt)
            });
            if (res.success) setAnalysis(res.analysis);
        } catch (e: any) {
            setErrorMsg(e.message || 'Erro na análise.');
        } finally {
            setLoadingAnalysis(false);
        }
    }

    async function handleMatching() {
        setLoadingMatching(true);
        setErrorMsg(null);
        try {
            const res = await matchLeadToProperties(leadId, tenantId, profileId);
            if (res.success && res.data) {
                setMatches(res.data.matches);
                setLeadSummary(res.data.lead_profile_summary);
            }
        } catch (e: any) {
            setErrorMsg(e.message || 'Erro no matchmaking.');
        } finally {
            setLoadingMatching(false);
        }
    }

    function handleCopy(text: string) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="space-y-4 rounded-2xl border border-border/40 bg-card p-6">
            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-icon/20">
                    <Sparkles className="h-4 w-4 text-accent-icon" />
                </div>
                <h3 className="font-bold text-foreground">Análise de IA</h3>
                {lastInteractionAt && (
                    <LeadTemperatureBadge lastInteractionAt={lastInteractionAt} size="md" />
                )}
                <span className="ml-auto rounded-full bg-accent-icon/10 px-2 py-0.5 text-xs font-bold text-foreground">Pro</span>
            </div>

            {errorMsg && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{errorMsg}</p>
            )}

            {/* Análise de Probabilidade */}
            <div className="space-y-2">
                <button
                    onClick={handleAnalysis}
                    disabled={loadingAnalysis}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent-icon/20 bg-accent-icon/5 px-4 py-2.5 text-sm font-bold text-accent-icon transition-all hover:bg-accent-icon/10 disabled:opacity-50"
                >
                    {loadingAnalysis ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    {loadingAnalysis ? 'Analisando...' : 'Analisar Probabilidade de Fechamento'}
                </button>
 
                {analysis && (
                    <div className="relative rounded-lg bg-muted/40 border border-border/30 p-4">
                        <p className="pr-8 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{analysis}</p>
                        <button onClick={() => handleCopy(analysis)} className="absolute right-3 top-3 text-muted-foreground hover:text-accent-icon">
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                )}
            </div>

            {/* Matchmaking */}
            <div className="space-y-2">
                <button
                    onClick={handleMatching}
                    disabled={loadingMatching}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFE600] px-4 py-2.5 text-sm font-bold text-[#404F4F] transition-all hover:bg-[#F2DB00] active:scale-[0.99] disabled:opacity-50"
                >
                    {loadingMatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                    {loadingMatching ? 'Buscando imóveis compatíveis...' : 'Encontrar Imóveis Compatíveis'}
                </button>

                {leadSummary && (
                    <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 border border-blue-100 dark:border-blue-900/30">
                        <Brain className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        <p className="text-sm text-blue-700 dark:text-blue-400">{leadSummary}</p>
                    </div>
                )}

                {matches && matches.length > 0 && (
                    <div className="space-y-2">
                        <button
                            onClick={() => setShowMatches(v => !v)}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#404F4F]"
                        >
                            {showMatches ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {matches.length} imóveis compatíveis
                        </button>

                        {showMatches && matches.map((match, i) => (
                            <div key={match.property_id} className="flex items-start gap-3 rounded-lg border border-border/30 bg-muted/40 p-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-icon text-xs font-bold text-primary-foreground">
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-muted">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{ width: `${match.score}%`, backgroundColor: match.score >= 80 ? '#00B087' : match.score >= 60 ? '#FFE600' : '#6B7280' }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-foreground">{match.score}%</span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">{match.reason}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
