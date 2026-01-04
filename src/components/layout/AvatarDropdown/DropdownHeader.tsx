import { UserAvatar } from '@/components/shared/UserAvatar';

interface DropdownHeaderProps {
    profile: any;
}

export function DropdownHeader({ profile }: DropdownHeaderProps) {
    return (
        <div className="flex items-center gap-4 p-5 border-b border-border bg-card">
            <UserAvatar
                src={profile?.avatar_url}
                name={profile?.full_name}
                className="h-12 w-12 text-lg font-bold"
            />
            <div className="flex flex-col min-w-0">
                <p className="text-base font-bold text-foreground truncate">
                    {profile?.full_name}
                </p>
                <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#00B087] bg-[#00B087]/10 px-1.5 py-0.5 rounded w-fit mb-1">
                        {profile?.role === 'superadmin' ? 'Super Administrador' :
                            profile?.role === 'admin' ? 'Administrador' : 'Colaborador'}
                    </span>
                    <p className="text-sm text-muted-foreground">
                        {profile?.email}
                    </p>
                </div>
            </div>
        </div>
    );
}
