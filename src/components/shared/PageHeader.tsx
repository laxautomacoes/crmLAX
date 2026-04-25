interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-center md:text-left">
                <h1 className="text-2xl font-bold text-foreground">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm text-muted-foreground mt-4 md:mt-1">
                        {subtitle}
                    </p>
                )}
            </div>

            <div className="h-px bg-foreground/25 w-full md:hidden mt-2 mb-4" />

            {children && (
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:gap-3 w-full md:w-auto transition-all animate-in fade-in slide-in-from-right-4 duration-500">
                    {children}
                </div>
            )}
        </div>
    );
}
