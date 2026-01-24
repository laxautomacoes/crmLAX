'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore } from 'next/cache'

export async function getProfile() {
    unstable_noStore()
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { error: 'Not authenticated' }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

        return {
            profile: {
                ...profile,
                id: user.id,
                email: user.email || 'leocrm@lax.com',
                full_name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Léo Acosta',
                role: profile?.role || 'user',
                avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture
            }
        }
    } catch (error) {
        console.error('Error in getProfile:', error)
        return {
            profile: {
                full_name: 'Léo Acosta',
                email: 'leocrm@lax.com',
                role: 'user'
            }
        }
    }
}

export async function updateProfileAvatar(avatarUrl: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

    if (error) {
        console.error('Error updating profile avatar:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function updateProfile(data: { full_name: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Busca o perfil atual para verificar o papel (role) e o tenant_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .maybeSingle()

    // Atualiza a tabela profiles
    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: data.full_name
        })
        .eq('id', user.id)

    if (error) {
        console.error('Error updating profile:', error)
        return { error: error.message }
    }

    // Se o usuário for admin ou superadmin, atualiza também o nome na tabela tenants
    if (profile && (profile.role === 'admin' || profile.role === 'superadmin') && profile.tenant_id) {
        const { error: tenantError } = await supabase
            .from('tenants')
            .update({ name: data.full_name })
            .eq('id', profile.tenant_id)

        if (tenantError) {
            console.error('Error updating tenant name:', tenantError)
            // Não bloqueamos o processo se a atualização do tenant falhar (pode ser RLS),
            // mas logamos para investigação.
        }
    }

    // Sincroniza com o Auth do Supabase (para aparecer no Dashboard do Supabase)
    const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: data.full_name }
    })

    if (authError) {
        console.error('Error updating auth metadata:', authError)
    }

    revalidatePath('/dashboard')
    return { success: true }
}
