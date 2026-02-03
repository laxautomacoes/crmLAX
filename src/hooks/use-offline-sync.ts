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
                    const items = [];

                    // 1. Imagens (Top 3)
                    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
                        const imageUrls = p.images.slice(0, 3).map((imgUrl: string) => {
                            if (imgUrl.startsWith('http')) return imgUrl;
                            return supabase.storage.from('properties').getPublicUrl(imgUrl).data.publicUrl;
                        });
                        items.push(...imageUrls);
                    }

                    // 2. Documentos (Todos os documentos para garantir acesso)
                    // Assumindo estrutura similar: array de strings (paths ou urls)
                    if (p.documents && Array.isArray(p.documents) && p.documents.length > 0) {
                        const docUrls = p.documents.map((docUrl: string) => {
                            if (docUrl.startsWith('http')) return docUrl;
                            return supabase.storage.from('properties').getPublicUrl(docUrl).data.publicUrl;
                        });
                        items.push(...docUrls);
                    }

                    return items;
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
