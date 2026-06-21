'use client';

import { useState, useEffect } from 'react';
import { getLeadDocuments, createLeadDocument, deleteLeadDocument, updateLeadDocumentStatus, sendToDocuSign } from '@/app/_actions/documents';
import { createClient } from '@/lib/supabase/client';
import { FileText, Upload, Trash2, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LeadDocument {
    id: string;
    name: string;
    file_path: string;
    type: string;
    status: 'aprovado' | 'rejeitado' | 'pendente_revisao';
    docusign_envelope_id?: string;
    uploaded_at: string;
}

interface LeadDocumentsTabProps {
    leadId: string;
    tenantId: string;
    leadName: string;
    propertyInterest: string; // Ex: Apto 101 Bloco 2 Sol
    userRole: string;
}

const DOCUMENT_TYPES = [
    { value: 'identidade', label: 'Documento de Identidade (RG/CNH)' },
    { value: 'residencia', label: 'Comprovante de Residência' },
    { value: 'estado_civil', label: 'Certidão de Estado Civil' },
    { value: 'certidao_imovel', label: 'Certidão de Ônus do Imóvel' },
    { value: 'minuta', label: 'Minuta do Contrato' },
    { value: 'contrato_assinado', label: 'Contrato Assinado' }
];

export function LeadDocumentsTab({ leadId, tenantId, leadName, propertyInterest, userRole }: LeadDocumentsTabProps) {
    const [documents, setDocuments] = useState<LeadDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [sendingDocuSign, setSendingDocuSign] = useState<string | null>(null);
    const [docType, setDocType] = useState('identidade');
    


    const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(userRole.toLowerCase());

    const loadDocuments = async () => {
        setLoading(true);
        const res = await getLeadDocuments(leadId);
        if (res.success && res.data) {
            setDocuments(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadDocuments();
    }, [leadId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const supabase = createClient();

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `leads/${leadId}/docs/${fileName}`;

            // Fazer upload no storage
            const { error: uploadError } = await supabase.storage
                .from('crm-attachments')
                .upload(filePath, file, { cacheControl: '3600' });

            if (uploadError) throw uploadError;

            // Obter URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('crm-attachments')
                .getPublicUrl(filePath);

            // Criar registro no banco
            const res = await createLeadDocument(leadId, tenantId, {
                name: file.name,
                file_path: publicUrl,
                type: docType
            });

            if (res.success) {
                toast.success('Documento carregado com sucesso!');
                loadDocuments();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            console.error('Erro no upload de documento:', error);
            toast.error('Erro ao enviar documento: ' + error.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir este documento?')) return;

        const res = await deleteLeadDocument(id);
        if (res.success) {
            toast.success('Documento removido.');
            loadDocuments();
        } else {
            toast.error('Erro ao remover documento: ' + res.error);
        }
    };

    const handleStatusChange = async (id: string, status: 'aprovado' | 'rejeitado') => {
        const res = await updateLeadDocumentStatus(id, status);
        if (res.success) {
            toast.success(`Documento marcado como ${status}!`);
            loadDocuments();
        } else {
            toast.error('Erro ao atualizar status: ' + res.error);
        }
    };

    const handleDocuSignSend = async (docId: string) => {
        setSendingDocuSign(docId);
        const res = await sendToDocuSign(leadId, docId);
        if (res.success) {
            toast.success('Envelope criado na DocuSign e enviado para assinatura!');
            loadDocuments();
        } else {
            toast.error('Erro ao enviar para DocuSign: ' + res.error);
        }
        setSendingDocuSign(null);
    };



    return (
        <div className="space-y-5">

            {/* Grid principal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Upload Novo Documento */}
                <div className="col-span-1 bg-card dark:bg-muted/10 rounded-xl border border-border/40 p-4 space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Enviar Documento</h4>
 
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-foreground/80 ml-0.5">Tipo do Arquivo</label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            disabled={uploading}
                            className="w-full bg-gray-50 dark:bg-input border border-gray-200 dark:border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-900 dark:text-foreground outline-none transition-all cursor-pointer"
                        >
                            {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-foreground/80 ml-0.5">Arquivo</label>
                        <label className="border-[0.5px] border-dashed border-border/40 rounded-lg p-5 flex flex-col items-center justify-center gap-1.5 hover:bg-muted/10 hover:border-accent-icon/50 transition-all cursor-pointer">
                            {uploading ? (
                                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                            ) : (
                                <>
                                    <Upload size={16} className="text-muted-foreground" />
                                    <span className="text-[10px] font-bold text-muted-foreground text-center">Selecionar arquivo PDF</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>
                    </div>
 
                    <div className="bg-muted/30 dark:bg-muted/10 rounded-xl p-3 border border-border/30 flex gap-2">
                        <AlertCircle className="text-accent-icon shrink-0 mt-0.5" size={13} />
                        <p className="text-[9px] text-foreground/80 leading-relaxed">
                            Apenas formatos PDF, DOC e DOCX são permitidos. Minutas de contrato devem ser aprovadas antes do envio para assinatura no DocuSign.
                        </p>
                    </div>
                </div>
                
                {/* Lista de Documentos */}
                <div className="col-span-1 md:col-span-2 bg-card dark:bg-muted/10 rounded-xl border border-border/40 p-4 space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Documentação Anexa</h4>
                    
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-1.5">
                            <FileText size={24} className="opacity-40" />
                            <p className="text-[10px] font-bold uppercase tracking-wider">Nenhum anexo encontrado</p>
                            <p className="text-[9px] max-w-[200px]">Use o painel ao lado para selecionar a categoria e fazer upload de comprovantes ou minutas.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto pr-1">
                            {documents.map((doc) => {
                                const matchedType = DOCUMENT_TYPES.find(t => t.value === doc.type);
                                return (
                                    <div key={doc.id} className="flex items-center justify-between py-3 border-b border-border/10 last:border-0 group">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="p-1.5 bg-[#404F4F]/5 dark:bg-muted text-accent-icon rounded">
                                                <FileText size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="text-xs font-bold text-foreground truncate max-w-[180px] leading-tight" title={doc.name}>
                                                    {doc.name}
                                                </h5>
                                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider leading-tight mt-0.5">
                                                    {matchedType?.label || doc.type}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                                                 <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                doc.status === 'aprovado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                                doc.status === 'rejeitado' ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400'
                                            }`}>
                                                {doc.status === 'aprovado' ? 'Aprovado' : doc.status === 'rejeitado' ? 'Rejeitado' : 'Pendente'}
                                            </span>
 
                                            {isAdmin && doc.status === 'pendente_revisao' && (
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleStatusChange(doc.id, 'aprovado')} className="p-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded" title="Aprovar">
                                                        <CheckCircle2 size={12} />
                                                    </button>
                                                    <button onClick={() => handleStatusChange(doc.id, 'rejeitado')} className="p-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 rounded" title="Rejeitar">
                                                        <XCircle size={12} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* DocuSign integration button */}
                                            {['minuta', 'contrato_assinado'].includes(doc.type) && doc.status === 'aprovado' && (
                                                doc.docusign_envelope_id ? (
                                                    <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold uppercase tracking-wider">
                                                        DOCUSIGN ATIVO
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDocuSignSend(doc.id)}
                                                        disabled={sendingDocuSign === doc.id}
                                                        className="text-[9px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-all flex items-center gap-1"
                                                    >
                                                        {sendingDocuSign === doc.id ? (
                                                            <Loader2 size={10} className="animate-spin" />
                                                        ) : 'Enviar DocuSign'}
                                                    </button>
                                                )
                                            )}

                                            <a href={doc.file_path} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent-icon hover:underline font-bold">
                                                Ver
                                            </a>

                                            <button onClick={() => handleDelete(doc.id)} className="text-muted-foreground hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
// HMR Trigger
}
