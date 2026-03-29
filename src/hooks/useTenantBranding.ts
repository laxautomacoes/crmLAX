'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseTenantBrandingOptions {
    systemOnly?: boolean;
    tenantId?: string;
}

export function useTenantBranding(options?: UseTenantBrandingOptions) {
    const [branding, setBranding] = useState<{ logo_full?: string; logo_height?: number; logo_icon?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBranding() {
            try {
                const supabase = createClient();

                // 0. Se um tenantId for fornecido, buscamos diretamente dele
                if (options?.tenantId) {
                    const { data: tenant } = await supabase
                        .from('tenants')
                        .select('branding')
                        .eq('id', options.tenantId)
                        .maybeSingle();

                    if (tenant?.branding) {
                        setBranding(tenant.branding as any);
                        setLoading(false);
                        return;
                    }
                }

                // 1. Se for systemOnly, buscamos direto o branding do sistema (primeiro tenant)
                if (options?.systemOnly) {
                    console.log('useTenantBranding: Fetching system branding only');
                    const { data: systemTenant } = await supabase
                        .from('tenants')
                        .select('branding')
                        .order('created_at', { ascending: true })
                        .limit(1)
                        .maybeSingle();

                    if (systemTenant?.branding) {
                        setBranding(systemTenant.branding as any);
                    }
                    setLoading(false);
                    return;
                }

                const hostname = window.location.hostname;
                const domainParts = hostname.split('.');
                let rootHostname = hostname;
                if (hostname.startsWith('www.')) {
                    rootHostname = hostname.substring(4);
                } else if (hostname.startsWith('crm.')) {
                    rootHostname = hostname.substring(4);
                }

                // 1. Tentar por custom domain
                const { data: tenantByDomain } = await supabase
                    .from('tenants')
                    .select('branding')
                    .eq('custom_domain', rootHostname)
                    .maybeSingle();

                if (tenantByDomain?.branding) {
                    setBranding(tenantByDomain.branding as any);
                    setLoading(false);
                    return;
                }

                // 2. Tentar por subdomínio
                const subdomain = domainParts.length >= 2 ? domainParts[0] : null;

                if (subdomain && subdomain !== 'www' && subdomain !== 'app' && !hostname.includes('localhost')) {
                    console.log('useTenantBranding: Checking subdomain', subdomain);
                    const { data: tenantBySubdomain } = await supabase
                        .from('tenants')
                        .select('branding')
                        .eq('slug', subdomain)
                        .maybeSingle();

                    if (tenantBySubdomain?.branding) {
                        setBranding(tenantBySubdomain.branding as any);
                        setLoading(false);
                        return;
                    }
                }

                // 3. Fallback para System Branding se não encontrar nada específico
                // Buscamos o primeiro tenant criado que geralmente é o do sistema/master
                const { data: systemTenant } = await supabase
                    .from('tenants')
                    .select('branding')
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (systemTenant?.branding) {
                    setBranding(systemTenant.branding as any);
                }
            } catch (error) {
                console.error('Error fetching tenant branding:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchBranding();
    }, [options?.systemOnly, options?.tenantId]);

    return { branding, loading };
}
