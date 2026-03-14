'use client'

import { useState } from 'react';
import { Check, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { updatePlanConfig, type PlanConfigInput } from '@/app/_actions/plan';

interface PlanCardSuperadminProps {
    plan: PlanConfigInput & {
        name: string;
        price: string;
        period: string;
        description: string;
        features: string[];
        ai_features: string[];
        highlighted: boolean;
        icon: React.ReactNode;
    };
    onSaved: () => void;
}

export default function PlanCardSuperadmin({ plan, onSaved }: PlanCardSuperadminProps) {
    const [data, setData] = useState(plan);
    const [isSaving, setIsSaving] = useState(false);

    const updateField = <K extends keyof typeof data>(key: K, value: typeof data[K]) =>
        setData((prev) => ({ ...prev, [key]: value }));

    const updateFeature = (index: number, value: string) => {
        const updated = [...data.features];
        updated[index] = value;
        updateField('features', updated);
    };

    const removeFeature = (index: number) =>
        updateField('features', data.features.filter((_, i) => i !== index));

    const updateAiFeature = (index: number, value: string) => {
        const updated = [...data.ai_features];
        updated[index] = value;
        updateField('ai_features', updated);
    };

    const removeAiFeature = (index: number) =>
        updateField('ai_features', data.ai_features.filter((_, i) => i !== index));

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updatePlanConfig(data);
        setIsSaving(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`Plano ${data.name} salvo com sucesso!`);
            onSaved();
        }
    };

    const inputCls =
        'w-full rounded-lg border border-border bg-muted px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#FFE600]/50 focus:border-[#FFE600] transition-all';

    return (
        <div className={`relative flex flex-col rounded-2xl border-2 bg-background p-6 transition-all ${
            data.highlighted ? 'border-[#FFE600] shadow-lg shadow-[#FFE600]/10' : 'border-border'
        }`}>
            {/* Badge "Mais Popular" toggle */}
            <button
                onClick={() => updateField('highlighted', !data.highlighted)}
                className={`absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-0.5 text-xs font-bold transition-all ${
                    data.highlighted
                        ? 'bg-[#FFE600] text-black'
                        : 'bg-muted text-muted-foreground border border-dashed border-border'
                }`}
            >
                {data.highlighted ? '⭐ Mais Popular' : '+ Destacar'}
            </button>

            {/* Ícone + Nome + Descrição */}
            <div className="mb-4 flex items-center gap-2 mt-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${data.highlighted ? 'bg-[#FFE600]/20' : 'bg-muted'}`}>
                    {plan.icon}
                </div>
                <div className="flex-1 space-y-1">
                    <input
                        value={data.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className={`${inputCls} font-bold`}
                        placeholder="Nome do plano"
                    />
                    <input
                        value={data.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        className={`${inputCls} text-xs text-muted-foreground`}
                        placeholder="Descrição curta"
                    />
                </div>
            </div>

            {/* Preço */}
            <div className="mb-6 flex items-baseline gap-1">
                <input
                    value={data.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    className={`${inputCls} w-28 text-2xl font-bold`}
                    placeholder="R$ 97"
                />
                <input
                    value={data.period}
                    onChange={(e) => updateField('period', e.target.value)}
                    className={`${inputCls} w-16 text-xs text-muted-foreground`}
                    placeholder="/mês"
                />
            </div>

            {/* Features */}
            <ul className="mb-4 flex-1 space-y-2">
                {data.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-[#00B087]" />
                        <input
                            value={f}
                            onChange={(e) => updateFeature(i, e.target.value)}
                            className={`${inputCls} flex-1`}
                        />
                        <button onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </li>
                ))}
                <button
                    onClick={() => updateField('features', [...data.features, ''])}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                >
                    <Plus className="h-3.5 w-3.5" /> Adicionar feature
                </button>
            </ul>

            {/* AI Features */}
            <div className="mb-4 rounded-xl bg-[#FFE600]/10 p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Sparkles className="h-3.5 w-3.5" /> Inteligência Artificial
                </p>
                {data.ai_features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#FFE600]" />
                        <input
                            value={f}
                            onChange={(e) => updateAiFeature(i, e.target.value)}
                            className={`${inputCls} flex-1 text-xs`}
                        />
                        <button onClick={() => removeAiFeature(i)} className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => updateField('ai_features', [...data.ai_features, ''])}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                >
                    <Plus className="h-3.5 w-3.5" /> Adicionar IA feature
                </button>
            </div>

            {/* Limites numéricos */}
            <div className="mb-4 rounded-xl border border-border p-3 space-y-2">
                <p className="text-xs font-bold text-foreground mb-2">Limites do Plano</p>
                {[
                    { label: 'Leads/mês', key: 'max_leads_per_month' as const },
                    { label: 'Imóveis', key: 'max_assets' as const },
                    { label: 'Usuários', key: 'max_users' as const },
                    { label: 'Req. IA/mês', key: 'ai_requests_per_month' as const },
                ].map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                        <input
                            type="number"
                            value={(data as any)[key] ?? 0}
                            onChange={(e) => updateField(key, Number(e.target.value))}
                            className={`${inputCls} w-24 text-right`}
                        />
                    </div>
                ))}
                {[
                    { label: 'WhatsApp', key: 'has_whatsapp' as const },
                    { label: 'IA', key: 'has_ai' as const },
                    { label: 'Domínio próprio', key: 'has_custom_domain' as const },
                ].map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <button
                            onClick={() => updateField(key, !(data as any)[key])}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                (data as any)[key] ? 'bg-[#00B087]' : 'bg-muted-foreground/30'
                            }`}
                        >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                (data as any)[key] ? 'translate-x-4' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Botão Salvar */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold bg-[#404F4F] text-white hover:bg-[#2d3939] transition-all active:scale-[0.99] disabled:opacity-50"
            >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Plano'}
            </button>
        </div>
    );
}
