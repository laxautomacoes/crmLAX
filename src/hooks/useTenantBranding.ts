'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseTenantBrandingOptions {
    systemOnly?: boolean;
}

export function useTenantBranding(options?: UseTenantBrandingOptions) {
    const [branding, setBranding] = useState<{ logo_full?: string; logo_height?: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBranding() {
            try {
                const supabase = createClient();

                // Se for systemOnly, buscamos direto o branding do sistema/superadmin
                if (options?.systemOnly) {
                    console.log('useTenantBranding: Fetching system branding only');
                    const { data: systemTenant } = await supabase
                        .from('tenants')
                        .select('branding, profiles!inner(role)')
                        .eq('profiles.role', 'superadmin')
                        .limit(1)
                        .maybeSingle();

                    if (systemTenant?.branding) {
                        setBranding(systemTenant.branding as any);
                    } else {
                        // Fallback para o primeiro tenant se não houver superadmin
                        const { data: firstTenant } = await supabase
                            .from('tenants')
                            .select('branding')
                            .order('created_at', { ascending: true })
                            .limit(1)
                            .maybeSingle();
                        if (firstTenant?.branding) setBranding(firstTenant.branding as any);
                    }
                    setLoading(false);
                    return;
                }

                const hostname = window.location.hostname;
                const domainParts = hostname.split('.');
                const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
                const baseDomain = rootDomain.split(':')[0];

                // 1. Tentar por custom domain
                const { data: tenantByDomain } = await supabase
                    .from('tenants')
                    .select('branding')
                    .eq('custom_domain', hostname)
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
                const { data: systemTenant } = await supabase
                    .from('tenants')
                    .select('branding, profiles!inner(role)')
                    .eq('profiles.role', 'superadmin')
                    .limit(1)
                    .maybeSingle();
                
                if (systemTenant?.branding) {
                    setBranding(systemTenant.branding as any);
                } else {
                    const { data: firstTenant } = await supabase
                        .from('tenants')
                        .select('branding')
                        .order('created_at', { ascending: true })
                        .limit(1)
                        .maybeSingle();
                    if (firstTenant?.branding) setBranding(firstTenant.branding as any);
                }
            } catch (error) {
                console.error('Error fetching tenant branding:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchBranding();
    }, [options?.systemOnly]);

    return { branding, loading };
}
