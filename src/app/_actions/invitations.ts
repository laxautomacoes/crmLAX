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
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role, tenants(name)')
        .eq('id', user.id)
        .maybeSingle()

    const userRole = profile?.role?.toLowerCase();
    const allowedRoles = ['admin', 'superadmin', 'super_admin', 'super administrador'];

    if (profileError || !profile || !allowedRoles.includes(userRole)) {
        return { error: 'Apenas administradores podem convidar usuários' }
    }

    const token = require('crypto').randomBytes(32).toString('hex')

    const { data, error } = await supabase
        .from('invitations')
        .insert({
            tenant_id: profile.tenant_id,
            email,
            role,
            name,
            phone,
            permissions,
            token
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating invitation:', error)
        return { error: error.message }
    }

    // Enviar notificações
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
    const protocol = rootDomain.includes('localhost') ? 'http://' : 'https://'
    const baseUrl = rootDomain.startsWith('http') ? rootDomain : `${protocol}${rootDomain}`
    const inviteLink = `${baseUrl}/register?token=${data.token}`
    
    const tenantName = profile.tenants?.name || 'CRM LAX'

    console.log(`Tentando enviar convite para ${email}. Link: ${inviteLink}`)

    const results = await Promise.allSettled([
        sendInvitationEmail(email, inviteLink, tenantName),
        phone ? sendInvitationWhatsApp(phone, inviteLink, tenantName) : Promise.resolve()
    ])

    // Log de resultados para depuração
    let notificationError = false
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`Falha no envio da notificação ${index === 0 ? 'Email' : 'WhatsApp'}:`, result.reason)
            if (index === 0) notificationError = true
        } else if (result.value && 'error' in result.value) {
            console.error(`Erro retornado no envio da notificação ${index === 0 ? 'Email' : 'WhatsApp'}:`, result.value.error)
            if (index === 0) notificationError = true
        }
    })

    revalidatePath('/settings/team')
    
    if (notificationError) {
        return { 
            success: true, 
            invitation: data, 
            warning: 'O convite foi criado, mas houve um erro ao enviar o e-mail. Você pode copiar o link manualmente.' 
        }
    }

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
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Not authenticated' }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .maybeSingle()

        if (profileError || !profile) return { error: 'Profile not found' }

        const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('tenant_id', profile.tenant_id)
            .order('created_at', { ascending: false })

        if (error) return { error: error.message }
        return { invitations: data }
    } catch (error: any) {
        console.error('Error in listInvitations:', error)
        return { error: 'Falha ao buscar convites' }
    }
}

/**
 * Atualiza um convite (apenas admin)
 */
export async function updateInvitation(
    id: string,
    updates: {
        role?: 'admin' | 'user',
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
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .maybeSingle()

    const userRole = profile?.role?.toLowerCase();
    const allowedRoles = ['admin', 'superadmin', 'super_admin', 'super administrador'];

    if (profileError || !profile || !allowedRoles.includes(userRole)) {
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
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .maybeSingle()

    const userRole = profile?.role?.toLowerCase();
    const allowedRoles = ['admin', 'superadmin', 'super_admin', 'super administrador'];

    if (profileError || !profile || !allowedRoles.includes(userRole)) {
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
