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
