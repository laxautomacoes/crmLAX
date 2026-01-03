'use client';

interface DropdownHeaderProps {
    profile: any;
}

export function DropdownHeader({ profile }: DropdownHeaderProps) {
    const initials = profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'LA';

    return (
        <div className="flex items-center gap-4 p-5 border-b border-gray-100 bg-white">
            <div className="h-12 w-12 rounded-full bg-[#404F4F] flex flex-shrink-0 items-center justify-center text-white font-bold text-lg overflow-hidden">
                {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                    <span>{initials}</span>
                )}
            </div>
            <div className="flex flex-col min-w-0">
                <p className="text-base font-bold text-gray-900 truncate">
                    {profile?.full_name || 'Léo Acosta'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                    {profile?.email || 'leocrm@lax.com'}
                </p>
            </div>
        </div>
    );
}
