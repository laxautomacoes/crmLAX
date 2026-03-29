'use server';

import { createClient } from '@/lib/supabase/server';

export async function getMarketingIntegrations(tenantId: string) {
    const supabase = await createClient();

    const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('tenant_id', tenantId);

    if (error) {
        console.error('Error fetching integrations:', error);
        return { integrations: [], error };
    }

    return { integrations, error: null };
}
