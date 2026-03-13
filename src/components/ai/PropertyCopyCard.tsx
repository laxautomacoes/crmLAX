'use client'

import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, MessageSquare, Instagram, Globe } from 'lucide-react';
import { generatePropertyCopy } from '@/app/_actions/ai-copy';

interface PropertyCopyCardProps {
    assetId: string;
    tenantId: string;
    profileId: string;
    hasAIAccess: boolean;
}

interface CopyVariants {
    short: string;
    medium: string;
    full: string;
}

const tabs = [
    { key: 'short', label: 'WhatsApp', icon: MessageSquare },
    { key: 'medium', label: 'Redes Sociais', icon: Instagram },
    { key: 'full', label: 'Portal', icon: Globe },
] as const;

export default function PropertyCopyCard({ assetId, tenantId, profileId, hasAIAccess }: PropertyCopyCardProps) {
    const [copy, setCopy] = useState<CopyVariants | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<keyof CopyVariants>('short');
    const [copied, setCopied] = useState(false);

    if (!hasAIAccess) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#FFE600]/30 bg-gradient-to-br from-[#404F4F]/5 to-[#FFE600]/10 p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE600]/20">
                    <Sparkles className="h-5 w-5 text-[#404F4F]" />
                </div>
                <div>
                    <p className="font-bold text-[#404F4F]">Gerar Copy de Anúncio — Pro</p>
                    <p className="mt-1 text-sm text-gray-500">Textos prontos para WhatsApp, redes sociais e portais.</p>
                </div>
                <a href="/settings/subscription" className="rounded-lg bg-[#FFE600] px-4 py-2 text-sm font-bold text-[#404F4F] hover:bg-[#F2DB00] transition-all">
                    Ver Planos →
                </a>
            </div>
        );
    }

    async function handleGenerate() {
        setLoading(true);
        setError(null);
        try {
            const res = await generatePropertyCopy(assetId, tenantId, profileId);
            if (res.success && res.data) setCopy(res.data);
            else setError(res.error || 'Erro ao gerar copy.');
        } catch (e: any) {
            setError(e.message || 'Erro ao gerar copy.');
        } finally {
            setLoading(false);
        }
    }

    function handleCopy() {
        if (!copy) return;
        navigator.clipboard.writeText(copy[activeTab]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFE600]/20">
                    <Sparkles className="h-4 w-4 text-[#404F4F]" />
                </div>
                <h3 className="font-bold text-[#404F4F]">Gerar Copy de Anúncio</h3>
                <span className="ml-auto rounded-full bg-[#FFE600]/20 px-2 py-0.5 text-xs font-bold text-[#404F4F]">Pro</span>
            </div>

            {!copy ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-500">Gere automaticamente textos de anúncio prontos para WhatsApp, Instagram e portais imobiliários.</p>
                    {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFE600] py-2.5 text-sm font-bold text-[#404F4F] transition-all hover:bg-[#F2DB00] active:scale-[0.99] disabled:opacity-60"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {loading ? 'Gerando textos...' : 'Gerar Copies com IA'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3 animate-in fade-in duration-300">
                    {/* Tabs */}
                    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                        {tabs.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-all ${activeTab === key ? 'bg-white text-[#404F4F] shadow-sm' : 'text-gray-500 hover:text-[#404F4F]'}`}
                            >
                                <Icon className="h-3 w-3" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Texto */}
                    <div className="relative rounded-lg bg-gray-50 p-4">
                        <p className="pr-8 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{copy[activeTab]}</p>
                        <button onClick={handleCopy} className="absolute right-3 top-3 text-gray-400 hover:text-[#404F4F]">
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-500 hover:border-[#404F4F]/20 hover:text-[#404F4F] transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Gerar novamente
                    </button>
                </div>
            )}
        </div>
    );
}
