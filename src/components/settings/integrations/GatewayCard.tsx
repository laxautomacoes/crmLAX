'use client';

import { CreditCard, ExternalLink, Settings2, ShieldCheck } from 'lucide-react';

export function GatewayCard() {
    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Pagamentos & Checkout</h3>
                    <p className="text-sm text-muted-foreground">Configure seu gateway para receber pagamentos e gerenciar assinaturas.</p>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Stripe Card */}
                    <div className="flex-1 p-6 rounded-2xl border border-border bg-muted/20 flex flex-col justify-between group hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#635BFF] flex items-center justify-center text-white font-black text-xs">S</div>
                                <span className="font-bold text-foreground">Stripe</span>
                            </div>
                            <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                                Ativo
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                            Integração oficial para processamento de cartões e recorrência com as menores taxas do mercado.
                        </p>
                        <button className="w-full py-2.5 bg-background border border-border text-foreground rounded-lg text-xs font-bold hover:bg-muted transition-all flex items-center justify-center gap-2">
                            <Settings2 size={14} />
                            Configurar Conta
                        </button>
                    </div>

                    {/* Checkout LAX Card */}
                    <div className="flex-1 p-6 rounded-2xl border border-border bg-muted/20 flex flex-col justify-between group hover:border-secondary/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground font-black text-[10px]">LAX</div>
                                <span className="font-bold text-foreground">Checkout LAX</span>
                            </div>
                            <div className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full border border-border text-[10px] font-bold uppercase tracking-wider">
                                Disponível
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                            Página de checkout personalizada e otimizada para alta conversão no mercado imobiliário.
                        </p>
                        <button className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2">
                            <ExternalLink size={14} />
                            Ativar Checkout
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 justify-center pt-2">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Transações protegidas por SSL 256-bit</span>
                </div>
            </div>
        </div>
    );
}
