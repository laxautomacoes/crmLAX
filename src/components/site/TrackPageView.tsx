'use client';

import { useEffect, useRef } from 'react';

interface TrackPageViewProps {
    tenantId: string;
    propertyId?: string;
    brokerId?: string;
    propertyTitle?: string;
}

/**
 * Componente client-side para rastreamento de page views no site vitrine.
 * Envia um beacon para a API de analytics ao montar.
 * Usa `sendBeacon` quando disponível para não impactar performance.
 * Deduplica envios com um ref para evitar double-tracking em strict mode.
 */
export function TrackPageView({ tenantId, propertyId, brokerId, propertyTitle }: TrackPageViewProps) {
    const tracked = useRef(false);

    useEffect(() => {
        // Evitar double tracking em React strict mode
        if (tracked.current) return;
        tracked.current = true;

        // Não trackear bots
        const isBot = /bot|crawl|spider|slurp|googlebot|bingbot|yandex/i.test(navigator.userAgent);
        if (isBot) return;

        const payload = JSON.stringify({
            tenant_id: tenantId,
            property_id: propertyId || null,
            broker_id: brokerId || null,
            page_path: window.location.pathname + window.location.search,
            page_title: propertyTitle || document.title,
            referrer: document.referrer || null,
        });

        // Preferir sendBeacon (non-blocking) quando disponível
        // Wrap em Blob para garantir Content-Type application/json
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/analytics/track', blob);
        } else {
            // Fallback para fetch
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true, // Permite completar mesmo se a página fechar
            }).catch(() => {
                // Silenciar erros de tracking — não deve impactar UX
            });
        }
    }, [tenantId, propertyId, brokerId, propertyTitle]);

    return null; // Componente invisível
}
