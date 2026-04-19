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
    }

    const results = [...(integrations || [])];

    // Se houver token permanente no .env, injetamos como uma integração ativa para validação
    if (process.env.META_PERMANENT_TOKEN && process.env.META_INSTAGRAM_ACCOUNT_ID) {
        const metaExists = results.some(i => i.provider === 'instagram' && i.status === 'active');
        if (!metaExists) {
            results.push({
                id: 'virtual-meta',
                tenant_id: tenantId,
                provider: 'instagram',
                status: 'active',
                credentials: {
                    access_token: process.env.META_PERMANENT_TOKEN,
                    account_id: process.env.META_INSTAGRAM_ACCOUNT_ID,
                    page_name: 'Conta do Sistema (Meta App)'
                },
                created_at: new Date().toISOString()
            });
        }
    }

    return { integrations: results, error: null };
}
