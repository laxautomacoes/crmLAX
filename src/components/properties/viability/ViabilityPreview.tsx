'use client';

import { useEffect, useRef } from 'react';
import { ViabilityMetrics } from '@/app/_actions/viability/market';

interface ViabilityPreviewProps {
    propertyTitle: string;
    builderLogo: string;
    propertyLogo: string;
    unitData: any;
    aiMetrics: ViabilityMetrics | null;
    city: string;
    neighborhood: string;
}

/**
 * Renderiza o relatório de Estudo de Viabilidade completo,
 * baseado no template estático do Luminae (projeção 2030).
 * Recebe dados dinâmicos do wizard e métricas da IA.
 */
export default function ViabilityPreview({
    propertyTitle,
    builderLogo,
    propertyLogo,
    unitData,
    aiMetrics,
    city,
    neighborhood,
}: ViabilityPreviewProps) {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<any>(null);

    // Calcular cenários baseados nos dados reais
    const valorTotal = unitData?.valor_total || 0;
    const areaPriv = unitData?.area_privativa || 0;
    const precoPorM2 = areaPriv > 0 ? Math.round(valorTotal / areaPriv) : 0;

    // Taxa de valorização da IA
    const rate = aiMetrics?.appreciationRate || 8;
    const conservadorRate = Math.max(rate - 2, 4);
    const moderadoRate = rate;
    const otimistaRate = rate + 2;

    // Projeção em 4 anos (standard para imóvel na planta)
    const anos = 4;
    const valorConservador = Math.round(valorTotal * Math.pow(1 + conservadorRate / 100, anos));
    const valorModerado = Math.round(valorTotal * Math.pow(1 + moderadoRate / 100, anos));
    const valorOtimista = Math.round(valorTotal * Math.pow(1 + otimistaRate / 100, anos));

    const roiConservador = valorConservador - valorTotal;
    const roiModerado = valorModerado - valorTotal;
    const roiOtimista = valorOtimista - valorTotal;

    const pctConservador = valorTotal > 0 ? ((roiConservador / valorTotal) * 100).toFixed(1) : '0';
    const pctModerado = valorTotal > 0 ? ((roiModerado / valorTotal) * 100).toFixed(1) : '0';
    const pctOtimista = valorTotal > 0 ? ((roiOtimista / valorTotal) * 100).toFixed(1) : '0';

    // Yield / Renda Passiva
    const yieldRate = aiMetrics?.rentalYield || 0.5;
    const aluguelMensal = Math.round(valorTotal * (yieldRate / 100));
    const aluguelAnual = aluguelMensal * 12;
    const yieldAnual = valorTotal > 0 ? ((aluguelAnual / valorTotal) * 100).toFixed(1) : '0';

    // Pagamento
    const valorAto = unitData?.valor_ato || 0;
    const valorMensais = unitData?.valor_mensais || 0;
    const valorReforcos = unitData?.valor_reforcos || 0;

    const fmt = (v: number) => v.toLocaleString('pt-BR');
    const fmtCurrency = (v: number) => `R$ ${fmt(v)}`;

    // Chart.js
    useEffect(() => {
        const loadChart = async () => {
            if (!chartRef.current) return;
            
            // Dynamic import Chart.js
            const { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } = await import('chart.js');
            Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            if (!ctx) return;

            chartInstanceRef.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Custo Atual', `Conservador (+${conservadorRate}%)`, `Moderado (+${moderadoRate}%)`, `Otimista (+${otimistaRate}%)`],
                    datasets: [{
                        label: 'Valor Total do Imóvel',
                        data: [valorTotal, valorConservador, valorModerado, valorOtimista],
                        backgroundColor: ['#404F4F', '#64748b', '#10b981', '#f59e0b'],
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context: any) => 'R$ ' + context.raw.toLocaleString('pt-BR'),
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { callback: (value: any) => 'R$ ' + (value / 1000) + 'k' },
                            grid: { 
                                color: 'rgba(0,0,0,0.05)',
                            }
                        },
                        x: { grid: { display: false }, ticks: { font: { size: 11, weight: 'bold' } } }
                    }
                }
            });
        };

        loadChart();

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [valorTotal, valorConservador, valorModerado, valorOtimista, conservadorRate, moderadoRate, otimistaRate]);

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#fff', color: '#1e293b' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 60px' }}>

                {/* === HEADER (Logos + Separator) === */}
                <header style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
                        {propertyLogo && <img src={propertyLogo} alt="Logo Empreendimento" style={{ height: 30, width: 'auto' }} />}
                        {builderLogo && <img src={builderLogo} alt="Logo Construtora" style={{ height: 22, width: 'auto' }} />}
                    </div>
                </header>

                {/* === TÍTULO === */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#404F4F', letterSpacing: '-0.02em', margin: 0 }}>Estudo de Viabilidade</h1>
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#6b7280', margin: '4px 0 0' }}>{propertyTitle.toUpperCase()}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-block', backgroundColor: '#404F4F', color: '#FFE600', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Perfil Investidor</span>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', margin: 0 }}>Ref: {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                {/* === INFO CARDS === */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                    {[
                        { icon: '📍', label: 'Localização', value: `${neighborhood}, ${city}` },
                        { icon: '🏢', label: 'Unidade Ref.', value: unitData?.unit_number || '—' },
                        { icon: '📐', label: 'Área Privativa', value: areaPriv ? `${areaPriv}m²` : '—' },
                        { icon: '💰', label: 'Valor Total', value: valorTotal > 0 ? fmtCurrency(valorTotal) : '—' },
                    ].map((item, i) => (
                        <div key={i} style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <span style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</span>
                            <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', marginTop: 4 }}>{item.value}</span>
                        </div>
                    ))}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

                {/* === SECTION 1: CENÁRIOS DE VALORIZAÇÃO === */}
                <section style={{ marginBottom: 32 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#404F4F', marginBottom: 8 }}>1. Cenários de Valorização ({anos} anos)</h3>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
                        Projeção de valorização baseada em dados de mercado pesquisados por Inteligência Artificial para <strong>{neighborhood}, {city}</strong>.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
                        {/* Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Conservador */}
                            <div style={{ backgroundColor: '#fff', borderLeft: '4px solid #94a3b8', padding: '12px 14px', borderRadius: '0 8px 8px 0', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ display: 'block', fontWeight: 700, fontSize: 11, color: '#1f2937' }}>Cenário Conservador (+{conservadorRate}% a.a.)</span>
                                    <span style={{ fontSize: 10, color: '#6b7280' }}>{fmtCurrency(valorConservador)}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ display: 'block', fontWeight: 900, color: '#374151' }}>+{fmtCurrency(roiConservador)}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280' }}>+{pctConservador}% ROI</span>
                                </div>
                            </div>

                            {/* Moderado */}
                            <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #10b981', padding: '12px 14px', borderRadius: '0 8px 8px 0', border: '1px solid #d1fae5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontWeight: 700, fontSize: 11, color: '#064e3b' }}>Cenário Moderado (+{moderadoRate}% a.a.)</span>
                                        <span style={{ fontSize: 8, backgroundColor: '#d1fae5', color: '#065f46', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>Tendência {city}</span>
                                    </div>
                                    <span style={{ fontSize: 10, color: '#065f46', fontWeight: 500 }}>{fmtCurrency(valorModerado)}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ display: 'block', fontWeight: 900, color: '#065f46', fontSize: 14 }}>+{fmtCurrency(roiModerado)}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#047857' }}>+{pctModerado}% ROI</span>
                                </div>
                            </div>

                            {/* Otimista */}
                            <div style={{ backgroundColor: '#fff', borderLeft: '4px solid #f59e0b', padding: '12px 14px', borderRadius: '0 8px 8px 0', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ display: 'block', fontWeight: 700, fontSize: 11, color: '#1f2937' }}>Cenário Otimista (+{otimistaRate}% a.a.)</span>
                                    <span style={{ fontSize: 10, color: '#6b7280' }}>{fmtCurrency(valorOtimista)}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ display: 'block', fontWeight: 900, color: '#b45309' }}>+{fmtCurrency(roiOtimista)}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e' }}>+{pctOtimista}% ROI</span>
                                </div>
                            </div>
                        </div>

                        {/* Gráfico */}
                        <div style={{ position: 'relative', height: 240 }}>
                            <canvas ref={chartRef}></canvas>
                        </div>
                    </div>

                    {/* Consolidado */}
                    <div style={{ marginTop: 24, backgroundColor: '#404F4F', color: '#fff', padding: 16, borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }}>
                        {[
                            { label: `Conservador (${conservadorRate}% a.a.)`, value: fmtCurrency(roiConservador), pct: `+${pctConservador}% de Retorno` },
                            { label: `Moderado (${moderadoRate}% a.a.)`, value: fmtCurrency(roiModerado), pct: `+${pctModerado}% de Retorno`, highlight: true },
                            { label: `Otimista (${otimistaRate}% a.a.)`, value: fmtCurrency(roiOtimista), pct: `+${pctOtimista}% de Retorno` },
                        ].map((s, i) => (
                            <div key={i} style={{ padding: '4px 12px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
                                <span style={{ display: 'block', fontSize: 10, color: '#d1d5db', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                                <span style={{ display: 'block', fontSize: s.highlight ? 22 : 18, fontWeight: 900, color: '#FFE600', marginTop: 4 }}>+ {s.value}</span>
                                <span style={{ display: 'block', fontSize: 11, color: s.highlight ? '#FFE600' : '#d1d5db', fontWeight: s.highlight ? 700 : 400 }}>{s.pct}</span>
                            </div>
                        ))}
                    </div>

                    {/* Fontes */}
                    <div style={{ marginTop: 16, padding: 14, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                        📊 <strong>Fontes &amp; Contexto:</strong> Dados obtidos via IA com base em {aiMetrics?.appreciationSource || 'fontes de mercado'}. 
                        Valorização estimada: <strong>{rate}% a.a.</strong> | 
                        Yield estimado: <strong>{yieldRate}% a.m.</strong> ({aiMetrics?.rentalSource || 'estimativa de mercado'}).
                    </div>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

                {/* === SECTION 2: FLUXO DE PAGAMENTO === */}
                <section style={{ marginBottom: 32 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#404F4F', marginBottom: 24 }}>2. Fluxo de Pagamento (Diluído)</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                        {[
                            { icon: '📝', label: 'Entrada (Ato)', value: fmtCurrency(valorAto), sub: 'Ato de assinatura' },
                            { icon: '📅', label: 'Parcelas Mensais', value: fmtCurrency(valorMensais), sub: 'Sem juros bancários' },
                            { icon: '🐷', label: 'Reforços Semestrais', value: fmtCurrency(valorReforcos), sub: 'Reforços diluídos' },
                        ].map((item, i) => (
                            <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, textAlign: 'center', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <span style={{ fontSize: 28 }}>{item.icon}</span>
                                <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 12, marginBottom: 4 }}>{item.label}</span>
                                <span style={{ display: 'block', fontSize: 22, fontWeight: 900, color: '#1f2937' }}>{item.value}</span>
                                <span style={{ display: 'block', fontSize: 11, color: '#6b7280', marginTop: 8 }}>{item.sub}</span>
                            </div>
                        ))}
                    </div>

                    {/* Estratégia Patrimonial */}
                    <div style={{ marginTop: 24, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ backgroundColor: '#404F4F', color: '#FFE600', fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estratégia Patrimonial</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Construa Patrimônio Sem Descapitalizar</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
                            {[
                                { title: '1. Preserve Sua Reserva', text: 'Você não precisa resgatar suas aplicações financeiras (CDB, Tesouro, Ações ou FIIs). Seu capital segue rendendo juros compostos.' },
                                { title: '2. Parcelas com Rendimentos', text: `Uma aplicação conservadora a 100% do CDI pode cobrir parte significativa da parcela mensal de ${fmtCurrency(valorMensais)}.` },
                                { title: '3. Custo Zero de Financiamento', text: 'Saldo integralizado diretamente durante a obra, sem juros bancários ou amortização Price/SAC.' },
                            ].map((item, i) => (
                                <div key={i} style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                    <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{item.title}</span>
                                    <p style={{ fontSize: 11, color: '#374151', lineHeight: 1.5, marginTop: 6 }}>{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

                {/* === SECTION 3: RENDA PASSIVA (YIELD) === */}
                <section style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#404F4F', marginBottom: 24 }}>3. Projeção de Renda Passiva (Yield)</h3>
                    <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
                        A rentabilidade (Yield) é calculada sobre o <strong>valor investido ({fmtCurrency(valorTotal)})</strong>, potencializando o retorno percentual.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                        {/* Locação Anual */}
                        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                <h4 style={{ fontWeight: 700, color: '#1f2937', margin: 0 }}>🏠 Locação Anual (Long Stay)</h4>
                            </div>
                            <div style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontSize: 13, color: '#6b7280' }}>Aluguel Mensal Estimado:</span>
                                    <span style={{ fontWeight: 700, color: '#1f2937' }}>{fmtCurrency(aluguelMensal)} / mês</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontSize: 13, color: '#6b7280' }}>Faturamento Anual:</span>
                                    <span style={{ fontWeight: 700, color: '#1f2937' }}>{fmtCurrency(aluguelAnual)}</span>
                                </div>
                                <div style={{ paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.08em' }}>Yield Projetado</span>
                                    <span style={{ fontSize: 22, fontWeight: 900, color: '#059669' }}>{yieldAnual}% a.a.</span>
                                </div>
                            </div>
                        </div>

                        {/* Temporada */}
                        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                <h4 style={{ fontWeight: 700, color: '#1f2937', margin: 0 }}>✈️ Temporada (Short Stay)</h4>
                            </div>
                            <div style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontSize: 13, color: '#6b7280' }}>Diária (70% Ocupação):</span>
                                    <span style={{ fontWeight: 700, color: '#1f2937' }}>~{fmtCurrency(Math.round(aluguelMensal / 20))} / dia</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontSize: 13, color: '#6b7280' }}>Faturamento Líq. Anual:</span>
                                    <span style={{ fontWeight: 700, color: '#1f2937' }}>{fmtCurrency(Math.round(aluguelAnual * 1.22 * 0.8))} <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>(-20% txs)</span></span>
                                </div>
                                <div style={{ paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.08em' }}>Yield Projetado</span>
                                    <span style={{ fontSize: 22, fontWeight: 900, color: '#059669' }}>
                                        {valorTotal > 0 ? ((Math.round(aluguelAnual * 1.22 * 0.8) / valorTotal) * 100).toFixed(1) : '0'}% a.a.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 32, textAlign: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                            ℹ️ A média nacional de rentabilidade de imóveis tradicionais fica entre <strong>4% e 5% ao ano</strong>.
                        </p>
                    </div>
                </section>

                {/* === FOOTER === */}
                <footer style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                        Este documento é uma simulação com base em médias de mercado e não configura promessa de ganho exato.
                        <br />Gerado por LAX CRM • {new Date().toLocaleDateString('pt-BR')}
                    </p>
                </footer>
            </div>
        </div>
    );
}
