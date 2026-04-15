export default function PropertiesLoading() {
    return (
        <div className="space-y-4 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-7 bg-muted rounded w-28" />
                <div className="flex gap-2">
                    <div className="h-10 bg-muted rounded w-28" />
                    <div className="h-10 bg-muted rounded w-36" />
                </div>
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                        <div className="h-48 bg-muted" />
                        <div className="p-4 space-y-3">
                            <div className="h-5 bg-muted rounded w-3/4" />
                            <div className="h-4 bg-muted rounded w-1/2" />
                            <div className="flex justify-between items-center">
                                <div className="h-6 bg-muted rounded w-24" />
                                <div className="h-6 bg-muted rounded w-16" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
