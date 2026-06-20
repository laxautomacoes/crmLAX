'use client'

import { useRouter } from 'next/navigation';
import { LeadTemperatureBadge } from './leads/LeadTemperatureBadge';

interface RecentLeadsListProps {
    recentLeads: Array<{
        id: string
        name: string
        interest: string
        status: string
        color?: string
        created_at: string
        last_interaction_at?: string | null
        assigned_to_name?: string
    }>
}

export default function RecentLeadsList({ recentLeads }: RecentLeadsListProps) {
    const router = useRouter();

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `há ${diffMins} min`;
        if (diffHours < 24) return `há ${diffHours}h`;
        return `há ${diffDays}d`;
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Leads Recentes</h3>
            <div className="bg-card rounded-xl border border-muted-foreground/30 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gray-200 dark:bg-muted/50 border-b border-muted-foreground/30">
                            <tr>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '25%' }}>Lead</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '25%' }}>Origem / Interesse</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '20%' }}>Responsável</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '15%' }}>Status</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center" style={{ width: '15%' }}>Criado em</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-muted-foreground/30">
                            {recentLeads.length > 0 ? (
                                recentLeads.map((lead) => (
                                    <tr 
                                        key={lead.id} 
                                        onClick={() => router.push(`/leads?id=${lead.id}`)}
                                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-4 py-5 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-[#404F4F] text-white dark:bg-white dark:text-[#404F4F] border border-border/10">
                                                    {getInitials(lead.name)}
                                                </div>
                                                <span className="font-bold text-foreground">{lead.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <span className="text-sm font-medium text-foreground">{lead.interest}</span>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <span className="text-sm font-medium text-foreground">{lead.assigned_to_name || 'Sem responsável'}</span>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <LeadTemperatureBadge lastInteractionAt={lead.last_interaction_at} size="sm" />
                                                <span 
                                                    className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase whitespace-nowrap inline-block"
                                                    style={lead.color ? { 
                                                        backgroundColor: lead.color,
                                                        color: ['#FFFFFF', '#FACC15', '#FDE047', '#FEF08A', '#FCD34D'].includes(lead.color.toUpperCase()) ? '#1a1a1a' : '#ffffff',
                                                    } : { 
                                                        backgroundColor: '#3b82f6',
                                                        color: '#ffffff'
                                                    }}
                                                >
                                                    {lead.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-sm text-muted-foreground font-medium">{formatDate(lead.created_at)}</span>
                                                <span className="text-[10px] font-medium text-muted-foreground/60">{getTimeAgo(lead.created_at)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center text-muted-foreground text-sm py-10 bg-card">
                                        Nenhum lead recente encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
