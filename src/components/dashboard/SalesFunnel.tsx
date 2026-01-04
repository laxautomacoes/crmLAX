'use client';

const funnelSteps = [
    { label: 'Novo', count: 2 },
    { label: 'Contatado', count: 6 },
    { label: 'Qualificado', count: 8 },
    { label: 'Proposta', count: 8 },
    { label: 'Negociação', count: 9 },
    { label: 'Ganho', count: 0 },
    { label: 'Perdido', count: 8 },
];

export default function SalesFunnel() {
    return (
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border mb-8">
            <h3 className="text-lg font-bold text-foreground mb-6">Funil de Vendas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {funnelSteps.map((step, index) => (
                    <div key={index} className="flex flex-col items-center p-4 border border-border rounded-lg bg-muted/30">
                        <span className="text-xl font-bold text-foreground mb-1">{step.count}</span>
                        <span className="text-xs text-muted-foreground font-medium">{step.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
