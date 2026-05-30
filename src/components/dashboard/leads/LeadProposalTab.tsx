'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProposal, saveProposal } from '@/app/_actions/proposals';
import { createLeadDocument } from '@/app/_actions/documents';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormTextarea } from '@/components/shared/forms/FormTextarea';
import { User, Home, FileDown, Eye, Loader2, MapPin, Phone, Mail, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency';
// @ts-expect-error - lodash/debounce does not have types installed
import debounce from 'lodash/debounce';

interface LeadProposalTabProps {
    leadId: string;
    tenantId: string;
    contactId?: string;
    propertyId?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    propertyInterest?: string;
}

export function LeadProposalTab({ 
    leadId, 
    tenantId, 
    contactId, 
    propertyId,
    contactName,
    contactPhone,
    contactEmail,
    propertyInterest
}: LeadProposalTabProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [contactData, setContactData] = useState<any>(null);
    const [propertyData, setPropertyData] = useState<any>(null);
    
    const [formData, setFormData] = useState({
        value: '',
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
                const terms = p.payment_terms || {};
                setFormData({
                    value: p.value ? formatCurrencyBRL(Math.round(Number(p.value) * 100).toString()) : '',
                    down_payment: terms.down_payment ? formatCurrencyBRL(Math.round(Number(terms.down_payment) * 100).toString()) : '',
                    financing: terms.financing ? formatCurrencyBRL(Math.round(Number(terms.financing) * 100).toString()) : '',
                    installments: terms.installments || '',
                    permutas: terms.permutas || '',
                    notes: terms.notes || '',
                    status: p.status || 'rascunho'
                });
                if (p.contact) setContactData(p.contact);
                if (p.property) setPropertyData(p.property);
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
                value: currentData.value ? parseCurrencyBRL(currentData.value) : 0,
                payment_terms: {
                    down_payment: currentData.down_payment ? parseCurrencyBRL(currentData.down_payment) : 0,
                    financing: currentData.financing ? parseCurrencyBRL(currentData.financing) : 0,
                    installments: currentData.installments,
                    permutas: currentData.permutas,
                    notes: currentData.notes
                },
                status: currentData.status,
                contact_id: contactId,
                property_id: propertyId
            };

            const res = await saveProposal(leadId, tenantId, payload);
            if (res.success) {
                setLastSaved(new Date().toLocaleTimeString('pt-BR'));
            } else {
                toast.error('Erro no salvamento automático.');
            }
            setSaving(false);
        }, 1200),
        [leadId, tenantId, contactId, propertyId]
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
            toast.info('Gerando arquivo da proposta...');
            
            const buyerName = contactData?.name || contactName || 'Cliente';
            const docName = `Proposta_${buyerName.replace(/\s+/g, '_')}.pdf`;
            
            const res = await createLeadDocument(leadId, tenantId, {
                name: docName,
                file_path: `https://mock-storage.crmlax.com/proposals/${leadId}/${docName}`,
                type: 'contrato_assinado'
            });

            if (res.success) {
                toast.success('Documento da proposta gerado e salvo nos anexos com sucesso!');
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

    // Dados do cliente (da proposta salva ou do lead)
    const displayName = contactData?.name || contactName || '—';
    const displayPhone = contactData?.phone || contactPhone || '—';
    const displayEmail = contactData?.email || contactEmail || '—';
    const displayCpf = contactData?.cpf || '—';
    const displayAddress = contactData ? [
        contactData.address_street,
        contactData.address_number,
        contactData.address_neighborhood,
        contactData.address_city && contactData.address_state 
            ? `${contactData.address_city} - ${contactData.address_state}` 
            : contactData.address_city
    ].filter(Boolean).join(', ') || '—' : '—';

    // Dados do imóvel
    const displayPropertyTitle = propertyData?.title || propertyInterest || '—';
    const displayPropertyPrice = propertyData?.price 
        ? `R$ ${parseFloat(propertyData.price).toLocaleString('pt-BR')}` 
        : '—';
    const displayPropertyLocation = propertyData 
        ? [propertyData.address_city, propertyData.address_state].filter(Boolean).join(' - ') 
        : '—';

    return (
        <div className="space-y-5">
            {/* Card: Proponente (read-only) */}
            <div className="bg-card dark:bg-muted/10 p-4 rounded-xl border border-border/40">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <User size={14} className="text-accent-icon" />
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Proponente</h4>
                    </div>
                    {lastSaved && (
                        <span className="text-[9px] text-muted-foreground font-bold">
                            SALVO ÀS {lastSaved}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent-icon/10 flex items-center justify-center shrink-0">
                            <User size={14} className="text-accent-icon" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nome</p>
                            <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent-icon/10 flex items-center justify-center shrink-0">
                            <CreditCard size={14} className="text-accent-icon" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">CPF</p>
                            <p className="text-sm font-bold text-foreground truncate">{displayCpf}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent-icon/10 flex items-center justify-center shrink-0">
                            <Phone size={14} className="text-accent-icon" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Telefone</p>
                            <p className="text-sm font-bold text-foreground truncate">{displayPhone}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent-icon/10 flex items-center justify-center shrink-0">
                            <Mail size={14} className="text-accent-icon" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">E-mail</p>
                            <p className="text-sm font-bold text-foreground truncate">{displayEmail}</p>
                        </div>
                    </div>
                    {displayAddress !== '—' && (
                        <div className="md:col-span-2 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-accent-icon/10 flex items-center justify-center shrink-0">
                                <MapPin size={14} className="text-accent-icon" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Endereço</p>
                                <p className="text-sm font-bold text-foreground truncate">{displayAddress}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Card: Imóvel Vinculado */}
            {(propertyData || propertyInterest) && (
                <div className="bg-card dark:bg-muted/10 p-4 rounded-xl border border-border/40">
                    <div className="flex items-center gap-2 mb-3">
                        <Home size={14} className="text-accent-icon" />
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Imóvel Vinculado</h4>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{displayPropertyTitle}</p>
                            {displayPropertyLocation !== '—' && (
                                <p className="text-xs text-muted-foreground mt-0.5">{displayPropertyLocation}</p>
                            )}
                        </div>
                        {displayPropertyPrice !== '—' && (
                            <span className="text-sm font-bold text-accent-icon whitespace-nowrap">{displayPropertyPrice}</span>
                        )}
                    </div>
                </div>
            )}

            {/* Condições Comerciais */}
            <div className="space-y-4 bg-card dark:bg-muted/10 p-4 rounded-xl border border-border/40">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Condições Comerciais</h4>

                    <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                        <FormInput
                            label="Valor Total (R$)"
                            value={formData.value}
                            onChange={(e) => handleInputChange('value', formatCurrencyBRL(e.target.value))}
                            placeholder="0,00"
                        />
                    </div>
                    <div className="col-span-1">
                        <FormInput
                            label="Sinal/Entrada"
                            value={formData.down_payment}
                            onChange={(e) => handleInputChange('down_payment', formatCurrencyBRL(e.target.value))}
                            placeholder="0,00"
                        />
                    </div>
                    <div className="col-span-1">
                        <FormInput
                            label="Saldo Financiado"
                            value={formData.financing}
                            onChange={(e) => handleInputChange('financing', formatCurrencyBRL(e.target.value))}
                            placeholder="0,00"
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
                    disabled={!formData.value}
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
                                <p><strong>Nome:</strong> {displayName}</p>
                                <p><strong>CPF:</strong> {displayCpf}</p>
                                <p><strong>E-mail:</strong> {displayEmail}</p>
                                <p><strong>Telefone:</strong> {displayPhone}</p>
                                {displayAddress !== '—' && (
                                    <p className="col-span-2"><strong>Endereço:</strong> {displayAddress}</p>
                                )}
                            </div>
                        </div>

                        {/* Imóvel */}
                        {(propertyData || propertyInterest) && (
                            <div>
                                <h3 className="font-bold text-[#404F4F] border-b border-gray-100 pb-1 mb-2 uppercase">2. Imóvel</h3>
                                <div className="grid grid-cols-2 gap-2 text-gray-700">
                                    <p><strong>Imóvel:</strong> {displayPropertyTitle}</p>
                                    <p><strong>Valor:</strong> {displayPropertyPrice}</p>
                                    {displayPropertyLocation !== '—' && (
                                        <p><strong>Localização:</strong> {displayPropertyLocation}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Condições Financeiras */}
                        <div>
                            <h3 className="font-bold text-[#404F4F] border-b border-gray-100 pb-1 mb-2 uppercase">{propertyData || propertyInterest ? '3' : '2'}. Condições de Pagamento</h3>
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
                                <h3 className="font-bold text-[#404F4F] border-b border-gray-100 pb-1 mb-2 uppercase">{propertyData || propertyInterest ? '4' : '3'}. Observações</h3>
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
