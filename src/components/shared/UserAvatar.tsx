'use client';

interface UserAvatarProps {
    src?: string | null;
    name?: string | null;
    className?: string;
}

export function UserAvatar({ src, name, className = "" }: UserAvatarProps) {
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'LA';


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

        </div>
    );
}
