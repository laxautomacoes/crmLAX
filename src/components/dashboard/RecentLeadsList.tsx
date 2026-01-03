'use client';

const recentLeads = [
    { id: 1, name: 'João da Silva', car: 'Honda Civic 2022', status: 'Novo', time: 'há 2 horas' },
    { id: 2, name: 'João da Silva', car: 'Honda Civic 2022', status: 'Novo', time: 'há 2 horas' },
    { id: 3, name: 'João da Silva', car: 'Honda Civic 2022', status: 'Novo', time: 'há 2 horas' },
];

export default function RecentLeadsList() {
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-[#404F4F] mb-6">Leads Recentes</h3>
            <div className="space-y-4">
                {recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold text-sm">
                                JD
                            </div>
                            <div>
                                <p className="font-semibold text-[#404F4F]">{lead.name}</p>
                                <p className="text-xs text-gray-500">{lead.car}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-xs font-medium text-green-600 mb-1">{lead.status}</span>
                            <span className="block text-xs text-gray-400">{lead.time}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
