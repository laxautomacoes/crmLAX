'use client';

import { Lock } from 'lucide-react';

interface InvitationPermissionsProps {
    role: 'admin' | 'user';
    permissions: Record<string, boolean>;
    onToggle: (key: string) => void;
}

const permissionLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    leads: 'Leads',
    clients: 'Clientes',
    properties: 'Imóveis',
    calendar: 'Agenda',
    reports: 'Relatórios',
    settings: 'Configurações'
};

export function InvitationPermissions({ role, permissions, onToggle }: InvitationPermissionsProps) {
    return (
        <div className="bg-muted/30 p-3 rounded-xl border border-border">
            <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Permissões da Página
            </h4>
            <div className="grid grid-cols-2 gap-2">
                {Object.entries(permissionLabels).map(([key, label]) => (
                    <label
                        key={key}
                        className={`flex items-center gap-2 text-xs p-1 rounded-lg transition-colors cursor-pointer ${role === 'admin' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}`}
                    >
                        <input
                            type="checkbox"
                            checked={permissions[key]}
                            onChange={() => onToggle(key)}
                            disabled={role === 'admin'}
                            className="rounded border-gray-300 text-secondary focus:ring-secondary w-3.5 h-3.5"
                        />
                        <span className="font-medium">{label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
