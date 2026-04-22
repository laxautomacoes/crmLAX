export default function FinanceiroLoading() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-pulse">
            {/* Header skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="h-8 w-48 bg-muted rounded-lg" />
                    <div className="h-4 w-72 bg-muted rounded-lg mt-2" />
                </div>
                <div className="h-10 w-40 bg-muted rounded-lg" />
            </div>

            {/* KPI skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card border border-border rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between">
                            <div className="h-10 w-10 bg-muted rounded-lg" />
                            <div className="h-6 w-16 bg-muted rounded-full" />
                        </div>
                        <div className="h-4 w-20 bg-muted rounded" />
                        <div className="h-8 w-32 bg-muted rounded" />
                    </div>
                ))}
            </div>

            {/* Chart skeleton */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <div className="h-4 w-32 bg-muted rounded mb-6" />
                <div className="h-48 bg-muted/50 rounded-lg" />
            </div>

            {/* Table skeleton */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="h-12 bg-muted/30 border-b border-border" />
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 border-b border-border/50 px-6 flex items-center gap-6">
                        <div className="h-4 w-20 bg-muted rounded" />
                        <div className="h-4 w-40 bg-muted rounded flex-1" />
                        <div className="h-4 w-16 bg-muted rounded" />
                        <div className="h-6 w-16 bg-muted rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}
