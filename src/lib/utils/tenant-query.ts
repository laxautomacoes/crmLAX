import { createClient } from '@/lib/supabase/server';
import { TenantInfo } from './tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getTenantByHostname(hostname: string): Promise<TenantInfo | null> {
    const supabase = await createClient();
    const cleanHostname = hostname.split(':')[0];

    // Caso 1: Custom domain
    const tenantByDomain = await getTenantByCustomDomain(supabase, cleanHostname);
    if (tenantByDomain) return tenantByDomain;

    // Caso 2: Subdomínio
    return await getTenantBySubdomain(supabase, cleanHostname);
}

async function getTenantByCustomDomain(
    supabase: SupabaseClient,
    hostname: string
): Promise<TenantInfo | null> {
    const { data } = await supabase
        .from('tenants')
        .select('id, slug, name, custom_domain')
        .eq('custom_domain', hostname)
        .single();

    return data || null;
}

async function getTenantBySubdomain(
    supabase: SupabaseClient,
    hostname: string
): Promise<TenantInfo | null> {
    const domainParts = hostname.split('.');
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const baseDomain = rootDomain.split(':')[0];

    if (domainParts.length < 2) return null;

    const subdomain = domainParts[0];
    const domain = domainParts.slice(1).join('.');

    if (domain !== baseDomain || !subdomain || subdomain === 'www' || subdomain === 'app') {
        return null;
    }

    const { data } = await supabase
        .from('tenants')
        .select('id, slug, name, custom_domain')
        .eq('slug', subdomain)
        .single();

    return data || null;
}

