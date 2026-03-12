import { UserAvatar } from '@/components/shared/UserAvatar';

interface DropdownHeaderProps {
    profile: any;
}

export function DropdownHeader({ profile }: DropdownHeaderProps) {
    return (
        <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
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
                    <p className="text-sm text-muted-foreground">
                        {profile?.email}
                    </p>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-secondary-foreground bg-secondary px-1.5 py-0.5 rounded w-fit mt-1">
                        {['superadmin', 'super_admin', 'super administrador'].includes(profile?.role?.toLowerCase())
                            ? 'Super Administrador'
                            : (profile?.role?.toLowerCase() === 'admin' ? 'Administrador' : 'Colaborador')}
                    </span>
                </div>
            </div>
        </div>
    );
}
