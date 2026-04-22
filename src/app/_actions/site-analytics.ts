'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from './profile';

/**
 * Busca métricas analíticas do site vitrine para o tenant do usuário logado.
 * Retorna dados agregados para exibição no dashboard.
 */
export async function getSiteAnalytics(tenantId: string, days: number = 30) {
    const supabase = await createClient();
    const { profile } = await getProfile();

    if (!profile) return { success: false, error: 'Não autenticado' };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
        // Total de page views
        const { count: totalViews } = await supabase
            .from('site_page_views')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate.toISOString());

        // Visitantes únicos
        const { data: uniqueVisitors } = await supabase
            .from('site_page_views')
            .select('visitor_id')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate.toISOString());

        const uniqueCount = new Set(uniqueVisitors?.map((v: { visitor_id: string }) => v.visitor_id)).size;

        // Top imóveis por views
        const { data: topProperties } = await supabase
            .from('site_page_views')
            .select('property_id, page_title')
            .eq('tenant_id', tenantId)
            .not('property_id', 'is', null)
            .gte('created_at', startDate.toISOString());

        // Agregar top properties manualmente
        const propertyViews: Record<string, { property_id: string; title: string; views: number }> = {};
        topProperties?.forEach((pv: any) => {
            if (!propertyViews[pv.property_id]) {
                propertyViews[pv.property_id] = {
                    property_id: pv.property_id,
                    title: pv.page_title || 'Sem título',
                    views: 0,
                };
            }
            propertyViews[pv.property_id].views++;
        });

        const topPropertyList = Object.values(propertyViews)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        // Distribuição por dispositivo
        const { data: deviceData } = await supabase
            .from('site_page_views')
            .select('device_type')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate.toISOString());

        const deviceBreakdown: Record<string, number> = {};
        deviceData?.forEach((d: any) => {
            const type = d.device_type || 'unknown';
            deviceBreakdown[type] = (deviceBreakdown[type] || 0) + 1;
        });

        // Views por dia (para gráfico)
        const { data: dailyData } = await supabase
            .from('site_page_views')
            .select('created_at')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        const dailyViews: Record<string, number> = {};
        dailyData?.forEach((d: any) => {
            const day = new Date(d.created_at).toISOString().split('T')[0];
            dailyViews[day] = (dailyViews[day] || 0) + 1;
        });

        // Top referrers
        const { data: referrerData } = await supabase
            .from('site_page_views')
            .select('referrer')
            .eq('tenant_id', tenantId)
            .not('referrer', 'is', null)
            .neq('referrer', '')
            .gte('created_at', startDate.toISOString());

        const referrerCounts: Record<string, number> = {};
        referrerData?.forEach((r: any) => {
            try {
                const hostname = new URL(r.referrer).hostname;
                referrerCounts[hostname] = (referrerCounts[hostname] || 0) + 1;
            } catch {
                referrerCounts[r.referrer] = (referrerCounts[r.referrer] || 0) + 1;
            }
        });

        const topReferrers = Object.entries(referrerCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([source, views]) => ({ source, views }));

        // Views por corretor
        const { data: brokerData } = await supabase
            .from('site_page_views')
            .select('broker_id')
            .eq('tenant_id', tenantId)
            .not('broker_id', 'is', null)
            .gte('created_at', startDate.toISOString());

        const brokerCounts: Record<string, number> = {};
        brokerData?.forEach((b: any) => {
            brokerCounts[b.broker_id] = (brokerCounts[b.broker_id] || 0) + 1;
        });

        return {
            success: true,
            data: {
                totalViews: totalViews || 0,
                uniqueVisitors: uniqueCount,
                topProperties: topPropertyList,
                deviceBreakdown,
                dailyViews,
                topReferrers,
                brokerViews: brokerCounts,
                period: `${days} dias`,
            },
        };
    } catch (error: any) {
        console.error('[Analytics] Error fetching analytics:', error);
        return { success: false, error: error.message };
    }
}
