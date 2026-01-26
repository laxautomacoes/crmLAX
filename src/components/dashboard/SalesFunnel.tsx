'use client';

interface SalesFunnelProps {
    funnelSteps: Array<{
        label: string
        count: number
        stageId: string
    }>
}

export default function SalesFunnel({ funnelSteps }: SalesFunnelProps) {
    return (
        <div className="bg-card p-6 rounded-lg shadow-sm border border-muted-foreground/30 mb-8">
            <h3 className="text-lg font-bold text-foreground mb-6">Funil de Vendas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {funnelSteps.length > 0 ? (
                    funnelSteps.map((step, index) => (
                        <div key={step.stageId || index} className="flex flex-col items-center p-4 border border-muted-foreground/30 rounded-lg bg-muted/30">
                            <span className="text-xl font-bold text-foreground mb-1">{step.count}</span>
                            <span className="text-xs text-muted-foreground font-medium">{step.label}</span>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center text-muted-foreground text-sm py-4">
                        Nenhum estágio configurado
                    </div>
                )}
            </div>
        </div>
    );
}
