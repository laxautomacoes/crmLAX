'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function DynamicFavicon() {
    useEffect(() => {
        const updateFavicon = (iconUrl?: string) => {
            let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            // Adicionar timestamp para evitar cache do navegador no favicon
            const finalUrl = iconUrl ? (iconUrl.includes('?') ? `${iconUrl}&t=${Date.now()}` : `${iconUrl}?t=${Date.now()}`) : '/logo-icon.png';
            link.href = finalUrl;
        };

        const loadInitialBranding = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tenant_id')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile?.tenant_id) {
                    const { data: tenant } = await supabase
                        .from('tenants')
                        .select('branding')
                        .eq('id', profile.tenant_id)
                        .maybeSingle();

                    if (tenant?.branding && (tenant.branding as any).logo_icon) {
                        updateFavicon((tenant.branding as any).logo_icon);
                    }
                }
            }
        };

        const handleBrandingUpdate = (event: any) => {
            if (event.detail && event.detail.logo_icon) {
                updateFavicon(event.detail.logo_icon);
            } else if (event.detail && event.detail.logo_icon === undefined) {
                updateFavicon();
            }
        };

        loadInitialBranding();
        window.addEventListener('branding-updated', handleBrandingUpdate);
        
        return () => window.removeEventListener('branding-updated', handleBrandingUpdate);
    }, []);

    return null;
}
