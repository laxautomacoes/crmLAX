'use client'

import { useState } from 'react';
import { Check, GripVertical, Loader2, Plus, Sparkles, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { updatePlanConfig, type PlanConfigInput } from '@/app/_actions/plan';

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

    const toggleIcon = (listKey: 'features' | 'ai_features', index: number) => {
        const list = [...(data as any)[listKey]];
        const text = list[index];
        if (text.startsWith('[no-icon]')) {
            list[index] = text.replace('[no-icon]', '').trim();
        } else {
            list[index] = `[no-icon] ${text}`.trim();
        }
        updateField(listKey, list);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragEnd = (listKey: 'features' | 'ai_features', event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const list = [...(data as any)[listKey]];
        const oldIndex = Number(active.id.toString().split('-').pop());
        const newIndex = Number(over.id.toString().split('-').pop());

        const newList = arrayMove(list, oldIndex, newIndex);
        updateField(listKey, newList);
    };

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
        <div className={`relative flex flex-col rounded-2xl border bg-background p-6 transition-all ${
            data.highlighted ? 'border-[#FFE600] shadow-xl shadow-[#FFE600]/10' : 'border-muted-foreground/50'
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
            <div className="mb-4 flex-1">
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd('features', e)}
                >
                    <SortableContext 
                        items={data.features.map((_, i) => `feat-${i}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        <ul className="space-y-2">
                            {data.features.map((f, i) => (
                                <SortableFeatureItem 
                                    key={`feat-${i}`} 
                                    id={`feat-${i}`}
                                    text={f}
                                    onUpdate={(val: string) => updateFeature(i, val)}
                                    onRemove={() => removeFeature(i)}
                                    onToggleIcon={() => toggleIcon('features', i)}
                                    inputCls={inputCls}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
                <button
                    onClick={() => updateField('features', [...data.features, ''])}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 ml-6"
                >
                    <Plus className="h-3.5 w-3.5" /> Adicionar feature
                </button>
            </div>

            {/* AI Features */}
            <div className="mb-4 rounded-xl bg-[#FFE600]/10 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-2">
                    <Sparkles className="h-3.5 w-3.5" /> Inteligência Artificial
                </p>
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd('ai_features', e)}
                >
                    <SortableContext 
                        items={data.ai_features.map((_, i) => `ai-feat-${i}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {data.ai_features.map((f, i) => (
                                <SortableFeatureItem 
                                    key={`ai-feat-${i}`} 
                                    id={`ai-feat-${i}`}
                                    text={f}
                                    onUpdate={(val: string) => updateAiFeature(i, val)}
                                    onRemove={() => removeAiFeature(i)}
                                    onToggleIcon={() => toggleIcon('ai_features', i)}
                                    inputCls={inputCls}
                                    isAi
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                <button
                    onClick={() => updateField('ai_features', [...data.ai_features, ''])}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 ml-6"
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

function SortableFeatureItem({ id, text, onUpdate, onRemove, onToggleIcon, inputCls, isAi }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    const hasNoIcon = text.startsWith('[no-icon]');
    const displayText = hasNoIcon ? text.replace('[no-icon]', '').trim() : text;

    return (
        <li ref={setNodeRef} style={style} className="flex items-center gap-2 group">
            <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-3.5 w-3.5" />
            </button>
            
            <button 
                onClick={onToggleIcon}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                    hasNoIcon 
                        ? 'border-dashed border-border hover:border-muted-foreground bg-muted/30' 
                        : 'border-transparent bg-transparent'
                }`}
                title={hasNoIcon ? "Ativar ícone de check" : "Desativar ícone de check"}
            >
                {!hasNoIcon && (
                    <Check className={`h-3.5 w-3.5 ${isAi ? 'text-[#FFE600]' : 'text-[#00B087]'}`} />
                )}
                {hasNoIcon && (
                    <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                )}
            </button>

            <input
                value={displayText}
                onChange={(e) => onUpdate(hasNoIcon ? `[no-icon] ${e.target.value}` : e.target.value)}
                className={`${inputCls} ${isAi ? 'text-xs' : ''} flex-1`}
            />

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </li>
    );
}
