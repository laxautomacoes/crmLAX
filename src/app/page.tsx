import LeadSourceChart from '@/components/admin/LeadSourceChart';
import RecentLeads from '@/components/admin/RecentLeads';

export default function HomePage() {
    // Dados mock até implementarmos autenticação e consulta real
    const mockLeadData = [
        { source: 'Facebook Ads', count: 15 },
        { source: 'Google Ads', count: 23 },
        { source: 'Instagram', count: 12 },
        { source: 'WhatsApp', count: 8 },
        { source: 'Site', count: 18 },
    ];

    const mockLeads = [
        { id: '1', name: 'João Silva', phone: '11999990001', source: 'Facebook Ads', interactions: ['Perguntou sobre financiamento', 'Quer ver o carro pessoalmente'] },
        { id: '2', name: 'Maria Santos', phone: '11999990002', source: 'WhatsApp', interactions: ['Interessada no HB20', 'Pediu desconto à vista'] },
        { id: '3', name: 'Carlos Oliveira', phone: '11999990003', source: 'Site', interactions: ['Preencheu formulário', 'Visualizou 5 veículos'] },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-[#404F4F] mb-8">Dashboard CRM LAX</h1>
                <LeadSourceChart data={mockLeadData} />
                <RecentLeads
                    leads={mockLeads}
                    tenantId="demo-tenant"
                    profileId="demo-profile"
                />
            </div>
        </div>
    );
}
