'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Plus, AlertCircle, Cpu, Globe, ChevronDown } from 'lucide-react';
import { renderPDFPages } from '@/lib/utils/pdf-render';
import { createClient } from '@/lib/supabase/client';
import { createProposalTemplate, analyzeProposalTemplatePDF } from '@/app/_actions/proposals';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
    const [templateType, setTemplateType] = useState<string>('proposta');
    const [analyzing, setAnalyzing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [mappedFields, setMappedFields] = useState<any[]>([]);
    const [step, setStep] = useState<'upload' | 'review'>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/'))) {
            setFile(selectedFile);
            if (!name) setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
        } else if (selectedFile) {
            toast.error('Por favor, envie um arquivo PDF ou Imagem.');
        }
    };

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !name.trim()) return toast.error('Nome e PDF são obrigatórios.');

        setAnalyzing(true);
        try {
            let images: string[] = [];
            if (file.type.startsWith('image/')) {
                const base64 = await new Promise<string>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                            resolve(dataUrl.split(',')[1]);
                        } else {
                            reject(new Error('Canvas não suportado.'));
                        }
                    };
                    img.onerror = reject;
                    img.src = URL.createObjectURL(file);
                });
                images = [base64];
            } else {
                images = await renderPDFPages(file);
            }

            const res = await analyzeProposalTemplatePDF(images, provider, model, templateType);
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

            const res = await createProposalTemplate(tenantId, name.trim(), publicUrl, provider, model, mappedFields, templateType);
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
        <div className="bg-card rounded-lg p-6 border border-border shadow-sm flex flex-col justify-between flex-1">
            {step === 'upload' ? (
                <form onSubmit={handleAnalyze} className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 min-w-0 flex flex-col">
                            <label className="text-sm font-bold text-foreground ml-1 mb-2">Categoria Formulário</label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="w-full flex justify-between items-center bg-background border border-input focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-3 py-2 text-xs font-medium text-foreground outline-none transition-all cursor-pointer truncate"
                                    >
                                        <span className="truncate">
                                            {templateType === 'proposta' ? 'Proposta Comercial' :
                                             templateType === 'agenciamento' ? 'Ficha de Agenciamento' : 'Formulário Genérico / Outros'}
                                        </span>
                                        <ChevronDown size={14} className="text-muted-foreground shrink-0 ml-2" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                    <DropdownMenuItem onClick={() => setTemplateType('proposta')}>Proposta Comercial</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTemplateType('agenciamento')}>Ficha de Agenciamento</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTemplateType('generico')}>Formulário Genérico / Outros</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col">
                            <label className="text-sm font-bold text-foreground ml-1 mb-2">IA Mapeamento</label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="w-full flex justify-between items-center bg-background border border-input focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-3 py-2 text-xs font-medium text-foreground outline-none transition-all cursor-pointer truncate"
                                    >
                                        <span className="truncate">
                                            {OCR_MODELS[provider].find(m => m.id === model)?.name || 'Selecionar IA'}
                                        </span>
                                        <ChevronDown size={14} className="text-muted-foreground shrink-0 ml-2" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                    <DropdownMenuLabel className="text-[10px] font-black tracking-wider text-muted-foreground">GEMINI</DropdownMenuLabel>
                                    {OCR_MODELS.gemini.map(m => (
                                        <DropdownMenuItem key={m.id} onClick={() => { setProvider('gemini'); setModel(m.id); }}>
                                            {m.name}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-[10px] font-black tracking-wider text-muted-foreground">OPENAI</DropdownMenuLabel>
                                    {OCR_MODELS.openai.map(m => (
                                        <DropdownMenuItem key={m.id} onClick={() => { setProvider('openai'); setModel(m.id); }}>
                                            {m.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-sm font-bold text-foreground ml-1 mb-2">Nome Template</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Proposta Padrão CRM LAX"
                            required
                            disabled={analyzing}
                            className="w-full bg-background border border-input focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        {!file ? (
                            <label className="border border-border/40 bg-background hover:bg-gray-50 dark:hover:bg-muted/30 rounded-lg p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer">
                                <Upload size={18} className="text-muted-foreground" />
                                <span className="text-[11px] font-bold text-muted-foreground text-center">Clique para selecionar PDF ou Imagem</span>
                                <input type="file" ref={fileInputRef} accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
                            </label>
                        ) : (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText size={16} className="text-red-500 shrink-0" />
                                    <span className="text-xs font-medium text-foreground truncate">{file.name}</span>
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
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:opacity-90 rounded-lg shadow-sm transition-all disabled:opacity-50 mt-4"
                    >
                        {analyzing ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Analisando com IA...
                            </>
                        ) : (
                            'Analisar com IA'
                        )}
                    </button>
                </form>
            ) : (
                <div className="space-y-4">
                    <div className="pb-2 border-b border-border flex justify-between items-center">
                        <span className="text-xs font-bold text-foreground">Revisão dos campos ({mappedFields.length})</span>
                        <button onClick={() => setStep('upload')} className="text-[10px] font-black text-muted-foreground hover:text-foreground uppercase tracking-wider">
                            ← Voltar
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

            <div className="mt-4 bg-muted/30 rounded-lg p-3 border border-border flex gap-2">
                <AlertCircle className="text-muted-foreground shrink-0 mt-0.5" size={14} />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    A IA mapeará os campos do seu arquivo para preenchê-lo automaticamente com base na categoria escolhida.
                </p>
            </div>
        </div>
    );
}
