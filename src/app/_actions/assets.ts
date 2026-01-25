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
                    .select('*')
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
            // Se o erro for especificamente sobre as colunas approval_status ou created_by, tentamos sem elas
            if (error.message.includes('approval_status') || error.message.includes('created_by') || error.code === '42703') {
                console.warn('Column approval_status or created_by not found, retrying without them...')
                const { approval_status, created_by, ...fallbackData } = insertData
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .insert([fallbackData])
                    .select('id, title, type, price, status, details, images, videos, documents')
                    .single()
                
                if (retryError) {
                    // Se ainda der erro, tenta o insert mais básico possível sem select
                    console.warn('Second retry without select...')
                    const { error: basicError } = await supabase
                        .from('assets')
                        .insert([fallbackData])
                    
                    if (basicError) throw basicError
                    return { success: true }
                }
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
            // Se o erro for sobre as colunas novas no update
            if (error.message.includes('approval_status') || error.message.includes('created_by') || error.code === '42703') {
                console.warn('New columns not found during update, retrying without them...')
                const { approval_status, created_by, ...fallbackData } = updateData as any
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .update(fallbackData)
                    .eq('id', assetId)
                    .eq('tenant_id', tenantId)
                    .select('id, title, type, price, status, details, images, videos, documents')
                    .single()
                
                if (retryError) {
                    // Se ainda der erro, tenta o update mais básico possível sem select
                    console.warn('Second retry update without select...')
                    const { error: basicError } = await supabase
                        .from('assets')
                        .update(fallbackData)
                        .eq('id', assetId)
                        .eq('tenant_id', tenantId)
                    
                    if (basicError) throw basicError
                    return { success: true }
                }
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

export async function bulkCreateAssets(tenantId: string, assetsData: any[]) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        const approvalStatus = (profile?.role === 'admin' || profile?.role === 'superadmin') ? 'approved' : 'pending'
        
        const insertData = assetsData.map(asset => ({
            ...asset,
            tenant_id: tenantId,
            created_by: profile?.id,
            approval_status: approvalStatus
        }))

        const { data, error } = await supabase
            .from('assets')
            .insert(insertData)
            .select()

        if (error) {
            // Se falhar por causa das colunas novas, tenta sem elas
            if (error.message.includes('approval_status') || error.message.includes('created_by') || error.code === '42703') {
                const fallbackData = assetsData.map(asset => {
                    const { ...rest } = asset
                    return {
                        ...rest,
                        tenant_id: tenantId
                    }
                })
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .insert(fallbackData)
                    .select('id, title, type, price, status, details')
                
                if (retryError) throw retryError
                return { success: true, data: retryData }
            }
            throw error
        }

        revalidatePath('/properties')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error bulk creating assets:', error)
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

        if (error) {
            // Fallback se colunas novas não existirem
            if (error.message.includes('created_by') || error.code === '42703') {
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .select('*')
                    .eq('id', assetId)
                    .single()
                
                if (retryError) throw retryError
                return { success: true, data: retryData }
            }
            throw error
        }

        // Se o imóvel não estiver aprovado, apenas o criador ou admins podem ver
        if (data.approval_status && data.approval_status !== 'approved') {
            if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin' && data.created_by && data.created_by !== profile.id)) {
                return { success: false, error: 'Not authorized' }
            }
        }

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching asset by id:', error)
        return { success: false, error: error.message }
    }
}
