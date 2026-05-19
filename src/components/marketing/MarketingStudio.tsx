'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Copy, Send, Layout, MessageSquare, BookOpen, Check, Image as ImageIcon, Instagram, Facebook, ChevronDown } from 'lucide-react';
import { generateGeneralCopy, generatePropertyCopy } from '@/app/_actions/ai-copy';
import { publishSocialPost } from '@/app/_actions/social';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface MarketingStudioProps {
    tenantId: string;
    profileId: string;
    variant?: 'default' | 'minimal';
}

export function MarketingStudio({ tenantId, profileId, variant = 'default' }: MarketingStudioProps) {
    const [mode, setMode] = useState<'livre' | 'imovel'>('livre');
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'medium' | 'short' | 'full'>('medium');
    const [copied, setCopied] = useState(false);

    // Estados para Imóveis
    const [properties, setProperties] = useState<any[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [propertyMedia, setPropertyMedia] = useState<string[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
    const [networks, setNetworks] = useState({ instagram: true, facebook: true });
    const [publishing, setPublishing] = useState(false);

    const supabase = createClient();
    const isMinimal = variant === 'minimal';

    useEffect(() => {
        async function loadProperties() {
            const { data, error } = await supabase
                .from('properties')
                .select('id, title, images')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Erro ao buscar imóveis:', error);
            }
            if (data) setProperties(data);
        }
        loadProperties();
    }, [tenantId, supabase]);

    useEffect(() => {
        if (selectedPropertyId) {
            const prop = properties.find(p => p.id === selectedPropertyId);
            if (prop && prop.images && Array.isArray(prop.images)) {
                const urls = prop.images.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean);
                setPropertyMedia(urls);
                setSelectedMedia([]);
                setResults(null);
            } else {
                setPropertyMedia([]);
                setSelectedMedia([]);
            }
        }
    }, [selectedPropertyId, properties]);

    const handleGenerate = async () => {
        if (mode === 'livre' && !topic.trim()) {
            toast.error('O que você quer postar? Digite um assunto acima.');
            return;
        }
        if (mode === 'imovel' && !selectedPropertyId) {
            toast.error('Selecione um imóvel primeiro.');
            return;
        }

        setLoading(true);
        try {
            if (mode === 'livre') {
                const result = await generateGeneralCopy(topic, tenantId, profileId);
                if (result.success) setResults(result.data);
            } else {
                const result = await generatePropertyCopy(selectedPropertyId, tenantId, profileId);
                if (result.success) setResults(result.data);
            }
            toast.success('Conteúdo gerado com sucesso!');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao gerar conteúdo');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!results || !results[activeTab]) {
            toast.error('Gere ou digite um conteúdo antes de publicar.');
            return;
        }
        if (mode === 'imovel' && selectedMedia.length === 0) {
            toast.error('Selecione pelo menos uma imagem do imóvel para publicar.');
            return;
        }
        if (!networks.instagram && !networks.facebook) {
            toast.error('Selecione pelo menos uma rede social para publicar.');
            return;
        }

        setPublishing(true);
        try {
            const res = await publishSocialPost({
                tenantId,
                mediaUrls: mode === 'imovel' ? selectedMedia : [],
                caption: results[activeTab],
                networks
            });

            if (res.success) {
                toast.success('Post publicado com sucesso!');
                if (res.results?.errors?.length) {
                    toast.warning('Publicado com alguns alertas: ' + res.results.errors.join(', '));
                }
            } else {
                toast.error(`Erro: ${res.error}`);
                if (res.details?.length) {
                    res.details.forEach((err: string) => toast.error(err));
                }
            }
        } catch (error: any) {
            toast.error(error.message || 'Falha ao publicar');
        } finally {
            setPublishing(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleMediaSelection = (url: string) => {
        setSelectedMedia(prev => {
            if (prev.includes(url)) {
                return prev.filter(u => u !== url);
            } else {
                if (prev.length >= 10) {
                    toast.error('Limite máximo de 10 mídias por post (Carrossel).');
                    return prev;
                }
                return [...prev, url];
            }
        });
    };

    return (
        <section className="space-y-6">
            {/* Toggle de Modo */}
            <div className="flex gap-2 p-1 bg-card border border-border/40 rounded-xl w-fit mb-6">
                <button
                    onClick={() => setMode('livre')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        mode === 'livre' 
                        ? 'bg-secondary text-secondary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:bg-foreground/5'
                    }`}
                >
                    Post Livre
                </button>
                <button
                    onClick={() => setMode('imovel')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        mode === 'imovel' 
                        ? 'bg-secondary text-secondary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:bg-foreground/5'
                    }`}
                >
                    Post de Imóvel
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full min-h-[500px]">
                {/* Lado Esquerdo: Input / Seleção */}
                <div className="bg-card rounded-[2rem] border border-border/50 shadow-sm p-8 flex flex-col space-y-6 transition-all hover:shadow-md h-full">
                    
                    {mode === 'livre' ? (
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">O que vamos postar hoje?</label>
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
                                placeholder="Ex: Frase motivacional sobre conquista do primeiro imóvel, ou um post sobre as vantagens de morar perto da praia..."
                                className="w-full h-80 p-6 rounded-2xl bg-foreground/5 border border-border/50 text-base text-foreground focus:ring-2 focus:ring-ring/30 outline-none resize-none transition-all placeholder:text-muted-foreground/50 font-medium leading-relaxed"
                            />
                        </div>
                    ) : (
                        <div className="space-y-6 flex-1 flex flex-col">
                            <div className="space-y-2 relative">
                                <select 
                                    className="appearance-none w-full h-12 px-4 pr-10 rounded-xl bg-foreground/5 border border-border/50 text-sm text-foreground focus:ring-2 focus:ring-ring/30 outline-none"
                                    value={selectedPropertyId}
                                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                                >
                                    <option value="">Selecione um imóvel</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                                <ChevronDown 
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" 
                                    size={16} 
                                />
                            </div>

                            {propertyMedia.length > 0 && (
                                <div className="space-y-3 flex-1 flex flex-col min-h-0">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                            Fotos / Vídeos ({selectedMedia.length}/10)
                                        </label>
                                        <span className="text-[10px] text-muted-foreground">Selecione para Feed ou Carrossel</span>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                                        {propertyMedia.map((url, idx) => {
                                            const isSelected = selectedMedia.includes(url);
                                            return (
                                                <div 
                                                    key={idx}
                                                    onClick={() => toggleMediaSelection(url)}
                                                    className={`relative pb-[100%] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-primary scale-95' : 'border-transparent hover:scale-95 hover:opacity-80'}`}
                                                >
                                                    <img 
                                                        src={url} 
                                                        alt={`Media ${idx}`}
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                    />
                                                    {isSelected && (
                                                        <div className="absolute top-1 right-1 bg-secondary rounded-full p-1 shadow-md">
                                                            <Check size={12} className="text-secondary-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                        <div className="space-y-4 mt-auto pt-6 border-t border-border/50">
                            {mode === 'imovel' && (
                                <div className="flex items-center justify-center gap-6 py-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={networks.instagram}
                                            onChange={(e) => setNetworks({...networks, instagram: e.target.checked})}
                                            className="w-4 h-4 rounded border-border bg-foreground/5 text-pink-500 focus:ring-pink-500"
                                        />
                                        <Instagram size={18} className="text-muted-foreground group-hover:text-pink-500 transition-colors" />
                                        <span className="text-xs font-bold text-foreground/90">Instagram</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={networks.facebook}
                                            onChange={(e) => setNetworks({...networks, facebook: e.target.checked})}
                                            className="w-4 h-4 rounded border-border bg-foreground/5 text-blue-500 focus:ring-blue-500"
                                        />
                                        <Facebook size={18} className="text-muted-foreground group-hover:text-blue-500 transition-colors" />
                                        <span className="text-xs font-bold text-foreground/90">Página FB</span>
                                    </label>
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={loading || (mode === 'livre' ? !topic.trim() : !selectedPropertyId)}
                                className="w-full h-14 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg font-black text-sm uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] disabled:opacity-50"
                            >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5" />
                                {mode === 'imovel' ? 'Gerar Legenda do Imóvel' : 'Gerar conteúdo'}
                            </>
                        )}
                    </button>
                    </div>
                </div>

                {/* Lado Direito: Resultados/Preview */}
                <div className="bg-gradient-to-br from-[#404F4F] to-[#2d3939] rounded-[2rem] shadow-xl overflow-hidden flex flex-col relative group h-full min-h-[500px]">
                    <div className="p-4 md:p-8 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-1.5 w-full">
                                {[
                                    { id: 'medium', label: 'Feed Social', icon: Layout },
                                    { id: 'short', label: 'WhatsApp', icon: MessageSquare },
                                    { id: 'full', label: 'Detalhado', icon: BookOpen }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                            activeTab === tab.id
                                                ? 'bg-[#FFE600] text-[#404F4F] shadow-lg shadow-black/20'
                                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <tab.icon size={13} />
                                        {tab.label}
                                    </button>
                                ))}
                        </div>
                    </div>

                    <div className="flex-1 p-8 relative overflow-y-auto custom-scrollbar flex flex-col">
                        {!results ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 flex-1">
                                <div className="p-6 rounded-full border-2 border-dashed border-white/20">
                                    <Sparkles className="h-10 w-10 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-white font-bold">Aguardando geração...</p>
                                    <p className="text-white/60 text-xs">A legenda aparecerá aqui em segundos.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 flex-1 flex flex-col">
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 relative group/card flex-1 flex flex-col overflow-hidden">
                                    <textarea 
                                        className="w-full flex-1 min-h-[250px] p-6 bg-transparent text-white text-sm leading-relaxed font-medium resize-none outline-none custom-scrollbar"
                                        value={results[activeTab]}
                                        onChange={(e) => setResults({ ...results, [activeTab]: e.target.value })}
                                        placeholder="Sua legenda aparecerá aqui... Sinta-se livre para editar antes de publicar!"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {results && (
                        <div className="p-6 bg-black/20 backdrop-blur-md border-t border-white/10 flex flex-col gap-4">
                            


                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleCopy(results[activeTab])}
                                    className="h-12 flex items-center justify-center gap-2 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest transition-all"
                                >
                                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                    Copiar Texto
                                </button>
                                
                                {mode === 'imovel' ? (
                                    <button
                                        onClick={handlePublish}
                                        disabled={publishing}
                                        className="h-12 flex items-center justify-center gap-2 px-6 rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-[0.95] disabled:opacity-50"
                                    >
                                        {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        {publishing ? 'Publicando...' : 'Publicar Post'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => toast.info('A postagem direta livre ainda não suporta upload de mídias. Use o "Post de Imóvel" ou copie o texto.')}
                                        className="h-12 flex items-center justify-center gap-2 px-6 rounded-xl bg-white/10 text-white/50 font-bold text-xs uppercase tracking-widest cursor-not-allowed"
                                    >
                                        <Send size={16} />
                                        Postar Agora
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
