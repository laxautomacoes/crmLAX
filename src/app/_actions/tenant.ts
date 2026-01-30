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
