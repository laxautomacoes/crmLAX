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
            <div className="bg-card rounded-xl border border-muted-foreground/30 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gray-200 dark:bg-muted/50 border-b border-muted-foreground/30">
                            {funnelSteps.length > 0 ? (
                                <tr>
                                    {funnelSteps.map((step, index) => (
                                        <th 
                                            key={step.stageId || index}
                                            className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-center"
                                            style={step.color ? { color: getStageColor(step.color) } : undefined}
                                        >
                                            {step.label}
                                        </th>
                                    ))}
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center">
                                        Estágios do Funil
                                    </th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-muted-foreground/30">
                            {funnelSteps.length > 0 ? (
                                <tr 
                                    onClick={() => router.push('/leads')}
                                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                                >
                                    {funnelSteps.map((step, index) => {
                                        const hasColor = step.color && step.color !== '#FFFFFF';
                                        return (
                                            <td key={step.stageId || index} className="px-4 py-5 text-center">
                                                <div className="flex justify-center">
                                                    <div
                                                        className="w-full max-w-[160px] flex flex-col items-center justify-center p-4 border border-muted-foreground/30 rounded-lg bg-background shadow-sm"
                                                        style={{
                                                            borderTop: hasColor ? `4px solid ${step.color}` : undefined,
                                                        }}
                                                    >
                                                        <span className="text-xl font-bold text-foreground">
                                                            {step.count}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ) : (
                                <tr>
                                    <td className="text-center text-muted-foreground text-sm py-10 bg-card">
                                        Nenhum estágio configurado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
