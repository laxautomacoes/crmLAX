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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
            <h3 className="text-lg font-bold text-[#404F4F] mb-6">Funil de Vendas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {funnelSteps.map((step, index) => (
                    <div key={index} className="flex flex-col items-center p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                        <span className="text-xl font-bold text-[#404F4F] mb-1">{step.count}</span>
                        <span className="text-xs text-gray-500 font-medium">{step.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
