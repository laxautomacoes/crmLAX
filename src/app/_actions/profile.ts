'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore } from 'next/cache'
import { createNotification } from './notifications'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

        console.log('SERVER SIDE PROFILE FETCH:', {
            id: user.id,
            role: profile?.role,
            raw_profile: profile
        });

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
        return { error: 'Failed to fetch profile' }
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

export async function deleteProfileAvatar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)

    if (error) {
        console.error('Error deleting profile avatar:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function requestEmailChange() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Busca o perfil atual e o tenant
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, tenants(name)')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            console.error('Error fetching profile for email change:', profileError)
            return { error: 'Perfil não encontrado' }
        }

        // Busca os admins do mesmo tenant
        const { data: admins, error: adminsError } = await supabase
            .from('profiles')
            .select('id')
            .eq('tenant_id', profile.tenant_id)
            .in('role', ['admin', 'superadmin'])

        if (adminsError) {
            console.error('Error fetching admins:', adminsError)
        }

        // Criar notificações para os admins (se houver)
        if (admins && admins.length > 0) {
            const notificationPromises = admins.map((admin: any) => 
                createNotification({
                    user_id: admin.id,
                    title: 'Solicitação de Alteração de E-mail',
                    message: `O usuário ${profile.full_name} deseja alterar o e-mail (${user.email}).`,
                    type: 'email_change_request'
                })
            )
            await Promise.all(notificationPromises)
        }

        // Enviar e-mail para o suporte/admin principal
        await resend.emails.send({
            from: 'CRM LAX <noreply@laxperience.online>',
            to: ['contato@laxperience.online'], // E-mail central de suporte/admin
            subject: `Solicitação de Alteração de E-mail - ${profile.full_name}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
                    <h2 style="color: #1a1a1a; margin-top: 0;">Solicitação de Alteração de E-mail</h2>
                    <p style="color: #444; line-height: 1.6;">O usuário abaixo solicitou a alteração do seu endereço de e-mail através do painel de perfil.</p>
                    <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0 0 8px 0;"><strong>Usuário:</strong> ${profile.full_name}</p>
                        <p style="margin: 0 0 8px 0;"><strong>E-mail Atual:</strong> ${user.email}</p>
                        <p style="margin: 0;"><strong>Tenant:</strong> ${profile.tenants?.name || 'N/A'}</p>
                    </div>
                    <p style="color: #666; font-size: 14px;">Esta é uma mensagem automática do sistema CRM LAX.</p>
                </div>
            `
        })

        return { success: true }
    } catch (error: any) {
        console.error('Error in requestEmailChange:', error)
        return { error: error.message || 'Erro ao processar solicitação' }
    }
}

export async function getBrokers(tenantId: string) {
    const supabase = await createClient()

    try {
        const { data: brokers, error } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('tenant_id', tenantId)
            .order('full_name')

        if (error) throw error

        return { success: true, data: brokers }
    } catch (error: any) {
        console.error('Error fetching brokers:', error)
        return { success: false, error: error.message }
    }
}

export async function getBrokerProfile(profileId: string) {
    const supabase = await createClient()

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, whatsapp_number, role')
            .eq('id', profileId)
            .maybeSingle()

        if (error) throw error

        return { success: true, data: profile }
    } catch (error: any) {
        console.error('Error fetching broker profile:', error)
        return { success: false, error: error.message }
    }
}

export async function updateProfile(data: { full_name: string, whatsapp_number?: string, email?: string }) {
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

    const userRole = profile?.role?.toLowerCase() || '';
    const isAdmin = ['admin', 'superadmin', 'super_admin', 'super administrador'].includes(userRole);

    // Atualiza o e-mail se for admin/superadmin e o e-mail for diferente
    if (isAdmin && data.email && data.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
            email: data.email
        })

        if (emailError) {
            console.error('Error updating email:', emailError)
            return { error: 'Erro ao atualizar e-mail: ' + emailError.message }
        }
    }

    // Atualiza a tabela profiles
    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: data.full_name,
            whatsapp_number: data.whatsapp_number
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
