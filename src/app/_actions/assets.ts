'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { getProfile } from './profile'

export async function getAssets(tenantId: string, status?: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        let query = supabase
            .from('assets')
            .select('*, profiles:created_by(full_name)')
            .eq('tenant_id', tenantId)

        // Se não for admin, filtrar por aprovados ou criados pelo próprio usuário
        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            query = query.or(`approval_status.eq.approved,created_by.eq.${profile?.id}`)
        }

        // Aplicar filtro de status se fornecido
        if (status) {
            query = query.eq('approval_status', status)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching assets:', error)
        return { success: false, error: error.message }
    }
}

export async function createAsset(tenantId: string, assetData: any) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        const { data, error } = await supabase
            .from('assets')
            .insert([{
                ...assetData,
                tenant_id: tenantId,
                created_by: profile?.id,
                approval_status: (profile?.role === 'admin' || profile?.role === 'superadmin') ? 'approved' : 'pending'
            }])
            .select()
            .single()

        if (error) throw error

        revalidatePath('/properties')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating asset:', error)
        return { success: false, error: error.message }
    }
}

export async function updateAsset(tenantId: string, assetId: string, assetData: any) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        // Se o usuário não for admin, ele não pode alterar o status de aprovação diretamente
        // e se ele editar um imóvel aprovado, ele volta para pendente? 
        // A pedido do usuário: "passar pela análise... de um superior".
        // Então se um corretor edita, talvez deva voltar para pendente ou manter se já aprovado?
        // Geralmente, edições críticas exigem nova aprovação. Mas vamos simplificar:
        // Apenas admins podem mudar o approval_status.
        
        const updateData = { ...assetData }
        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            delete updateData.approval_status
            // Se um corretor editar, podemos opcionalmente resetar para pendente
            // updateData.approval_status = 'pending'
        }

        const { data, error } = await supabase
            .from('assets')
            .update(updateData)
            .eq('id', assetId)
            .eq('tenant_id', tenantId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/properties')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error updating asset:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteAsset(assetId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', assetId)

        if (error) throw error

        revalidatePath('/properties')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting asset:', error)
        return { success: false, error: error.message }
    }
}

export async function getAssetById(assetId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        const { data, error } = await supabase
            .from('assets')
            .select('*, profiles:created_by(full_name)')
            .eq('id', assetId)
            .single()

        if (error) throw error

        // Se o imóvel não estiver aprovado, apenas o criador ou admins podem ver
        if (data.approval_status !== 'approved') {
            if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin' && data.created_by !== profile.id)) {
                return { success: false, error: 'Not authorized' }
            }
        }

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching asset by id:', error)
        return { success: false, error: error.message }
    }
}
