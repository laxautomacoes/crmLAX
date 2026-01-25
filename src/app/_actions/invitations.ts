'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { sendInvitationEmail } from '@/lib/resend'
import { sendInvitationWhatsApp } from '@/lib/whatsapp'

/**
 * Gera um convite para um novo usuário
 */
export async function createInvitation(
    email: string,
    role: 'admin' | 'user' = 'user',
    name?: string,
    permissions?: Record<string, boolean>,
    phone?: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // Obter tenant_id e nome do admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role, tenants(name)')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin' && profile.role !== 'super administrador')) {
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
            name,
            phone,
            permissions,
            token,
            expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating invitation:', error)
        return { error: error.message }
    }

    // Enviar notificações
    const inviteLink = `${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'http://localhost:3000'}/register?token=${data.token}`
    const tenantName = profile.tenants?.name || 'CRM LAX'

    await Promise.allSettled([
        sendInvitationEmail(email, inviteLink, tenantName),
        phone ? sendInvitationWhatsApp(phone, inviteLink, tenantName) : Promise.resolve()
    ])

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

/**
 * Atualiza um convite (apenas admin)
 */
export async function updateInvitation(
    id: string,
    updates: {
        role?: 'admin' | 'user',
        expires_at?: string,
        name?: string,
        email?: string,
        phone?: string,
        permissions?: Record<string, boolean>
    }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // Verificar se é admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin' && profile.role !== 'super administrador')) {
        return { error: 'Apenas administradores podem gerenciar convites' }
    }

    const { error } = await supabase
        .from('invitations')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id) // Segurança extra

    if (error) return { error: error.message }

    revalidatePath('/settings/team')
    return { success: true }
}

/**
 * Exclui um convite (apenas admin)
 */
export async function deleteInvitation(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // Verificar se é admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin' && profile.role !== 'super administrador')) {
        return { error: 'Apenas administradores podem gerenciar convites' }
    }

    const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)

    if (error) return { error: error.message }

    revalidatePath('/settings/team')
    return { success: true }
}
