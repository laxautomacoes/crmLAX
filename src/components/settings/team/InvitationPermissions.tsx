'use client';

import { Lock } from 'lucide-react';
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox';

interface InvitationPermissionsProps {
    role: 'superadmin' | 'admin' | 'user' | 'contador' | 'advogado' | 'financeiro' | 'recursos_humanos';
    permissions: Record<string, boolean>;
    onToggle: (key: string) => void;
}

const permissionLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    leads: 'Leads',
    clients: 'Clientes',
    properties: 'Imóveis',
    proposals: 'Propostas',
    marketing: 'Marketing',
    site: 'Site',
    calendar: 'Agenda',
    notes: 'Notas',
    financeiro: 'Financeiro',
    reports: 'Relatórios',
    settings: 'Configurações'
};

export function InvitationPermissions({ role, permissions, onToggle }: InvitationPermissionsProps) {
    return (
        <div className="space-y-2">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">
                Permissões
            </h4>
            <div className="bg-muted/30 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(permissionLabels).map(([key, label]) => (
                        <FormCheckbox
                            key={key}
                            label={label}
                            checked={permissions[key]}
                            onChange={() => onToggle(key)}
                            disabled={role === 'admin'}
                            className={role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
