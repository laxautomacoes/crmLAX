export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* KPIs Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card rounded-xl p-6 border border-border">
                        <div className="h-4 bg-muted rounded w-24 mb-3" />
                        <div className="h-8 bg-muted rounded w-16 mb-2" />
                        <div className="h-3 bg-muted rounded w-12" />
                    </div>
                ))}
            </div>

            {/* Funil Skeleton */}
            <div className="bg-card rounded-xl p-6 border border-border">
                <div className="h-5 bg-muted rounded w-40 mb-4" />
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex-1 h-24 bg-muted rounded-lg" />
                    ))}
                </div>
            </div>

            {/* Leads Recentes Skeleton */}
            <div className="bg-card rounded-xl p-6 border border-border">
                <div className="h-5 bg-muted rounded w-36 mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-muted rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted rounded w-32" />
                                <div className="h-3 bg-muted rounded w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
