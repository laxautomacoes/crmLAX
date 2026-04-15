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
    // 1. Tentar busca direta pelo hostname (ex: leoacosta.online)
    const { data } = await supabase
        .from('tenants')
        .select('id, slug, name, is_system, custom_domain, status, custom_domain_verified, custom_domain_crm_verified')
        .eq('custom_domain', hostname)
        .maybeSingle();

    if (data) return data;

    // 2. Se falhar, tentar remover prefixos comuns (www. ou crm.)
    let rootHostname = hostname;
    if (hostname.startsWith('www.')) {
        rootHostname = hostname.substring(4);
    } else if (hostname.startsWith('crm.')) {
        rootHostname = hostname.substring(4);
    }

    if (rootHostname !== hostname) {
        const { data: rootData } = await supabase
            .from('tenants')
            .select('id, slug, name, is_system, custom_domain, status, custom_domain_verified, custom_domain_crm_verified')
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
        .select('id, slug, name, is_system, custom_domain, status, branding, custom_domain_verified, custom_domain_crm_verified, plan_type')
        .eq('slug', slug)
        .single();

    return data || null;
}

async function getTenantBySubdomain(
    supabase: SupabaseClient,
    hostname: string
): Promise<TenantInfo | null> {
    const domainParts = hostname.split('.');
    const baseDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost').split(':')[0];

    if (domainParts.length < 2) return null;

    const subdomain = domainParts[0];
    const domain = domainParts.slice(1).join('.').split(':')[0];

    if (domain !== baseDomain || !subdomain || subdomain === 'www' || subdomain === 'app' || subdomain === 'crm') {
        return null;
    }

    const { data } = await supabase
        .from('tenants')
        .select('id, slug, name, is_system, custom_domain, status, custom_domain_verified, custom_domain_crm_verified')
        .eq('slug', subdomain)
        .single();

    return data || null;
}

export async function getTenantByUserId(supabase: SupabaseClient, userId: string): Promise<TenantInfo | null> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();

    if (!profile?.tenant_id) return null;

    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug, name, is_system, custom_domain, status, custom_domain_verified, custom_domain_crm_verified')
        .eq('id', profile.tenant_id)
        .single();

    return tenant || null;
}
export async function getSystemTenant(supabase: SupabaseClient): Promise<TenantInfo | null> {
    const { data } = await supabase
        .from('tenants')
        .select('id, slug, name, is_system, custom_domain, status, branding, custom_domain_verified, custom_domain_crm_verified, plan_type')
        .eq('is_system', true)
        .maybeSingle();

    return data || null;
}
