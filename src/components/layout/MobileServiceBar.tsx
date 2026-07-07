'use client';

import { useState, useEffect } from 'react';
import { CloudDownload, RefreshCw, WifiOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { ServiceQueueToggle } from './ServiceQueueToggle';
import { useProfile } from './ProfileContext';

function SyncButtonMobile() {
    const { isOnline, isSyncing, syncData, syncProgress, lastSync } = useOfflineSync();
    const isSyncedRecently = lastSync && (Date.now() - lastSync < 3600000);

    if (!isOnline) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                <WifiOff size={14} />
                <span>Offline</span>
            </div>
        )
    }

    return (
        <button
            onClick={syncData}
            disabled={isSyncing}
            style={{
                backgroundColor: isSyncedRecently && !isSyncing ? '#3EBC79' : 'var(--secondary)',
                borderColor: isSyncedRecently && !isSyncing ? '#3EBC79' : 'var(--secondary)',
                color: isSyncedRecently && !isSyncing ? '#FFFFFF' : 'var(--secondary-foreground)'
            }}
            className={`
                flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-xs font-bold border shadow-sm active:scale-[0.98]
                ${!isSyncedRecently || isSyncing ? 'hover:opacity-90' : 'hover:brightness-110'}
            `}
            title={lastSync ? `Última sincronização: ${new Date(lastSync).toLocaleTimeString()}` : "Sincronizar dados para offline"}
        >
            {isSyncing ? (
                <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Sincronizando {syncProgress}%</span>
                </>
            ) : (
                <>
                    <CloudDownload size={14} />
                    <span>{isSyncedRecently ? 'Sincronizado' : 'Sincronizar'}</span>
                </>
            )}
        </button>
    )
}

export function MobileServiceBar() {
    const { profile, tenant } = useProfile();
    const companyName = tenant?.name || '';

    return (
        <div className="md:hidden flex flex-col items-center gap-4 px-4 py-5 -mx-4 -mt-4 mb-6 w-[calc(100%+2rem)] bg-card border-b border-border">
            {profile?.full_name && (
                <p className="text-sm text-muted-foreground">
                    Bem-vindo, <span className="font-semibold text-foreground">{profile.full_name}{companyName ? ` - ${profile.role?.toUpperCase() || ''}` : ''}</span>
                </p>
            )}
            <div className="flex items-center justify-center flex-wrap gap-3">
                <ServiceQueueToggle
                    initialStatus={profile?.is_active_for_service}
                    tenantId={profile?.tenant_id}
                    companyName={companyName}
                />
                <SyncButtonMobile />
            </div>
        </div>
    );
}
