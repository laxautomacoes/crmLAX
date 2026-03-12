import Link from 'next/link';

interface RecentLeadsListProps {
    recentLeads: Array<{
        id: string
        name: string
        interest: string
        status: string
        created_at: string
    }>
}

export default function RecentLeadsList({ recentLeads }: RecentLeadsListProps) {
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
        <div className="bg-card p-6 rounded-lg shadow-sm border border-muted-foreground/30">
            <h3 className="text-lg font-bold text-foreground mb-6">Leads Recentes</h3>
            <div className="space-y-4">
                {recentLeads.length > 0 ? (
                    recentLeads.map((lead) => (
                        <Link 
                            key={lead.id} 
                            href={`/leads?id=${lead.id}`}
                            className="flex items-center justify-between p-4 border border-muted-foreground/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer block"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold text-sm">
                                    {getInitials(lead.name)}
                                </div>
                                <div className="flex flex-col">
                                    <p className="font-semibold text-foreground leading-none mb-1">{lead.name}</p>
                                    <p className="text-xs text-muted-foreground">{lead.interest}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-xs font-bold text-green-600 mb-1">{lead.status}</span>
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[10px] text-muted-foreground/60 leading-none">{formatDate(lead.created_at)}</span>
                                    <span className="text-[10px] font-medium text-muted-foreground leading-none">{getTimeAgo(lead.created_at)}</span>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        Nenhum lead recente encontrado
                    </div>
                )}
            </div>
        </div>
    );
}
