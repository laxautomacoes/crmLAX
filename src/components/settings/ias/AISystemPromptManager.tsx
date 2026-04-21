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
        <>
            {/* Card Principal */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-secondary" />
                            Gerenciador de Prompts
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isSuperadmin
                                ? 'Configure os Prompts Globais usados como base pelo sistema.'
                                : 'Personalize os comandos de IA para o contexto da sua imobiliária.'}
                        </p>
                    </div>
                    <button
                        onClick={() => handleEdit()}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Prompt
                    </button>
                </div>

                {/* Lista de Prompts */}
                {prompts.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-border">
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
                                className="group relative p-4 border border-border rounded-xl bg-background flex flex-col gap-3 overflow-hidden hover:border-secondary/50 transition-colors"
                            >
                                {/* Barra lateral decorativa */}
                                <span className="absolute top-0 left-0 w-1 h-full bg-secondary rounded-l-xl" />

                                <div className="flex items-start justify-between pl-2">
                                    <div>
                                        <h4 className="font-bold text-foreground">{prompt.name}</h4>
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground mt-1 inline-block">
                                            {prompt.ai_provider === 'gemini' ? '✦ Gemini' : '◆ GPT-4o'}
                                        </span>
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
                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
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
                    <div className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    {editingPrompt?.id ? 'Editar Prompt' : 'Criar Novo Prompt'}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1.5 md:mt-0.5">
                                    Defina as instruções. Use o botão com ✦ para transformar rascunhos em super-prompts.
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
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
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors disabled:opacity-50"
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

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isPending || isEnhancing}
                                className="flex items-center gap-2 px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Salvar Prompt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
