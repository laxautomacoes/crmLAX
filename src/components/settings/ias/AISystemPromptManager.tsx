'use client'

import React, { useState, useTransition } from 'react';
import { AIPrompt, saveAIPrompt, deleteAIPrompt, enhancePromptWithAI } from '@/app/_actions/ai-prompts';
import { Plus, Edit2, Trash2, Wand2, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

interface AISystemPromptManagerProps {
    prompts: AIPrompt[];
    tenantId?: string | null;
    isSuperadmin?: boolean;
}

export function AISystemPromptManager({ prompts, tenantId, isSuperadmin }: AISystemPromptManagerProps) {
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<Partial<AIPrompt> | null>(null);
    const [isEnhancing, setIsEnhancing] = useState(false);

    const handleEdit = (prompt?: AIPrompt) => {
        if (prompt) {
            setEditingPrompt({ ...prompt });
        } else {
            setEditingPrompt({ name: '', system_prompt: '', ai_provider: 'openai', tenant_id: tenantId || null });
        }
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setEditingPrompt(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este prompt?')) return;
        startTransition(async () => {
            try {
                await deleteAIPrompt(id);
                toast.success('Prompt excluído com sucesso');
            } catch (error: any) {
                toast.error('Erro ao excluir: ' + error.message);
            }
        });
    };

    const handleSave = async () => {
        if (!editingPrompt?.name || !editingPrompt?.system_prompt) {
            toast.error('Preencha o nome e o conteúdo do prompt');
            return;
        }
        startTransition(async () => {
            try {
                await saveAIPrompt(editingPrompt as any);
                toast.success('Prompt salvo com sucesso!');
                handleClose();
            } catch (error: any) {
                toast.error('Erro ao salvar: ' + error.message);
            }
        });
    };

    const handleEnhance = async () => {
        if (!editingPrompt?.system_prompt || editingPrompt.system_prompt.length < 5) {
            toast.error('Escreva um pequeno rascunho primeiro para a IA melhorar.');
            return;
        }
        setIsEnhancing(true);
        try {
            const { enhancedPrompt } = await enhancePromptWithAI(
                editingPrompt.system_prompt,
                editingPrompt.ai_provider || 'openai'
            );
            setEditingPrompt(prev => ({ ...prev, system_prompt: enhancedPrompt }));
            toast.success('Prompt otimizado com sucesso!');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao comunicar com a IA');
        } finally {
            setIsEnhancing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header da Seção */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">
                        Gerenciador de Prompts
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {isSuperadmin
                            ? 'Configure os Prompts Globais usados como base pelo sistema.'
                            : 'Personalize os comandos de IA para o contexto da sua imobiliária.'}
                    </p>
                </div>
                <button
                    onClick={() => handleEdit()}
                    className="h-[34px] min-w-[130px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm whitespace-nowrap"
                >
                    <Plus size={14} strokeWidth={1} />
                    Novo Prompt
                </button>
            </div>

            {/* Card Principal */}
            <div className="bg-card border border-border rounded-lg p-6">

                {/* Lista de Prompts */}
                {prompts.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg border border-border">
                        <Wand2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-foreground font-medium">Nenhum prompt configurado.</p>
                        <p className="text-muted-foreground text-sm mt-1">
                            Crie o seu primeiro prompt master para guiar a IA.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prompts.map(prompt => (
                            <div
                                key={prompt.id}
                                className="group relative p-4 border border-border rounded-lg bg-background flex flex-col gap-3 overflow-hidden hover:border-secondary/50 transition-colors"
                            >
                                {/* Barra lateral decorativa */}
                                <span className="absolute top-0 left-0 w-1 h-full bg-secondary rounded-l-lg" />

                                <div className="flex items-start justify-between pl-2">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-foreground">{prompt.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {prompt.ai_provider === 'gemini' ? '✦ Gemini' : '◆ GPT-4o'}
                                        </p>
                                    </div>
                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                        <button
                                            onClick={() => handleEdit(prompt)}
                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-secondary hover:bg-muted transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(prompt.id)}
                                            disabled={isPending}
                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                            title="Excluir"
                                        >
                                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed pl-2">
                                    {prompt.system_prompt}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Criação/Edição */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <div className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border shrink-0 gap-3 md:gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                                    {editingPrompt?.id ? 'Editar Prompt' : 'Novo Prompt'}
                                </h3>
                            </div>
                            <div className="flex items-center gap-3 md:gap-4">
                                <button
                                    onClick={handleSave}
                                    disabled={isPending || isEnhancing}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                                >
                                    {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Salvar Prompt
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Nome */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-foreground">
                                        Identificador
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: marketing_luxo"
                                        value={editingPrompt?.name || ''}
                                        onChange={e => setEditingPrompt(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all"
                                    />
                                </div>

                                {/* Motor de IA */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-foreground">
                                        Motor de IA
                                    </label>
                                    <select
                                        value={editingPrompt?.ai_provider || 'openai'}
                                        onChange={e => setEditingPrompt(prev => ({ ...prev, ai_provider: e.target.value as any }))}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all"
                                    >
                                        <option value="openai">◆ OpenAI (GPT-4o)</option>
                                        <option value="gemini">✦ Google Gemini</option>
                                    </select>
                                </div>
                            </div>

                            {/* Textarea do System Prompt */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-foreground">
                                        System Prompt / Contexto
                                    </label>
                                    <button
                                        onClick={handleEnhance}
                                        disabled={isEnhancing}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                                    >
                                        {isEnhancing
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : <Sparkles className="w-3 h-3" />
                                        }
                                        Melhorar com IA ({editingPrompt?.ai_provider === 'gemini' ? 'Gemini' : 'GPT'})
                                    </button>
                                </div>
                                <textarea
                                    rows={8}
                                    placeholder='Ex: "Sou corretor em Florianópolis, especializado em alto padrão. Posts focados em lifestyle e investimento."'
                                    value={editingPrompt?.system_prompt || ''}
                                    onChange={e => setEditingPrompt(prev => ({ ...prev, system_prompt: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all resize-none"
                                />
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
