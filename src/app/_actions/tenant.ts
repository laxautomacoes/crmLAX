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

    // Validação básica de formato se não for null
    if (domain && !/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/.test(domain)) {
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

    // TODO: Integrar com API da Vercel para verificar status real
    // Por enquanto, simulamos uma verificação bem-sucedida se o domínio estiver preenchido
    // para que o usuário possa testar o fluxo básico.
    
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
}
