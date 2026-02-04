'use client';

import { Home } from 'lucide-react';

interface TopPropertiesTableProps {
    data: Array<{
        id: string;
        title: string;
        leadsCount: number;
        conversionCount: number;
    }>;
}

export default function TopPropertiesTable({ data }: TopPropertiesTableProps) {
    return (
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
            <h3 className="text-lg font-bold text-foreground mb-6">Top Imóveis (Leads)</h3>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-lg">
                        <tr>
                            <th scope="col" className="px-6 py-3 rounded-l-lg">Imóvel</th>
                            <th scope="col" className="px-6 py-3 text-center">Leads</th>
                            <th scope="col" className="px-6 py-3 text-center rounded-r-lg">Ganhos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                                    Nenhum dado encontrado.
                                </td>
                            </tr>
                        ) : (
                            data.map((property) => (
                                <tr key={property.id} className="bg-card border-b border-border/50 hover:bg-muted/30 transition-colors last:border-0">
                                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                                        <Home size={16} className="text-muted-foreground" />
                                        <span className="truncate max-w-[200px]" title={property.title}>
                                            {property.title}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                                            {property.leadsCount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium">
                                            {property.conversionCount}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
