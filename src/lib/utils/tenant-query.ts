import { createClient } from '@/lib/supabase/server';
import { TenantInfo } from './tenant-types';
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
    // 1. Tentar busca direta pelo hostname (ex: leoacosta.online ou www.leoacosta.online)
    const { data } = await supabase
        .from('tenants')
        .select('id, slug, name, custom_domain, custom_domain_verified')
        .eq('custom_domain', hostname)
        .maybeSingle();

    if (data) return data;

    // 2. Se falhar e começar com www., tentar sem o www.
    if (hostname.startsWith('www.')) {
        const rootHostname = hostname.substring(4);
        const { data: rootData } = await supabase
            .from('tenants')
            .select('id, slug, name, custom_domain, custom_domain_verified')
            .eq('custom_domain', rootHostname)
            .maybeSingle();
        
        if (rootData) return rootData;
    }

    return null;
}

export async function getTenantBySlug(slug: string): Promise<TenantInfo | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('tenants')
        .select('id, slug, name, custom_domain, branding, custom_domain_verified, plan_type')
        .eq('slug', slug)
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

    if (domain !== baseDomain || !subdomain || subdomain === 'www' || subdomain === 'app' || subdomain === 'crm') {
        return null;
    }

    const { data } = await supabase
        .from('tenants')
        .select('id, slug, name, custom_domain, custom_domain_verified')
        .eq('slug', subdomain)
        .single();

    return data || null;
}

