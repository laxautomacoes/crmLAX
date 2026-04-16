'use client'

import { useState, useTransition, useEffect } from 'react';
import { Settings2, Loader2, Cpu, Globe } from 'lucide-react';
import { updatePlanAIProvider } from '@/app/_actions/ai-usage';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PlanConfig {
    plan_type: string;
    display_name: string;
    ai_provider: string;
    ai_model?: string;
}

interface Props {
    configs: PlanConfig[];
}

export function AIPlanConfig({ configs }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [localConfigs, setLocalConfigs] = useState(configs);

    useEffect(() => {
        // Só atualiza se não estivermos no meio de uma transição
        if (!isPending) {
            setLocalConfigs(configs);
        }
    }, [configs, isPending]);

    const models = {
        openai: [
            { id: 'gpt-5.4', name: 'GPT-5.4 (High Performance)' },
            { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini (Fast)' },
            { id: 'gpt-4o', name: 'GPT (Standard)' },
            { id: 'gpt-4o-mini', name: 'GPT Mini' },
        ],
        gemini: [
            { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro' },
            { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
            { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        ]
    };

    const handleUpdate = async (originalPlanType: string, provider: 'gemini' | 'openai', model?: string) => {
        const currentModel = model || (provider === 'openai' ? 'gpt-4o' : 'gemini-3-flash');
        
        // Atualização otimista
        const updated = localConfigs.map(p => 
            p.plan_type === originalPlanType ? { ...p, ai_provider: provider, ai_model: currentModel } : p
        );
        setLocalConfigs(updated);

        startTransition(async () => {
            try {
                const result = await updatePlanAIProvider(originalPlanType, provider, currentModel);
                if (result.success) {
                    toast.success('Configuração atualizada.');
                    // Pequeno delay para garantir que o Supabase tenha propagado a alteração
                    setTimeout(() => {
                        router.refresh();
                    }, 100);
                } else {
                    toast.error('Erro: ' + result.error);
                    setLocalConfigs(configs);
                }
            } catch (error) {
                toast.error('Erro de rede.');
                setLocalConfigs(configs);
            }
        });
    };

    return (
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-12">
            <div className="space-y-2">
                <div className="flex items-center gap-3 text-slate-600">
                    <div className="p-2 bg-slate-50 rounded-xl">
                        <Settings2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 font-outfit tracking-tight">Motores de Inteligência</h3>
                </div>
                <p className="text-xs text-slate-400 font-bold tracking-[0.2em] uppercase">Mapeamento Técnico por Assinatura</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {localConfigs.map((plan) => (
                    <div key={plan.plan_type} className="space-y-6 flex flex-col">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{plan.display_name}</span>
                            {isPending && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                        </div>
                        
                        <div className="space-y-4 flex-1">
                            {/* Provider Selection (Segmented) */}
                            <div className="relative flex p-1 bg-slate-50 rounded-2xl border border-slate-100 h-12">
                                <div 
                                    className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm border border-slate-200/50 transition-all duration-300 ease-out pointer-events-none ${
                                        plan.ai_provider === 'openai' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                                    }`}
                                />
                                
                                <button
                                    onClick={() => handleUpdate(plan.plan_type, 'gemini')}
                                    disabled={isPending}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 text-[10px] font-black transition-colors ${
                                        plan.ai_provider === 'gemini' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-500'
                                    }`}
                                >
                                    <Cpu className="w-3.5 h-3.5" />
                                    GEMINI
                                </button>
                                
                                <button
                                    onClick={() => handleUpdate(plan.plan_type, 'openai')}
                                    disabled={isPending}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 text-[10px] font-black transition-colors ${
                                        plan.ai_provider === 'openai' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-500'
                                    }`}
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    GPT
                                </button>
                            </div>

                            {/* Model Selection (Dropdown) */}
                            <div className="relative group">
                                <select
                                    value={plan.ai_model || ''}
                                    onChange={(e) => handleUpdate(plan.plan_type, plan.ai_provider as any, e.target.value)}
                                    disabled={isPending}
                                    className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer group-hover:bg-white"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '14px' }}
                                >
                                    {models[plan.ai_provider as 'openai' | 'gemini']?.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="pt-8 border-t border-slate-50">
                <div className="flex items-center justify-center gap-3">
                    <div className="h-1 w-1 bg-amber-400 rounded-full animate-pulse" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Configurações refletidas instantaneamente em toda a infraestrutura neural
                    </p>
                </div>
            </div>
        </div>
    );
}
