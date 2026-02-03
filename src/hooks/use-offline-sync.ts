import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { savePropertiesToOffline, getLastSyncTime } from '@/services/db';

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<number | null>(null);
    const [syncProgress, setSyncProgress] = useState(0);

    useEffect(() => {
        // Check initial online status
        setIsOnline(navigator.onLine);

        // Add listeners
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial load of last sync time
        getLastSyncTime().then(setLastSync);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const syncData = async () => {
        if (!isOnline) {
            alert("Você precisa estar online para sincronizar.");
            return;
        }

        try {
            setIsSyncing(true);
            setSyncProgress(10); // Inicio

            const supabase = createClient();

            // 1. Fetch Properties (Limit fields for performance if needed)
            // Ajuste: A tabela correta é 'assets', não 'properties'.
            // E as imagens estão na coluna 'images' (array de strings ou json), não em uma tabela relacionada.
            const { data: properties, error } = await supabase
                .from('assets')
                .select('*')
                .eq('status', 'Disponível'); // Filtrar apenas disponíveis

            if (error) throw error;

            setSyncProgress(50); // Dados baixados

            if (properties) {
                // 2. Save to IndexedDB
                await savePropertiesToOffline(properties);

                // 3. Cache Images Strategy
                const cache = await caches.open('offline-images');
                let processed = 0;

                const assetsToCache = properties.flatMap((p: any) => {
                    // A coluna images é um array de strings (urls ou paths)
                    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
                        return p.images.slice(0, 3).map((imgUrl: string) => {
                            // Se for URL completa, usa ela. Se for path, gera publica.
                            if (imgUrl.startsWith('http')) return imgUrl;
                            // Se não for http, assume que é path no bucket 'properties' (ou 'assets'?)
                            // Vamos tentar gerar url publica do bucket 'properties' por padrão
                            return supabase.storage.from('properties').getPublicUrl(imgUrl).data.publicUrl;
                        });
                    }
                    return [];
                });

                const uniqueUrls = [...new Set(assetsToCache)].filter((url): url is string => typeof url === 'string' && url.length > 0);
                const totalImages = uniqueUrls.length;

                if (totalImages > 0) {
                    await Promise.all(uniqueUrls.map(async (url) => {
                        try {
                            const response = await fetch(url, { mode: 'no-cors' });
                            if (response.type === 'opaque' || response.ok) {
                                await cache.put(url, response);
                            }
                        } catch (e) {
                            console.warn('Failed to cache image:', url);
                        }
                        processed++;
                        // Atualizar progresso proporcionalmente aos 50% restantes
                        setSyncProgress(50 + Math.floor((processed / totalImages) * 50));
                    }));
                }
            }

            const now = Date.now();
            setLastSync(now);
            setSyncProgress(100);

        } catch (error) {
            console.error("Erro na sincronização:", error);
            alert(`Erro ao sincronizar dados: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
        } finally {
            setIsSyncing(false);
        }
    };

    return { isOnline, isSyncing, lastSync, syncData, syncProgress };
}
