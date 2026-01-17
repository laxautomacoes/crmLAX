'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Gera um convite para um novo usuário
 */
export async function createInvitation(email: string, role: 'admin' | 'user' = 'user') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // Obter tenant_id do admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        return { error: 'Apenas administradores podem convidar usuários' }
    }

    const token = require('crypto').randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 dias de validade

    const { data, error } = await supabase
        .from('invitations')
        .insert({
            tenant_id: profile.tenant_id,
            email,
            role,
            token,
            expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating invitation:', error)
        return { error: error.message }
    }

    revalidatePath('/settings/team')
    return { success: true, invitation: data }
}

/**
 * Busca detalhes de um convite pelo token
 */
export async function getInvitationByToken(token: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('invitations')
        .select('*, tenants(name)')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single()

    if (error || !data) {
        return { error: 'Convite inválido ou expirado' }
    }

    return { invitation: data }
}

/**
 * Lista convites pendentes do tenant
 */
export async function listInvitations() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }

    const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return { invitations: data }
}
