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

        // Se não for admin, filtrar por aprovados (não pendentes) ou criados pelo próprio usuário
        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            try {
                query = query.or(`status.neq.Pendente,created_by.eq.${profile?.id}`)
            } catch (e) {
                // Fallback se as colunas não existirem
                console.warn('Fallback filtering for assets')
            }
        }

        // Aplicar filtro de status se fornecido
        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) {
            // Se o erro for sobre colunas inexistentes, tentamos uma query básica
            if (error.message.includes('created_by') || error.message.includes('description')) {
                console.warn('Retrying assets fetch without new columns')
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('assets')
                    .select('id, title, type, price, status, details, images, videos, documents')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                
                if (fallbackError) throw fallbackError

                // Mapear description do details se existir
                const mappedData = (fallbackData || []).map((item: any) => ({
                    ...item,
                    description: item.description || (item.details as any)?.description
                }))
                return { success: true, data: mappedData }
            }
            throw error
        }

        // Garantir que a description seja lida do details se a coluna raiz estiver vazia
        const mappedData = (data || []).map((item: any) => ({
            ...item,
            description: item.description || (item.details as any)?.description
        }))

        return { success: true, data: mappedData }
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

        // Se não for admin, o status é sempre Pendente
        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            insertData.status = 'Pendente'
        }

        const { data, error } = await supabase
            .from('assets')
            .insert([insertData])
            .select()
            .single()

        if (error) {
            // Se o erro for especificamente sobre colunas que podem não existir ainda no schema cache
            const isMissingColumnError = 
                error.code === '42703' || 
                error.message.includes('column') || 
                error.message.includes('schema cache') ||
                error.message.includes('created_by') ||
                error.message.includes('description');

            if (isMissingColumnError) {
                console.warn('Column error detected during creation, applying definitive fallback...')
                const fallbackData = { ...insertData } as any
                
                // Se a descrição falhar, vamos movê-la para dentro de 'details' para não perder a informação
                if (error.message.includes('description') || error.code === '42703') {
                    fallbackData.details = {
                        ...fallbackData.details,
                        description: fallbackData.description
                    }
                    delete fallbackData.description
                }
                
                if (error.message.includes('created_by') || error.code === '42703') delete fallbackData.created_by
                
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .insert([fallbackData])
                    .select('id, title, type, price, status, details, images, videos, documents')
                    .single()
                
                if (retryError) {
                    // Se ainda der erro, tenta o insert mais básico sem select nenhum
                    const { error: finalError } = await supabase
                        .from('assets')
                        .insert([fallbackData])
                    
                    if (finalError) throw finalError
                    return { success: true }
                }

                // Se salvou no fallback (dentro de details), garantimos que o objeto retornado tenha a description na raiz para o UI
                const resultData = retryData ? {
                    ...retryData,
                    description: retryData.description || retryData.details?.description
                } : null

                return { success: true, data: resultData }
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
        
        // Remover campos que não devem ser atualizados ou que vêm de joins
        delete updateData.id
        delete updateData.tenant_id
        delete updateData.created_at
        delete updateData.profiles
        delete updateData.created_by // Geralmente não mudamos quem criou

        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            delete updateData.status
        }

        const { data, error } = await supabase
            .from('assets')
            .update(updateData)
            .eq('id', assetId)
            .eq('tenant_id', tenantId)
            .select()
            .single()

        if (error) {
            // Se o erro for especificamente sobre colunas que podem não existir ainda no schema cache
            const isMissingColumnError = 
                error.code === '42703' || 
                error.message.includes('column') || 
                error.message.includes('schema cache') ||
                error.message.includes('created_by') ||
                error.message.includes('description');

            if (isMissingColumnError) {
                console.warn('Column error detected during update, applying definitive fallback...')
                const fallbackData = { ...updateData } as any
                
                // Se a descrição falhar como coluna, movemos para details como fallback
                if (error.message.includes('description') || error.code === '42703') {
                    // Nota: No update, se quisermos salvar no details, precisamos garantir que 
                    // estamos enviando o objeto details completo ou usando a sintaxe de patch do Supabase.
                    // Para simplificar e garantir persistência, se description falhar, 
                    // assumimos que ela deve ir para dentro do JSONB details.
                    if (fallbackData.description) {
                        fallbackData.details = {
                            ...(fallbackData.details || {}),
                            description: fallbackData.description
                        }
                    }
                    delete fallbackData.description
                }
                
                if (error.message.includes('created_by') || error.code === '42703') delete fallbackData.created_by
                
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .update(fallbackData)
                    .eq('id', assetId)
                    .eq('tenant_id', tenantId)
                    .select('id, title, type, price, status, details, images, videos, documents')
                    .single()
                
                if (retryError) {
                    // Segundo fallback: update básico sem select
                    const { error: finalError } = await supabase
                        .from('assets')
                        .update(fallbackData)
                        .eq('id', assetId)
                        .eq('tenant_id', tenantId)
                    
                    if (finalError) throw finalError
                    return { success: true }
                }

                const resultData = retryData ? {
                    ...retryData,
                    description: retryData.description || retryData.details?.description
                } : null

                return { success: true, data: resultData }
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
        const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
        
        const insertData = assetsData.map(asset => ({
            ...asset,
            tenant_id: tenantId,
            created_by: profile?.id,
            status: isAdmin ? (asset.status || 'Disponível') : 'Pendente'
        }))

        const { data, error } = await supabase
            .from('assets')
            .insert(insertData)
            .select()

        if (error) {
            // Se falhar por causa das colunas novas no schema cache
            const isMissingColumnError = 
                error.code === '42703' || 
                error.message.includes('column') || 
                error.message.includes('schema cache') ||
                error.message.includes('created_by') ||
                error.message.includes('description');

            if (isMissingColumnError) {
                const fallbackData = assetsData.map(asset => {
                    const { created_by, ...rest } = asset as any
                    const item = {
                        ...rest,
                        tenant_id: tenantId
                    }

                    // Fallback para description dentro de details se necessário
                    if (error.message.includes('description') || error.code === '42703') {
                        item.details = {
                            ...(item.details || {}),
                            description: item.description
                        }
                        delete item.description
                    }

                    return item
                })
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .insert(fallbackData)
                    .select('id, title, type, price, status, details')
                
                if (retryError) {
                    // Fallback final: insert básico
                    const { error: finalError } = await supabase
                        .from('assets')
                        .insert(fallbackData)
                    
                    if (finalError) throw finalError
                    return { success: true }
                }

                const resultData = retryData?.map((item: any) => ({
                    ...item,
                    description: item.description || item.details?.description
                }))

                return { success: true, data: resultData }
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
            if (error.message.includes('created_by') || error.message.includes('description') || error.code === '42703') {
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

        // Se o imóvel estiver Pendente, apenas o criador ou admins podem ver
        if (data.status === 'Pendente') {
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
