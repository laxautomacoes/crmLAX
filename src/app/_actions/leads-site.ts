'use server';

import { createClient } from '@/lib/supabase/server';
import { getTenantFromHeaders } from '@/lib/utils/tenant';
import { createLead } from './leads';

export async function createLeadFromSite(data: {
    name: string;
    phone: string;
    email?: string;
    asset_id?: string;
}) {
    const tenant = await getTenantFromHeaders();
    if (!tenant) return { error: 'Tenant context not found' };

    const supabase = await createClient();

    // 1. Buscar o primeiro estágio (Pipeline inicial)
    const { data: stage } = await supabase
        .from('lead_stages')
        .select('id')
        .eq('tenant_id', tenant.id)
        .order('order_index', { ascending: true })
        .limit(1)
        .single();

    // 2. Criar o lead usando a lógica centralizada em leads.ts
    return await createLead(tenant.id, {
        ...data,
        stage_id: stage?.id,
        interest: data.asset_id ? 'Interesse em Imóvel' : 'Contato Site'
    });
}
