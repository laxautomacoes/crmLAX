'use client';

interface TeamPerformanceTableProps {
    data: Array<{
        id: string;
        name: string;
        leadsCount: number;
        conversionCount: number;
    }>;
}

export default function TeamPerformanceTable({ data }: TeamPerformanceTableProps) {
    return (
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
            <h3 className="text-lg font-bold text-foreground mb-6">Performance da Equipe</h3>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-lg">
                        <tr>
                            <th scope="col" className="px-6 py-3 rounded-l-lg">Nome</th>
                            <th scope="col" className="px-6 py-3 text-center">Leads</th>
                            <th scope="col" className="px-6 py-3 text-center">Conversões</th>
                            <th scope="col" className="px-6 py-3 text-center rounded-r-lg">Taxa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                    Nenhum dado encontrado para a equipe.
                                </td>
                            </tr>
                        ) : (
                            data.map((member) => {
                                const rate = member.leadsCount > 0
                                    ? ((member.conversionCount / member.leadsCount) * 100).toFixed(1)
                                    : '0.0';

                                return (
                                    <tr key={member.id} className="bg-card border-b border-border/50 hover:bg-muted/30 transition-colors last:border-0">
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            {member.name}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                                                {member.leadsCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium">
                                                {member.conversionCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full font-medium ${Number(rate) > 10 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {rate}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
