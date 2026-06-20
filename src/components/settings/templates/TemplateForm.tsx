'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Plus, AlertCircle, Cpu, Globe } from 'lucide-react';
import { renderPDFPages } from '@/lib/utils/pdf-render';
import { createClient } from '@/lib/supabase/client';
import { createProposalTemplate, analyzeProposalTemplatePDF } from '@/app/_actions/proposals';
import { toast } from 'sonner';

const OCR_MODELS = {
    gemini: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
        { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
    ],
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4o', name: 'GPT-4o' },
    ]
} as const;

interface TemplateFormProps {
    tenantId: string;
    onSuccess: () => void;
}

export function TemplateForm({ tenantId, onSuccess }: TemplateFormProps) {
    const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
    const [model, setModel] = useState<string>('gemini-2.5-flash');
    const [analyzing, setAnalyzing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [mappedFields, setMappedFields] = useState<any[]>([]);
    const [step, setStep] = useState<'upload' | 'review'>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            if (!name) setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
        } else if (selectedFile) {
            toast.error('Por favor, envie um arquivo PDF.');
        }
    };

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !name.trim()) return toast.error('Nome e PDF são obrigatórios.');

        setAnalyzing(true);
        try {
            const images = await renderPDFPages(file);
            const res = await analyzeProposalTemplatePDF(images, provider, model);
            if (res.success && res.data) {
                setMappedFields(res.data);
                setStep('review');
                toast.success('Mapeamento concluído com sucesso!');
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast.error('Erro na análise da ficha: ' + (error.message || error));
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!file || !name.trim()) return;
        setUploading(true);
        try {
            const supabase = createClient();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.pdf`;
            const filePath = `templates/${tenantId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('crm-attachments')
                .upload(filePath, file, { cacheControl: '3600' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('crm-attachments').getPublicUrl(filePath);

            const res = await createProposalTemplate(tenantId, name.trim(), publicUrl, provider, model, mappedFields);
            if (res.success) {
                toast.success('Template salvo com sucesso!');
                setName('');
                setFile(null);
                setMappedFields([]);
                setStep('upload');
                onSuccess();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast.error('Erro ao salvar template: ' + (error.message || error));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="col-span-1 bg-card rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            {step === 'upload' ? (
                <form onSubmit={handleAnalyze} className="space-y-4">
                    <div className="pb-2 border-b border-gray-100">
                        <h3 className="text-base font-bold text-[#404F4F]">Novo Modelo</h3>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800 ml-1">Motor de IA de Mapeamento</label>
                        <div className="flex gap-2">
                            <div className="relative flex flex-1 p-0.5 bg-muted/50 rounded-lg border border-border h-8 items-center">
                                <button
                                    type="button"
                                    onClick={() => { setProvider('gemini'); setModel('gemini-2.5-flash'); }}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-black transition-colors rounded-md ${
                                        provider === 'gemini' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                                    }`}
                                >
                                    <Cpu className="w-3 h-3" /> GEMINI
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setProvider('openai'); setModel('gpt-4o-mini'); }}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-black transition-colors rounded-md ${
                                        provider === 'openai' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                                    }`}
                                >
                                    <Globe className="w-3 h-3" /> GPT
                                </button>
                            </div>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="flex-1 bg-muted/30 border border-border rounded-lg px-2 py-1 text-[10px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7' /%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '10px'
                                }}
                            >
                                {OCR_MODELS[provider].map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800 ml-1">Nome do Template *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Proposta Padrão CRM LAX"
                            required
                            disabled={analyzing}
                            className="w-full bg-gray-55 border border-gray-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800 ml-1">Arquivo PDF *</label>
                        {!file ? (
                            <label className="border-[0.5px] border-dashed border-border/40 rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-muted/10 hover:border-accent-icon/50 transition-all cursor-pointer">
                                <Upload size={18} className="text-muted-foreground" />
                                <span className="text-[11px] font-bold text-muted-foreground text-center">Clique para selecionar PDF</span>
                                <input type="file" ref={fileInputRef} accept=".pdf" onChange={handleFileChange} className="hidden" />
                            </label>
                        ) : (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText size={16} className="text-red-500 shrink-0" />
                                    <span className="text-xs font-medium truncate">{file.name}</span>
                                </div>
                                <button type="button" onClick={() => setFile(null)} className="text-[10px] font-bold text-red-500 hover:underline">
                                    Remover
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={analyzing || !file || !name.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-xs font-bold bg-[#404F4F] text-white hover:bg-[#2d3939] dark:bg-[#FFE600] dark:text-[#404F4F] dark:hover:bg-[#F2DB00] rounded-lg shadow-sm transition-all disabled:opacity-50 mt-4"
                    >
                        {analyzing ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Analisando com IA...
                            </>
                        ) : (
                            <>
                                <Plus size={14} />
                                Analisar Ficha com IA
                            </>
                        )}
                    </button>
                </form>
            ) : (
                <div className="space-y-4">
                    <div className="pb-2 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-[#404F4F]">Mapeamento ({mappedFields.length} campos)</h3>
                        <button onClick={() => setStep('upload')} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                            Voltar
                        </button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 text-xs">
                        {mappedFields.map((field, idx) => (
                            <div key={idx} className="flex flex-col p-2 bg-muted/30 border border-border/20 rounded-lg gap-1 leading-normal">
                                <div className="flex justify-between font-bold text-foreground">
                                    <span className="truncate max-w-[150px]">{field.label}</span>
                                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">{field.type}</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                                    <span className="font-mono">ID: {field.name}</span>
                                    <span>
                                        {field.crm_binding ? (
                                            <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1 py-0.5 rounded">
                                                ➔ {field.crm_binding.split('.')[1]}
                                            </span>
                                        ) : (
                                            <span className="text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 px-1 py-0.5 rounded">
                                                Manual
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Gravando Template...
                            </>
                        ) : (
                            'Confirmar e Salvar Template'
                        )}
                    </button>
                </div>
            )}

            <div className="mt-4 bg-[#404F4F]/5 rounded-xl p-3 border border-[#404F4F]/10 flex gap-2">
                <AlertCircle className="text-[#404F4F] shrink-0 mt-0.5" size={14} />
                <p className="text-[10px] text-foreground/80 leading-relaxed">
                    A IA mapeará os campos do seu PDF para preenchê-lo automaticamente na criação de propostas.
                </p>
            </div>
        </div>
    );
}
