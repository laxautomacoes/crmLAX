'use client';

const recentLeads = [
    { id: 1, name: 'João da Silva', car: 'Honda Civic 2022', status: 'Novo', time: 'há 2 horas' },
    { id: 2, name: 'João da Silva', car: 'Honda Civic 2022', status: 'Novo', time: 'há 2 horas' },
    { id: 3, name: 'João da Silva', car: 'Honda Civic 2022', status: 'Novo', time: 'há 2 horas' },
];

export default function RecentLeadsList() {
    return (
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <h3 className="text-lg font-bold text-foreground mb-6">Leads Recentes</h3>
            <div className="space-y-4">
                {recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold text-sm">
                                JD
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">{lead.name}</p>
                                <p className="text-xs text-muted-foreground">{lead.car}</p>
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
