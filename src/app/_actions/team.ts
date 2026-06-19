'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createLog } from '@/lib/utils/logging'

export async function deleteTeamMember(params: {
    id: string;
    email: string;
    type: 'member' | 'invitation';
}) {
    const { id, email, type } = params;
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) return { error: 'Não autenticado' }

    // 1. Verificar se quem está excluindo é admin do tenant
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', currentUser.id)
        .maybeSingle()

    const userRole = profile?.role?.toLowerCase();
    const allowedRoles = ['admin', 'superadmin', 'super_admin', 'super administrador'];

    if (profileError || !profile || !allowedRoles.includes(userRole)) {
        return { error: 'Apenas administradores podem gerenciar a equipe' }
    }

    try {
        // 2. Se for convite, remove da tabela invitations
        if (type === 'invitation') {
            const { error: invError } = await supabase
                .from('invitations')
                .delete()
                .eq('id', id)
                .eq('tenant_id', profile.tenant_id)

            if (invError) throw invError
        }

        // 3. Independentemente do tipo, vamos tentar limpar qualquer convite pendente para este e-mail
        // Isso resolve o problema de convites duplicados ou "esquecidos"
        await supabase
            .from('invitations')
            .delete()
            .eq('email', email)
            .eq('tenant_id', profile.tenant_id)

        // 4. Se for um membro ativo (ou se quisermos garantir a limpeza de um perfil órfão)
        if (type === 'member') {
            // Verificar se o perfil pertence ao mesmo tenant
            const { data: targetProfile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', id)
                .single()

            if (targetProfile && targetProfile.tenant_id === profile.tenant_id) {
                // Usar admin client para remover o usuário do Auth (isso deve disparar o cascade para o profile)
                const supabaseAdmin = createAdminClient()
                
                const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
                
                if (authError) {
                    console.error('Erro ao deletar usuário do Auth:', authError)
                    // Se falhar o Auth (ex: usuário não existe mais lá), tentamos deletar o profile diretamente
                    await supabase
                        .from('profiles')
                        .delete()
                        .eq('id', id)
                }
            }
        }

        // 5. Log da ação
        await createLog({
            action: 'delete_team_member',
            entityType: type,
            entityId: id,
            details: { email, type }
        })

        revalidatePath('/settings/team')
        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteTeamMember:', error)
        return { error: error.message || 'Falha ao excluir colaborador' }
    }
}

export async function toggleArchiveTeamMember(id: string, isArchived: boolean) {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) return { error: 'Não autenticado' }

    // 1. Verificar se quem está arquivando é admin do tenant
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', currentUser.id)
        .maybeSingle()

    const userRole = profile?.role?.toLowerCase();
    const allowedRoles = ['admin', 'superadmin', 'super_admin', 'super administrador'];

    if (profileError || !profile || !allowedRoles.includes(userRole)) {
        return { error: 'Apenas administradores podem gerenciar a equipe' }
    }

    try {
        // 2. Verificar se o perfil pertence ao mesmo tenant
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', id)
            .single()

        if (!targetProfile || targetProfile.tenant_id !== profile.tenant_id) {
            return { error: 'Usuário não pertence ao seu tenant' }
        }

        // 3. Atualizar o status de arquivamento
        // Se for arquivar, também desativamos o recebimento de leads/serviço (is_active_for_service = false)
        const updateData: any = { is_archived: isArchived }
        if (isArchived) {
            updateData.is_active_for_service = false
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', id)

        if (updateError) throw updateError

        // 4. Log da ação
        await createLog({
            action: isArchived ? 'archive_team_member' : 'unarchive_team_member',
            entityType: 'member',
            entityId: id,
            details: { isArchived }
        })

        revalidatePath('/settings/team')
        return { success: true }
    } catch (error: any) {
        console.error('Error in toggleArchiveTeamMember:', error)
        return { error: error.message || 'Falha ao alterar status de arquivamento' }
    }
}

export async function resendMemberAccess(email: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autenticado' }

    // Enviar e-mail de recuperação de senha do Supabase
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
    const protocol = rootDomain.includes('localhost') ? 'http://' : 'https://'
    const baseUrl = rootDomain.startsWith('http') ? rootDomain : `${protocol}${rootDomain}`
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/reset-password`
    })

    if (error) {
        console.error('Error resetting password for user:', error)
        return { error: error.message }
    }

    return { success: true }
}

export async function updateTeamMember(
    id: string,
    updates: {
        role?: 'superadmin' | 'admin' | 'user' | 'contador' | 'advogado' | 'financeiro' | 'recursos_humanos',
        name?: string,
        email?: string,
        phone?: string,
        permissions?: Record<string, boolean>
    }
) {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) return { error: 'Não autenticado' }

    // 1. Verificar se quem está atualizando é admin do tenant
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', currentUser.id)
        .maybeSingle()

    const userRole = profile?.role?.toLowerCase();
    const allowedRoles = ['admin', 'superadmin', 'super_admin', 'super administrador'];

    if (profileError || !profile || !allowedRoles.includes(userRole)) {
        return { error: 'Apenas administradores podem gerenciar a equipe' }
    }

    try {
        // 2. Verificar se o perfil alvo pertence ao mesmo tenant
        const { data: targetProfile, error: targetError } = await supabase
            .from('profiles')
            .select('tenant_id, id')
            .eq('id', id)
            .single()

        if (targetError || !targetProfile || targetProfile.tenant_id !== profile.tenant_id) {
            return { error: 'Membro não encontrado ou não pertence à sua equipe' }
        }

        // 3. Atualizar e-mail no Auth do Supabase se fornecido e diferente do atual
        if (updates.email) {
            const supabaseAdmin = createAdminClient()
            
            // Buscar o usuário atual do Auth para comparar o e-mail
            const { data: { user: authUser }, error: getAuthUserError } = await supabaseAdmin.auth.admin.getUserById(id)
            if (getAuthUserError) {
                console.error('Erro ao buscar usuário do Auth para update:', getAuthUserError)
            } else if (authUser && authUser.email !== updates.email) {
                // Atualizar o e-mail
                const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                    email: updates.email,
                    email_confirm: true
                })
                if (updateAuthError) {
                    console.error('Erro ao atualizar e-mail no Auth:', updateAuthError)
                    return { error: `Erro ao atualizar e-mail: ${updateAuthError.message}` }
                }
            }
        }

        // 4. Atualizar os dados na tabela profiles
        const profileUpdates: any = {}
        if (updates.name !== undefined) {
            profileUpdates.full_name = updates.name
        }
        if (updates.phone !== undefined) {
            profileUpdates.whatsapp_number = updates.phone
        }
        if (updates.role !== undefined) {
            profileUpdates.role = updates.role
        }
        if (updates.permissions !== undefined) {
            profileUpdates.permissions = updates.permissions
        }

        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', id)

        if (updateProfileError) throw updateProfileError

        // 5. Log da ação
        await createLog({
            action: 'update_team_member',
            entityType: 'member',
            entityId: id,
            details: { email: updates.email, role: updates.role }
        })

        revalidatePath('/settings/team')
        return { success: true }
    } catch (error: any) {
        console.error('Error in updateTeamMember:', error)
        return { error: error.message || 'Falha ao atualizar colaborador' }
    }
}
