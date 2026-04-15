export default function LeadsLoading() {
    return (
        <div className="space-y-4 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-7 bg-muted rounded w-32" />
                <div className="h-10 bg-muted rounded w-36" />
            </div>

            {/* Pipeline Skeleton */}
            <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="min-w-[280px] bg-card rounded-xl border border-border p-4">
                        <div className="h-5 bg-muted rounded w-24 mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3].map((j) => (
                                <div key={j} className="bg-muted rounded-lg h-20" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
