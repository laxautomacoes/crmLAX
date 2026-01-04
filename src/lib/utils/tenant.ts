import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { getTenantByHostname as queryTenantByHostname } from './tenant-query';

export interface TenantInfo {
    id: string;
    slug: string;
    name: string;
    custom_domain?: string | null;
    branding?: Record<string, any> | null;
}

export async function getTenantFromHeaders(): Promise<TenantInfo | null> {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id');
    const tenantSlug = headersList.get('x-tenant-slug');
    
    if (!tenantId || !tenantSlug) {
        return null;
    }
    
    const supabase = await createClient();
    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug, name, custom_domain, branding')
        .eq('id', tenantId)
        .single();
    
    return tenant;
}

export async function getTenantBySlug(slug: string): Promise<TenantInfo | null> {
    const supabase = await createClient();
    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug, name, custom_domain, branding')
        .eq('slug', slug)
        .single();
    
    return tenant;
}

export async function getTenantWhatsApp(tenantId: string): Promise<string | null> {
    const supabase = await createClient();
    
    // Buscar do tenant branding primeiro
    const { data: tenant } = await supabase
        .from('tenants')
        .select('branding')
        .eq('id', tenantId)
        .single();
    
    if (tenant?.branding?.whatsapp) {
        return tenant.branding.whatsapp;
    }
    
    // Se não tiver no branding, buscar do perfil admin
    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('whatsapp_number')
        .eq('tenant_id', tenantId)
        .in('role', ['superadmin', 'admin'])
        .limit(1)
        .single();
    
    return adminProfile?.whatsapp_number || null;
}

export { queryTenantByHostname as getTenantByHostname };

export function isPublicRoute(pathname: string): boolean {
    const publicRoutes = [
        '/login',
        '/register',
        '/auth',
        '/forgot-password',
        '/reset-password',
        '/site',
    ];
    
    return publicRoutes.some(route => pathname.startsWith(route)) ||
           pathname.startsWith('/api/v1/webhooks');
}

export function isSiteRequest(pathname: string): boolean {
    return pathname.startsWith('/site') || 
           pathname.startsWith('/api/v1/webhooks');
}
