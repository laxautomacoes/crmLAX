'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Copy, Send, Layout, MessageSquare, BookOpen, Check } from 'lucide-react';
import { generateGeneralCopy } from '@/app/_actions/ai-copy';
import { toast } from 'sonner';

interface MarketingStudioProps {
    tenantId: string;
    profileId: string;
    variant?: 'default' | 'minimal';
}

export function MarketingStudio({ tenantId, profileId, variant = 'default' }: MarketingStudioProps) {
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'medium' | 'short' | 'full'>('medium');
    const [copied, setCopied] = useState(false);

    const isMinimal = variant === 'minimal';

    const handleGenerate = async () => {
        if (!topic.trim()) {
            toast.error('O que você quer postar? Digite um assunto acima.');
            return;
        }

        setLoading(true);
        try {
            const result = await generateGeneralCopy(topic, tenantId, profileId);
            if (result.success) {
                setResults(result.data);
                toast.success('Conteúdo gerado com sucesso!');
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao gerar conteúdo');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 2000);
    };

    if (isMinimal) {
        return (
            <div className="max-w-4xl mx-auto space-y-10 py-10 animate-in fade-in duration-700">
                {/* Cabeçalho Minimalista */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFE600]/10 text-[#404F4F] text-[10px] font-black uppercase tracking-widest border border-[#FFE600]/20">
                        <Sparkles size={12} className="text-[#FFE600]" />
                        IA Creative Assistant
                    </div>
                    <h2 className="text-3xl font-black text-[#404F4F] tracking-tight">O que vamos criar hoje?</h2>
                </div>

                {/* Área de Input Centralizada */}
                <div className="relative group">
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Descreva o assunto do post..."
                        className="w-full min-h-[140px] p-8 rounded-[2rem] bg-white border border-border/50 text-xl font-medium focus:ring-2 focus:ring-[#FFE600]/30 outline-none resize-none transition-all shadow-sm hover:shadow-md placeholder:text-gray-300"
                    />
                    
                    <div className="absolute right-4 bottom-4 flex gap-2">
                         {topic && (
                            <button 
                                onClick={() => setTopic('')}
                                className="px-4 py-2 text-[10px] font-black text-red-500/70 hover:text-red-600 transition-colors uppercase tracking-widest"
                            >
                                Limpar
                            </button>
                        )}
                        <button
                            onClick={handleGenerate}
                            disabled={loading || !topic.trim()}
                            className="h-12 px-8 bg-[#404F4F] hover:bg-[#2d3939] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg active:scale-95 disabled:opacity-30"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-[#FFE600]" />}
                            Gerar
                        </button>
                    </div>
                </div>

                {/* Resultados Minimalistas */}
                {results && (
                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-center gap-2">
                            {[
                                { id: 'medium', label: 'Social Feed' },
                                { id: 'short', label: 'Direct/WhatsApp' },
                                { id: 'full', label: 'Long Copy' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                                        activeTab === tab.id
                                            ? 'bg-[#404F4F] text-white border-[#404F4F]'
                                            : 'bg-white text-[#404F4F]/40 border-border/50 hover:bg-gray-50'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-border/50 relative group">
                            <p className="text-lg text-[#404F4F] leading-loose whitespace-pre-wrap font-medium text-center italic">
                                "{results[activeTab]}"
                            </p>
                            
                            <div className="mt-8 flex justify-center gap-4 pt-8 border-t border-border/20">
                                <button
                                    onClick={() => handleCopy(results[activeTab])}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-[#404F4F] font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                    Copiar
                                </button>
                                <button
                                    onClick={() => toast.info('Funcionalidade de postagem direta em breve.')}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FFE600] hover:bg-[#F2DB00] text-[#404F4F] font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95"
                                >
                                    <Send size={14} />
                                    Postar Agora
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 ml-1">
                <Sparkles className="h-5 w-5 text-[#FFE600]" />
                <h2 className="text-xl font-black text-[#404F4F]">Estúdio de Criação IA</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[460px]">
                {/* Lado Esquerdo: Input */}
                <div className="bg-white rounded-[2rem] border border-border/50 shadow-sm p-8 flex flex-col space-y-6 transition-all hover:shadow-md">
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-[#404F4F]/60 uppercase tracking-[0.2em]">O que vamos postar hoje?</label>
                            {topic && (
                                <button 
                                    onClick={() => setTopic('')}
                                    className="text-[10px] font-bold text-red-500/70 hover:text-red-600 transition-colors uppercase tracking-widest"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Ex: Frase motivacional sobre conquista do primeiro property, ou um post sobre as vantagens de morar perto da praia..."
                            className="w-full h-80 p-6 rounded-2xl bg-gray-50/50 border border-border/50 text-base focus:ring-2 focus:ring-[#FFE600]/30 outline-none resize-none transition-all placeholder:text-gray-400 font-medium leading-relaxed"
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading || !topic.trim()}
                        className="w-full h-14 bg-[#404F4F] hover:bg-[#2d3939] text-white rounded-2xl font-black text-sm uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5 text-[#FFE600]" />
                                Gerar com Inteligência Artificial
                            </>
                        )}
                    </button>
                </div>

                {/* Lado Direito: Resultados/Preview */}
                <div className="bg-gradient-to-br from-[#404F4F] to-[#2d3939] rounded-[2rem] shadow-xl overflow-hidden flex flex-col relative group">
                    <div className="p-8 pb-4 border-b border-white/10">
                        <div className="flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar no-scrollbar">
                            <div className="flex gap-2">
                                {[
                                    { id: 'medium', label: 'Feed Social', icon: Layout },
                                    { id: 'short', label: 'WhatsApp', icon: MessageSquare },
                                    { id: 'full', label: 'Detalhado', icon: BookOpen }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2.3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-[#FFE600] text-[#404F4F] shadow-lg shadow-black/20'
                                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <tab.icon size={14} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-8 relative overflow-y-auto custom-scrollbar">
                        {!results ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                                <div className="p-6 rounded-full border-2 border-dashed border-white/20">
                                    <Sparkles className="h-10 w-10 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-white font-bold">Aguardando seu tópico...</p>
                                    <p className="text-white/60 text-xs">O resultado aparecerá aqui em segundos.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 relative group/card">
                                    <p className="text-white text-base leading-relaxed whitespace-pre-wrap font-medium">
                                        {results[activeTab]}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {results && (
                        <div className="p-6 bg-black/20 backdrop-blur-md border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => handleCopy(results[activeTab])}
                                className="h-12 flex items-center justify-center gap-2 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest transition-all"
                            >
                                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                Copiar Texto
                            </button>
                            <button
                                onClick={() => {/* Futura integração direta com redes */}}
                                className="h-12 flex items-center justify-center gap-2 px-6 rounded-xl bg-[#FFE600] hover:bg-[#F2DB00] text-[#404F4F] font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-[0.95]"
                            >
                                <Send size={16} />
                                Postar Agora
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
