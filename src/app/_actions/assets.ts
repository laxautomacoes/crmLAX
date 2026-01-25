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
            try {
                query = query.or(`approval_status.eq.approved,created_by.eq.${profile?.id}`)
            } catch (e) {
                // Fallback se as colunas não existirem
                console.warn('Fallback filtering for assets')
            }
        }

        // Aplicar filtro de status se fornecido
        if (status) {
            query = query.eq('approval_status', status)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) {
            // Se o erro for sobre colunas inexistentes, tentamos uma query básica
            if (error.message.includes('approval_status') || error.message.includes('created_by')) {
                console.warn('Retrying assets fetch without new columns')
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('assets')
                    .select('*, profiles:created_by(full_name)')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                
                if (fallbackError) throw fallbackError
                return { success: true, data: fallbackData }
            }
            throw error
        }

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
        const insertData: any = {
            ...assetData,
            tenant_id: tenantId,
            created_by: profile?.id
        }

        // Tentar incluir approval_status apenas se a coluna existir no banco.
        // Como o Postgrest tem cache, se a migration acabou de rodar, pode falhar.
        // Vamos tentar injetar o status padrão de aprovação.
        insertData.approval_status = (profile?.role === 'admin' || profile?.role === 'superadmin') ? 'approved' : 'pending'

        const { data, error } = await supabase
            .from('assets')
            .insert([insertData])
            .select()
            .single()

        if (error) {
            // Se o erro for especificamente sobre a coluna approval_status, tentamos sem ela
            if (error.message.includes('approval_status') || error.code === '42703') {
                console.warn('Column approval_status not found, retrying without it...')
                const { approval_status, ...fallbackData } = insertData
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .insert([fallbackData])
                    .select()
                    .single()
                
                if (retryError) throw retryError
                return { success: true, data: retryData }
            }
            throw error
        }

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
        const updateData = { ...assetData }
        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            delete updateData.approval_status
        }

        const { data, error } = await supabase
            .from('assets')
            .update(updateData)
            .eq('id', assetId)
            .eq('tenant_id', tenantId)
            .select()
            .single()

        if (error) {
            // Se o erro for sobre a coluna approval_status no update
            if (error.message.includes('approval_status') || error.code === '42703') {
                console.warn('Column approval_status not found during update, retrying without it...')
                const { approval_status, ...fallbackData } = updateData
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .update(fallbackData)
                    .eq('id', assetId)
                    .eq('tenant_id', tenantId)
                    .select()
                    .single()
                
                if (retryError) throw retryError
                return { success: true, data: retryData }
            }
            throw error
        }

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
