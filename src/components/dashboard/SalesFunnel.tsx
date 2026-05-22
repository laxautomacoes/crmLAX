'use client';

import Link from 'next/link';

interface SalesFunnelProps {
    funnelSteps: Array<{
        label: string
        count: number
        stageId: string
        color?: string
    }>
}

export default function SalesFunnel({ funnelSteps }: SalesFunnelProps) {
    return (
        <Link 
            href="/leads"
            className="block bg-card p-6 rounded-lg shadow-sm border border-muted-foreground/30 mb-8 hover:bg-muted/30 hover:border-foreground/30 transition-all duration-200 cursor-pointer group"
        >
            <h3 className="text-lg font-bold text-foreground mb-6 group-hover:text-primary transition-colors">
                Funil de Vendas
            </h3>
            <div className="flex flex-wrap gap-4">
                {funnelSteps.length > 0 ? (
                    funnelSteps.map((step, index) => {
                        const hasColor = step.color && step.color !== '#FFFFFF';
                        return (
                            <div
                                key={step.stageId || index}
                                className="flex-1 min-w-[120px] flex flex-col items-center p-4 border border-muted-foreground/30 rounded-lg bg-muted/30 md:bg-background"
                                style={{
                                    borderTop: hasColor ? `4px solid ${step.color}` : undefined,
                                }}
                            >
                                <span className="text-xs text-muted-foreground font-medium capitalize mb-1">{step.label}</span>
                                <span className="text-xl font-bold text-foreground">{step.count}</span>
                            </div>
                        );
                    })
                ) : (
                    <div className="w-full text-center text-muted-foreground text-sm py-4">
                        Nenhum estágio configurado
                    </div>
                )}
            </div>
        </Link>
    );
}
