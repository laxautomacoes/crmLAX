'use client'

import { useState } from 'react';
import { analyzeLeadProbability } from '@/app/_actions/ai-analysis';

interface Lead {
    id: string;
    name: string;
    phone: string;
    source: string;
    interactions: string[];
}

interface RecentLeadsProps {
    leads: Lead[];
    tenantId: string;
    profileId: string;
}

export default function RecentLeads({ leads, tenantId, profileId }: RecentLeadsProps) {
    const [insights, setInsights] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    async function handleAnalyze(lead: Lead) {
        setLoading(prev => ({ ...prev, [lead.id]: true }));
        try {
            const result = await analyzeLeadProbability({
                tenant_id: tenantId,
                profile_id: profileId,
                name: lead.name,
                phone: lead.phone,
                source: lead.source,
                interactions: lead.interactions,
            });
            if (result.success) {
                setInsights(prev => ({ ...prev, [lead.id]: result.analysis }));
            }
        } catch (error) {
            setInsights(prev => ({ ...prev, [lead.id]: 'Erro ao gerar análise.' }));
        } finally {
            setLoading(prev => ({ ...prev, [lead.id]: false }));
        }
    }

    return (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-[#404F4F] mb-4">Leads Recentes</h2>
            <div className="space-y-4">
                {leads.map(lead => (
                    <div key={lead.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium">{lead.name}</p>
                                <p className="text-sm text-gray-500">{lead.phone}</p>
                                <p className="text-xs text-gray-400">Origem: {lead.source}</p>
                            </div>
                            <button
                                onClick={() => handleAnalyze(lead)}
                                disabled={loading[lead.id]}
                                className="bg-[#404F4F] text-white px-3 py-1.5 rounded text-sm hover:bg-[#2d3939] disabled:opacity-50"
                            >
                                {loading[lead.id] ? 'Analisando...' : 'Gerar Insight IA'}
                            </button>
                        </div>
                        {insights[lead.id] && (
                            <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-[#FFE600] rounded">
                                <p className="text-sm text-gray-700">{insights[lead.id]}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
