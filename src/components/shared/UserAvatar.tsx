'use client';

interface UserAvatarProps {
    src?: string | null;
    name?: string | null;
    role?: string | null;
    className?: string;
}

export function UserAvatar({ src, name, role, className = "" }: UserAvatarProps) {
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'LA';

    const isSuperAdmin = role === 'superadmin';

    return (
        <div className="relative inline-block">
            <div className={`rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium overflow-hidden shrink-0 ${className}`}>
                {src ? (
                    <img
                        src={src}
                        alt={name || 'Avatar'}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement?.classList.add('bg-primary');
                        }}
                    />
                ) : (
                    <span className="select-none">{initials}</span>
                )}
            </div>
            {isSuperAdmin && (
                <div className="absolute -bottom-1 -right-1 bg-secondary text-secondary-foreground text-[8px] font-black px-1 rounded-sm border border-primary shadow-sm uppercase tracking-tighter">
                    Admin
                </div>
            )}
        </div>
    );
}
