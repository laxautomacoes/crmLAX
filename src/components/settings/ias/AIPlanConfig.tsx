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
}

interface Props {
    configs: PlanConfig[];
}

export function AIPlanConfig({ configs }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [localConfigs, setLocalConfigs] = useState(configs);

    // Sincroniza estado local quando as props mudam (ex: após revalidação)
    useEffect(() => {
        setLocalConfigs(configs);
    }, [configs]);

    const handleUpdate = async (planType: string, provider: 'gemini' | 'openai') => {
        // Atualização otimista local
        const updated = localConfigs.map(p => 
            p.plan_type === planType ? { ...p, ai_provider: provider } : p
        );
        setLocalConfigs(updated);

        startTransition(async () => {
            try {
                const result = await updatePlanAIProvider(planType, provider);
                if (result.success) {
                    toast.success(`${planType.toUpperCase()}: Provedor alterado.`);
                    router.refresh();
                } else {
                    toast.error('Erro: ' + result.error);
                    setLocalConfigs(configs); // Reverte em caso de erro
                }
            } catch (error) {
                toast.error('Erro de conexão.');
                setLocalConfigs(configs); // Reverte
            }
        });
    };

    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-1 bg-indigo-500 rounded-full" />
                    <h3 className="text-lg font-semibold text-slate-800">Provedores</h3>
                </div>
                <p className="text-xs text-slate-400 font-medium">DEFINA O MOTOR DE IA POR NÍVEL</p>
            </div>

            <div className="space-y-6">
                {localConfigs.map((plan) => (
                    <div key={plan.plan_type} className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-semibold text-slate-700">{plan.display_name}</span>
                            {isPending && <Loader2 className="w-3 h-3 animate-spin text-slate-300" />}
                        </div>
                        
                        <div className="relative flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
                            {/* Segmented Control Background Slider */}
                            <div 
                                className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm border border-slate-200/50 transition-all duration-300 ease-out ${
                                    plan.ai_provider === 'openai' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                                }`}
                            />
                            
                            <button
                                onClick={() => handleUpdate(plan.plan_type, 'gemini')}
                                disabled={isPending}
                                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-colors ${
                                    plan.ai_provider === 'gemini' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-500'
                                }`}
                            >
                                <Cpu className={`w-3.5 h-3.5 ${plan.ai_provider === 'gemini' ? 'text-indigo-500' : 'text-slate-300'}`} />
                                GEMINI
                            </button>
                            
                            <button
                                onClick={() => handleUpdate(plan.plan_type, 'openai')}
                                disabled={isPending}
                                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-colors ${
                                    plan.ai_provider === 'openai' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-500'
                                }`}
                            >
                                <Globe className={`w-3.5 h-3.5 ${plan.ai_provider === 'openai' ? 'text-emerald-500' : 'text-slate-300'}`} />
                                GPT-4O
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                    Alterações impactam imediatamente todos os usuários vinculados aos planos acima.
                </p>
            </div>
        </div>
    );
}
