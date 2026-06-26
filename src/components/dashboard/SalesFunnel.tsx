'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

interface SalesFunnelProps {
    funnelSteps: Array<{
        label: string
        count: number
        stageId: string
        color?: string
    }>
}

export default function SalesFunnel({ funnelSteps }: SalesFunnelProps) {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const getStageColor = (color?: string) => {
        if (!color) return undefined;
        const upperColor = color.toUpperCase();
        if (upperColor === '#FFFFFF' || upperColor === '#FFF') return undefined;

        // Se estiver no modo claro e for amarelo ou cores muito claras, escurece para garantir o contraste/legibilidade
        const isDark = mounted && resolvedTheme === 'dark';
        if (!isDark) {
            if (upperColor === '#FFE600' || upperColor === '#FACC15' || upperColor === '#FDE047' || upperColor === '#FEF08A' || upperColor === '#FCD34D') {
                return '#CA8A04'; // Tom dourado/âmbar legível no modo claro
            }
        }
        return color;
    };

    return (
        <div className="space-y-4 mb-8">
            <div 
                onClick={() => router.push('/leads')}
                className="inline-block cursor-pointer group"
            >
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    Funil de Vendas
                </h3>
            </div>
            <div className="bg-card rounded-xl border border-muted-foreground/30 p-4 shadow-sm">
                <div className="overflow-x-auto pb-2 md:pb-0">
                    {funnelSteps.length > 0 ? (
                        <div 
                            className="flex gap-4 md:grid"
                            style={{
                                gridTemplateColumns: `repeat(${funnelSteps.length}, minmax(0, 1fr))`
                            }}
                        >
                            {funnelSteps.map((step, index) => {
                                const hasColor = step.color && step.color !== '#FFFFFF';
                                return (
                                    <div
                                        key={step.stageId || index}
                                        onClick={() => router.push('/leads')}
                                        className="flex-1 min-w-[130px] flex-shrink-0 md:flex-shrink md:min-w-0 flex flex-col items-center justify-center p-4 border border-muted-foreground/30 rounded-lg bg-background shadow-sm hover:bg-muted/30 transition-all active:scale-[0.99] cursor-pointer"
                                        style={{
                                            borderTop: hasColor ? `4px solid ${step.color}` : undefined,
                                        }}
                                    >
                                        <span 
                                            className="text-[10px] font-bold uppercase tracking-wider text-center mb-1.5"
                                            style={step.color ? { color: getStageColor(step.color) } : undefined}
                                        >
                                            {step.label}
                                        </span>
                                        <span className="text-xl font-bold text-foreground">
                                            {step.count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground text-sm py-10 bg-card">
                            Nenhum estágio configurado.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
