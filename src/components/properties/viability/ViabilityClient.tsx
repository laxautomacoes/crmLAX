'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { FormInput } from '@/components/shared/forms/FormInput';
import { getPropertyUnits } from '@/app/_actions/property-units';
import { analyzeViabilityMetrics, ViabilityMetrics } from '@/app/_actions/viability/market';
import { saveViabilityStudy } from '@/app/_actions/viability/studies';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Save, Building, Wand2, ArrowLeft, Printer } from 'lucide-react';
import ViabilityPreview from './ViabilityPreview';

interface Property {
    id: string;
    title: string;
    main_image_url: string | null;
}

interface ViabilityClientProps {
    tenantId: string;
    initialProperties: Property[];
}

export default function ViabilityClient({ tenantId, initialProperties }: ViabilityClientProps) {
    const [step, setStep] = useState(1);

    // Form Data
    const [propertyId, setPropertyId] = useState('');
    const [unitId, setUnitId] = useState('');
    const [city, setCity] = useState('Florianópolis');
    const [neighborhood, setNeighborhood] = useState('');
    const [propertyType, setPropertyType] = useState('Studio');

    const [builderLogo, setBuilderLogo] = useState('');
    const [propertyLogo, setPropertyLogo] = useState('');

    const [loadingUnits, setLoadingUnits] = useState(false);
    const [units, setUnits] = useState<any[]>([]);
    const [selectedUnitData, setSelectedUnitData] = useState<any>(null);

    const [loadingAI, setLoadingAI] = useState(false);
    const [aiMetrics, setAiMetrics] = useState<ViabilityMetrics | null>(null);
    const [saving, setSaving] = useState(false);

    const handlePropertyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setPropertyId(val);
        setUnitId('');
        setSelectedUnitData(null);
        setAiMetrics(null);
        if (!val) {
            setUnits([]);
            return;
        }

        setLoadingUnits(true);
        try {
            const { success, data } = await getPropertyUnits(val);
            if (success && data) {
                setUnits(data);
            } else {
                toast.error('Erro ao carregar unidades.');
            }
        } catch {
            toast.error('Erro ao carregar unidades.');
        }
        setLoadingUnits(false);
    };

    const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setUnitId(val);
        const unit = units.find((u: any) => u.id === val);
        setSelectedUnitData(unit || null);
    };

    const handleRunAI = async () => {
        if (!city || !neighborhood || !propertyType) {
            toast.warning('Preencha Cidade, Bairro e Tipo de Imóvel para a IA.');
            return;
        }

        setLoadingAI(true);
        try {
            const { success, data, error } = await analyzeViabilityMetrics(city, neighborhood, propertyType);

            if (success && data) {
                setAiMetrics(data);
                toast.success('Métricas de mercado carregadas com sucesso!');
                setStep(4);
            } else {
                toast.error(error || 'Falha ao buscar dados do mercado.');
            }
        } catch {
            toast.error('Erro inesperado ao buscar dados do mercado.');
        }
        setLoadingAI(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const selectedProp = initialProperties.find(p => p.id === propertyId);
            const { success, error } = await saveViabilityStudy({
                property_id: propertyId || undefined,
                property_unit_id: unitId || undefined,
                title: `Estudo - ${selectedProp?.title || 'Imóvel'} - ${selectedUnitData?.unit_number || ''}`,
                builder_logo_url: builderLogo || undefined,
                property_logo_url: propertyLogo || undefined,
                study_data: {
                    city,
                    neighborhood,
                    propertyType,
                    aiMetrics,
                    unitData: selectedUnitData,
                },
            });

            if (success) {
                toast.success('Estudo salvo com sucesso!');
            } else {
                toast.error(error || 'Erro ao salvar estudo.');
            }
        } catch {
            toast.error('Erro inesperado ao salvar.');
        }
        setSaving(false);
    };

    const selectedProp = initialProperties.find(p => p.id === propertyId);

    // Montar options para os selects
    const propertyOptions = [
        { value: '', label: 'Selecione o Imóvel...' },
        ...initialProperties.map(p => ({ value: p.id, label: p.title })),
    ];

    const unitOptions = [
        { value: '', label: loadingUnits ? 'Carregando...' : 'Selecione a Unidade...' },
        ...units.map((u: any) => ({
            value: u.id,
            label: `${u.unit_number} — R$ ${(u.valor_total || 0).toLocaleString('pt-BR')}`,
        })),
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader
                title="Estudo de Viabilidade"
                subtitle="Crie relatórios de projeção de investimento personalizados com Inteligência Artificial."
            />
            <hr className="hidden md:block border-border -mt-2" />

            {step < 4 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* === PAINEL DO WIZARD === */}
                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-foreground">Configurar Estudo</h3>
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                                Passo {step} de 3
                            </span>
                        </div>

                        {/* ─── PASSO 1: Imóvel & Logos ─── */}
                        {step === 1 && (
                            <div className="space-y-5 animate-in fade-in">
                                <FormSelect
                                    label="Selecione o Imóvel"
                                    value={propertyId}
                                    onChange={handlePropertyChange}
                                    options={propertyOptions}
                                />

                                <FormInput
                                    label="Logo da Construtora (URL)"
                                    value={builderLogo}
                                    onChange={(e) => setBuilderLogo(e.target.value)}
                                    placeholder="ex: /logo-arv.png ou https://..."
                                />

                                <FormInput
                                    label="Logo do Empreendimento (URL)"
                                    value={propertyLogo}
                                    onChange={(e) => setPropertyLogo(e.target.value)}
                                    placeholder="ex: /logo-luminae.png ou https://..."
                                />

                                <button
                                    className="h-[34px] w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!propertyId}
                                    onClick={() => setStep(2)}
                                >
                                    Próximo Passo <ArrowRight size={14} strokeWidth={1} />
                                </button>
                            </div>
                        )}

                        {/* ─── PASSO 2: Unidade / Fluxo ─── */}
                        {step === 2 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                                <FormSelect
                                    label="Unidade / Planta"
                                    value={unitId}
                                    onChange={handleUnitChange}
                                    disabled={loadingUnits}
                                    options={unitOptions}
                                />

                                {selectedUnitData && (
                                    <div className="bg-muted/30 p-4 rounded-lg space-y-2.5 text-sm border border-border/50">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Valor Total:</span>
                                            <span className="font-bold text-foreground">R$ {selectedUnitData.valor_total?.toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Entrada (Ato):</span>
                                            <span className="font-bold text-foreground">R$ {selectedUnitData.valor_ato?.toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Parcelas Mensais:</span>
                                            <span className="font-bold text-foreground">R$ {selectedUnitData.valor_mensais?.toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Reforços/Semestrais:</span>
                                            <span className="font-bold text-foreground">R$ {selectedUnitData.valor_reforcos?.toLocaleString('pt-BR')}</span>
                                        </div>
                                        {selectedUnitData.area_privativa && (
                                            <div className="flex justify-between pt-2 border-t border-border/30">
                                                <span className="text-muted-foreground">Área Privativa:</span>
                                                <span className="font-bold text-foreground">{selectedUnitData.area_privativa} m²</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3 mt-4">
                                    <button
                                        className="h-[34px] flex-1 flex items-center justify-center gap-2 text-foreground border border-border/20 hover:bg-muted/50 px-4 rounded-lg transition-all text-xs font-bold uppercase tracking-widest"
                                        onClick={() => setStep(1)}
                                    >
                                        <ArrowLeft size={14} strokeWidth={1} /> Voltar
                                    </button>
                                    <button
                                        className="h-[34px] flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!unitId}
                                        onClick={() => setStep(3)}
                                    >
                                        Próximo <ArrowRight size={14} strokeWidth={1} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ─── PASSO 3: Análise IA ─── */}
                        {step === 3 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                                <div className="bg-muted/20 border border-border/30 p-4 rounded-lg flex items-start gap-3">
                                    <Wand2 size={18} strokeWidth={1} className="text-foreground shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        <span className="block">A Inteligência Artificial vai pesquisar em tempo real as taxas de valorização e o aluguel médio para esta região.</span>
                                        <span className="block">Preencha os dados abaixo para refinar a busca.</span>
                                    </p>
                                </div>

                                <FormInput
                                    label="Cidade"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                                <FormInput
                                    label="Bairro"
                                    value={neighborhood}
                                    onChange={(e) => setNeighborhood(e.target.value)}
                                    placeholder="ex: Córrego Grande"
                                />
                                <FormInput
                                    label="Tipo de Imóvel"
                                    value={propertyType}
                                    onChange={(e) => setPropertyType(e.target.value)}
                                    placeholder="ex: Studio, Apartamento 2 Quartos"
                                />

                                <div className="flex gap-3 mt-4">
                                    <button
                                        className="h-[34px] flex-1 flex items-center justify-center gap-2 text-foreground border border-border/20 hover:bg-muted/50 px-4 rounded-lg transition-all text-xs font-bold uppercase tracking-widest"
                                        onClick={() => setStep(2)}
                                    >
                                        <ArrowLeft size={14} strokeWidth={1} /> Voltar
                                    </button>
                                    <button
                                        className="h-[34px] flex-1 flex items-center justify-center gap-2 bg-[#404F4F] text-white border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loadingAI || !city || !neighborhood}
                                        onClick={handleRunAI}
                                    >
                                        {loadingAI ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} strokeWidth={1} />}
                                        {loadingAI ? 'Analisando...' : 'Analisar Mercado'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* === PAINEL LATERAL (Preview Placeholder) === */}
                    <div className="hidden md:flex flex-col items-center justify-center p-8 bg-muted/10 border border-border/30 rounded-lg text-center">
                        <Building size={48} strokeWidth={0.5} className="text-muted-foreground/20 mb-4" />
                        <h3 className="text-lg font-bold text-foreground">Gerador Inteligente</h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
                            <span className="block">Preencha os passos ao lado.</span>
                            <span className="block">O sistema utilizará os dados de vendas e IA para gerar um relatório de viabilidade pronto para apresentar ao cliente.</span>
                        </p>
                    </div>
                </div>
            ) : (
                /* ════════════════════════════════════════════════════════
                   STEP 4: PREVIEW DO RELATÓRIO GERADO
                   ════════════════════════════════════════════════════════ */
                <div className="animate-in zoom-in-95 duration-500">
                    {/* Barra de Ações */}
                    <div className="flex justify-between items-center mb-4">
                        <button
                            className="h-[34px] flex items-center justify-center gap-2 text-foreground border border-border/20 hover:bg-muted/50 px-4 rounded-lg transition-all text-xs font-bold uppercase tracking-widest"
                            onClick={() => setStep(3)}
                        >
                            <ArrowLeft size={14} strokeWidth={1} /> Voltar para Edição
                        </button>
                        <div className="flex gap-2">
                            <button
                                className="h-[34px] flex items-center justify-center gap-2 bg-[#404F4F] text-white px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm"
                                onClick={() => window.print()}
                            >
                                <Printer size={14} strokeWidth={1} /> Imprimir / PDF
                            </button>
                            <button
                                className="h-[34px] flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 rounded-lg hover:bg-emerald-700 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm disabled:opacity-50"
                                disabled={saving}
                                onClick={handleSave}
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={1} />}
                                Salvar Estudo
                            </button>
                        </div>
                    </div>

                    {/* Relatório */}
                    <div className="border border-border/50 rounded-xl overflow-hidden shadow-lg bg-white relative">
                        <ViabilityPreview
                            propertyTitle={selectedProp?.title || 'Imóvel'}
                            builderLogo={builderLogo}
                            propertyLogo={propertyLogo}
                            unitData={selectedUnitData}
                            aiMetrics={aiMetrics}
                            city={city}
                            neighborhood={neighborhood}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
