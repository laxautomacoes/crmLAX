'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getTenantByUserId(userId: string) {
    const supabase = await createClient()

    // Buscar o perfil para pegar o tenant_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle()

    if (!profile?.tenant_id) return null

    // Buscar o tenant para pegar o slug
    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug, name')
        .eq('id', profile.tenant_id)
        .maybeSingle()

    return tenant
}

export async function updateTenantBranding(tenantId: string, brandingData: any) {
    const supabase = await createClient()

    // Buscar branding atual para fazer merge
    const { data: currentTenant } = await supabase
        .from('tenants')
        .select('branding')
        .eq('id', tenantId)
        .single()

    const newBranding = {
        ...(currentTenant?.branding || {}),
        ...brandingData
    }

    const { error } = await supabase
        .from('tenants')
        .update({ branding: newBranding })
        .eq('id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/')
    
    return { success: true }
}
export async function updateTenantDomain(tenantId: string, domain: string | null) {
    const supabase = await createClient()

    // Validação básica de formato se não for null (suportando TLDs longos como .photography, .marketing, .online)
    if (domain && !/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,14}(:[0-9]{1,5})?(\/.*)?$/.test(domain)) {
        return { success: false, error: 'Formato de domínio inválido.' }
    }

    const { error } = await supabase
        .from('tenants')
        .update({ 
            custom_domain: domain,
            custom_domain_verified: false, // Resetar verificação ao mudar
            custom_domain_updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    
    return { success: true }
}

export async function verifyTenantDomain(tenantId: string) {
    const supabase = await createClient()

    const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

    if (!tenant?.custom_domain) return { success: false, error: 'Nenhum domínio configurado.' }

    try {
        // Verificação real via Cloudflare DNS-over-HTTPS
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${tenant.custom_domain}&type=CNAME`, {
            headers: { 'Accept': 'application/dns-json' }
        });
        const dnsData = await response.json();

        // Verificar se existe um registro CNAME e se o valor é o esperado
        const hasValidCname = dnsData.Answer?.some((ans: any) => 
            ans.type === 5 && (ans.data === 'cname.vercel-dns.com.' || ans.data === 'cname.vercel-dns.com')
        );

        if (!hasValidCname) {
            return { 
                success: false, 
                error: 'Registro CNAME não encontrado ou ainda não propagado. Verifique as configurações no seu provedor.' 
            }
        }
        
        const { error } = await supabase
            .from('tenants')
            .update({ 
                custom_domain_verified: true,
                custom_domain_updated_at: new Date().toISOString()
            })
            .eq('id', tenantId)

        if (error) return { success: false, error: error.message }

        revalidatePath('/settings')
        return { success: true }
    } catch (error: any) {
        console.error('DNS Verification Error:', error);
        return { success: false, error: 'Erro ao conectar com o serviço de verificação DNS.' }
    }
}
