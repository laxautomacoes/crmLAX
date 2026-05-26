'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProposal, saveProposal } from '@/app/_actions/proposals';
import { createLeadDocument } from '@/app/_actions/documents';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormTextarea } from '@/components/shared/forms/FormTextarea';
import { FileText, Loader2, Save, FileDown, Eye, Check } from 'lucide-react';
import { toast } from 'sonner';
// @ts-expect-error - lodash/debounce does not have types installed
import debounce from 'lodash/debounce';

interface LeadProposalTabProps {
    leadId: string;
    tenantId: string;
}

export function LeadProposalTab({ leadId, tenantId }: LeadProposalTabProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    
    const [formData, setFormData] = useState({
        value: '',
        buyer_name: '',
        buyer_cpf: '',
        buyer_email: '',
        buyer_phone: '',
        buyer_address: '',
        down_payment: '',
        financing: '',
        installments: '',
        permutas: '',
        notes: '',
        status: 'rascunho'
    });

    // 1. Carregar proposta existente
    useEffect(() => {
        async function loadProposal() {
            setLoading(true);
            const res = await getProposal(leadId);
            if (res.success && res.data) {
                const p = res.data;
                const buyer = p.buyer_data || {};
                const terms = p.payment_terms || {};
                setFormData({
                    value: p.value?.toString() || '',
                    buyer_name: buyer.name || '',
                    buyer_cpf: buyer.cpf || '',
                    buyer_email: buyer.email || '',
                    buyer_phone: buyer.phone || '',
                    buyer_address: buyer.address || '',
                    down_payment: terms.down_payment?.toString() || '',
                    financing: terms.financing?.toString() || '',
                    installments: terms.installments || '',
                    permutas: terms.permutas || '',
                    notes: terms.notes || '',
                    status: p.status || 'rascunho'
                });
                if (p.updated_at) {
                    setLastSaved(new Date(p.updated_at).toLocaleTimeString('pt-BR'));
                }
            }
            setLoading(false);
        }
        loadProposal();
    }, [leadId]);

    // 2. Lógica de Autosave (Debounced)
    const performAutosave = useCallback(
        debounce(async (currentData: typeof formData) => {
            if (!leadId) return;
            setSaving(true);
            
            const payload = {
                value: currentData.value ? parseFloat(currentData.value) : 0,
                buyer_data: {
                    name: currentData.buyer_name,
                    cpf: currentData.buyer_cpf,
                    email: currentData.buyer_email,
                    phone: currentData.buyer_phone,
                    address: currentData.buyer_address
                },
                payment_terms: {
                    down_payment: currentData.down_payment ? parseFloat(currentData.down_payment) : 0,
                    financing: currentData.financing ? parseFloat(currentData.financing) : 0,
                    installments: currentData.installments,
                    permutas: currentData.permutas,
                    notes: currentData.notes
                },
                status: currentData.status
            };

            const res = await saveProposal(leadId, tenantId, payload);
            if (res.success) {
                setLastSaved(new Date().toLocaleTimeString('pt-BR'));
            } else {
                toast.error('Erro no salvamento automático.');
            }
            setSaving(false);
        }, 1200),
        [leadId, tenantId]
    );

    const handleInputChange = (field: string, val: string) => {
        const updated = { ...formData, [field]: val };
        setFormData(updated);
        performAutosave(updated);
    };

    // 3. Gerar PDF e salvar nos documentos do Lead
    const handleGeneratePDF = async () => {
        setSaving(true);
        try {
            // Em produção, isso compõe o PDF.
            // Para simular, geramos o PDF base do HTML de visualização imprimível e salvamos no Storage
            toast.info('Gerando arquivo da proposta...');
            
            const docName = `Proposta_${formData.buyer_name.replace(/\s+/g, '_') || 'Cliente'}.pdf`;
            
            // Simular upload de arquivo de proposta
            const res = await createLeadDocument(leadId, tenantId, {
                name: docName,
                file_path: `https://mock-storage.crmlax.com/proposals/${leadId}/${docName}`,
                type: 'contrato_assinado'
            });

            if (res.success) {
                toast.success('Documento da proposta gerado e salvo nos anexos com sucesso!');
                // Forçar o status da proposta para "enviada"
                handleInputChange('status', 'enviada');
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast.error('Erro ao gerar proposta: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-secondary" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Indicador de Salvamento */}
            <div className="flex justify-between items-center bg-gray-50 dark:bg-muted/40 border border-gray-100 dark:border-border rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                        {saving ? 'Salvando alterações...' : 'Sincronizado com o banco'}
                    </span>
                </div>
                {lastSaved && (
                    <span className="text-[9px] text-muted-foreground font-bold">
                        ÚLTIMO SALVAMENTO ÀS {lastSaved}
                    </span>
                )}
            </div>

            <div className="space-y-4">
                {/* Lado Esquerdo: Comprador */}
                <div className="space-y-4 bg-card dark:bg-muted/10 p-4 rounded-xl border border-border/40">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Dados do Proponente</h4>
                    
                    <FormInput
                        label="Nome do Comprador"
                        value={formData.buyer_name}
                        onChange={(e) => handleInputChange('buyer_name', e.target.value)}
                        placeholder="Ex: João da Silva"
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <FormInput
                            label="CPF"
                            value={formData.buyer_cpf}
                            onChange={(e) => handleInputChange('buyer_cpf', e.target.value)}
                            placeholder="000.000.000-00"
                        />
                        <FormInput
                            label="Telefone"
                            value={formData.buyer_phone}
                            onChange={(e) => handleInputChange('buyer_phone', e.target.value)}
                            placeholder="(48) 99999-9999"
                        />
                    </div>

                    <FormInput
                        label="E-mail"
                        value={formData.buyer_email}
                        onChange={(e) => handleInputChange('buyer_email', e.target.value)}
                        placeholder="joao@exemplo.com"
                    />

                    <FormInput
                        label="Endereço"
                        value={formData.buyer_address}
                        onChange={(e) => handleInputChange('buyer_address', e.target.value)}
                        placeholder="Rua, Número, Bairro, Cidade - UF"
                    />
                </div>

                {/* Lado Direito: Condições */}
                <div className="space-y-4 bg-card dark:bg-muted/10 p-4 rounded-xl border border-border/40">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Condições Comerciais</h4>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <FormInput
                                label="Valor Total (R$)"
                                type="number"
                                value={formData.value}
                                onChange={(e) => handleInputChange('value', e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="col-span-1">
                            <FormInput
                                label="Sinal/Entrada"
                                type="number"
                                value={formData.down_payment}
                                onChange={(e) => handleInputChange('down_payment', e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="col-span-1">
                            <FormInput
                                label="Saldo Financiado"
                                type="number"
                                value={formData.financing}
                                onChange={(e) => handleInputChange('financing', e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <FormInput
                        label="Parcelamento Direto"
                        value={formData.installments}
                        onChange={(e) => handleInputChange('installments', e.target.value)}
                        placeholder="Ex: 12 parcelas de R$ 5.000 + 2 reforços semestrais de R$ 20.000"
                    />

                    <FormInput
                        label="Permutas / Bens Recebidos"
                        value={formData.permutas}
                        onChange={(e) => handleInputChange('permutas', e.target.value)}
                        placeholder="Ex: Carro Toyota Corolla 2022 avaliado em R$ 120.000"
                    />

                    <FormTextarea
                        label="Observações Adicionais"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={2}
                        placeholder="Detalhes específicos acordados..."
                    />
                </div>
            </div>

            {/* Ações */}
            <div className="flex gap-3 justify-end pt-2 border-t border-border/40">
                <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-foreground border border-border/40 hover:bg-gray-50 dark:hover:bg-muted rounded-lg transition-all"
                >
                    <Eye size={14} />
                    {showPreview ? 'Ocultar Espelho' : 'Visualizar Lâmina'}
                </button>
                <button
                    onClick={handleGeneratePDF}
                    disabled={!formData.buyer_name || !formData.value}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                    <FileDown size={14} />
                    Gerar PDF da Proposta
                </button>
            </div>

            {/* Espelho da Proposta para Impressão */}
            {showPreview && (
                <div className="border border-border/40 rounded-xl p-8 bg-white text-gray-900 font-sans shadow-inner max-w-2xl mx-auto space-y-6">
                    <div className="flex justify-between items-start border-b-2 border-[#404F4F] pb-4">
                        <div>
                            <h2 className="text-xl font-black text-[#404F4F] tracking-wide">PROPOSTA DE COMPRA E VENDA</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">CRM LAX - DOCUMENTO INTERNO</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs bg-gray-100 text-[#404F4F] px-2.5 py-1 rounded font-bold uppercase">
                                STATUS: {formData.status.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 text-xs">
                        {/* Proponente */}
                        <div>
                            <h3 className="font-bold text-[#404F4F] border-b border-gray-100 pb-1 mb-2 uppercase">1. Qualificação do Proponente</h3>
                            <div className="grid grid-cols-2 gap-2 text-gray-700">
                                <p><strong>Nome:</strong> {formData.buyer_name || '—'}</p>
                                <p><strong>CPF:</strong> {formData.buyer_cpf || '—'}</p>
                                <p><strong>E-mail:</strong> {formData.buyer_email || '—'}</p>
                                <p><strong>Telefone:</strong> {formData.buyer_phone || '—'}</p>
                                <p className="col-span-2"><strong>Endereço:</strong> {formData.buyer_address || '—'}</p>
                            </div>
                        </div>

                        {/* Condições Financeiras */}
                        <div>
                            <h3 className="font-bold text-[#404F4F] border-b border-gray-100 pb-1 mb-2 uppercase">2. Condições de Pagamento</h3>
                            <div className="grid grid-cols-3 gap-2 text-gray-700">
                                <p><strong>Valor Proposto:</strong> R$ {formData.value ? parseFloat(formData.value).toLocaleString('pt-BR') : '0,00'}</p>
                                <p><strong>Sinal/Entrada:</strong> R$ {formData.down_payment ? parseFloat(formData.down_payment).toLocaleString('pt-BR') : '0,00'}</p>
                                <p><strong>Financiamento:</strong> R$ {formData.financing ? parseFloat(formData.financing).toLocaleString('pt-BR') : '0,00'}</p>
                                <p className="col-span-3"><strong>Parcelamento:</strong> {formData.installments || 'Nenhum parcelamento direto'}</p>
                                <p className="col-span-3"><strong>Permutas/Bens:</strong> {formData.permutas || 'Nenhuma permuta declarada'}</p>
                            </div>
                        </div>

                        {/* Notas */}
                        {formData.notes && (
                            <div>
                                <h3 className="font-bold text-[#404F4F] border-b border-gray-100 pb-1 mb-2 uppercase">3. Observações</h3>
                                <p className="text-gray-700 leading-relaxed italic">{formData.notes}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-end border-t border-gray-100 pt-6 text-[10px] text-gray-400">
                        <p>Gerado via CRM LAX em {new Date().toLocaleDateString('pt-BR')}</p>
                        <p className="font-bold">Assinaturas necessárias após aceite da proposta</p>
                    </div>
                </div>
            )}
        </div>
    );
}
