'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { getProfile } from './profile'
import { createLog } from '@/lib/utils/logging'
import { createNotification } from './notifications'

export async function getAssets(tenantId: string, status?: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        let query = supabase
            .from('assets')
            .select('*, profiles:created_by(full_name)')
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)

        // Se não for admin, filtrar apenas pelos imóveis do próprio colaborador
        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            query = query.eq('created_by', profile?.id)
        }

        // Aplicar filtro de status se fornecido
        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) {
            // Se o erro for sobre colunas inexistentes, tentamos uma query básica
            const isMissingColumn = 
                error.message.includes('created_by') || 
                error.message.includes('description') || 
                error.message.includes('status') || 
                error.message.includes('is_archived') ||
                error.code === '42703';

            if (isMissingColumn) {
                console.warn('Retrying assets fetch without new columns')
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('assets')
                    .select('id, title, type, price, details, images, videos, documents, created_by, status, is_archived')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                
                if (fallbackError) throw fallbackError

                // Mapear description do details se existir
                const mappedData = (fallbackData || []).map((item: any) => ({
                    ...item,
                    description: item.description || (item.details as any)?.description,
                    status: item.status || 'Disponível',
                    is_archived: item.is_archived || false
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
            created_by: profile?.id,
            ...assetData,
            tenant_id: tenantId,
        }

        // Se a descrição estiver em details mas não na raiz, traz para a raiz
        if (!insertData.description && insertData.details?.description) {
            insertData.description = insertData.details.description
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
                error.message.includes('description') ||
                error.message.includes('status') ||
                error.message.includes('is_archived');

            if (isMissingColumnError) {
                console.warn('Column error detected during creation, applying definitive fallback...')
                const fallbackData = { ...insertData } as any
                
                // Em caso de erro de schema, vamos ser agressivos no fallback para garantir o salvamento
                // Movemos a descrição para dentro de details se houver qualquer erro relacionado a colunas
                if (fallbackData.description !== undefined) {
                    fallbackData.details = {
                        ...(fallbackData.details || {}),
                        description: fallbackData.description
                    }
                    delete fallbackData.description
                }
                
                // Removemos outras colunas apenas se o erro indicar que elas não existem
                if (error.message.includes('created_by') || error.code === '42703') {
                    delete fallbackData.created_by
                }
                
                if (error.message.includes('is_archived') || error.code === '42703') {
                    delete fallbackData.is_archived
                }
                
                // Se o erro mencionar especificamente o status, removemos também
                if (error.message.includes('status')) {
                    delete fallbackData.status
                }
                
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .insert([fallbackData])
                    .select('id, title, type, price, status, details, images, videos, documents, created_by')
                    .single()
                
                if (retryError) {
                    console.error('Retry error:', retryError)
                    // Se ainda der erro, tenta o insert mais básico possível, removendo quase tudo exceto o essencial
                    const essentialData = {
                        title: fallbackData.title,
                        type: fallbackData.type,
                        price: fallbackData.price,
                        tenant_id: fallbackData.tenant_id,
                        details: fallbackData.details,
                        images: fallbackData.images
                    }
                    
                    const { data: finalData, error: finalError } = await supabase
                        .from('assets')
                        .insert([essentialData])
                        .select('id')
                        .single()
                    
                    if (finalError) throw finalError
                    return { success: true, data: finalData }
                }

                // Se salvou no fallback (dentro de details), garantimos que o objeto retornado tenha a description na raiz para o UI
                const resultData = retryData ? {
                    ...retryData,
                    description: retryData.description || retryData.details?.description
                } : null

                revalidatePath('/properties')
                return { success: true, data: resultData }
            }
            throw error
        }

        revalidatePath('/properties')
        
        await createLog({
            action: 'create_asset',
            entityType: 'asset',
            entityId: (data as any)?.id,
            details: { title: (data as any)?.title }
        })

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
        
        // Se a descrição estiver em details mas não na raiz, traz para a raiz
        if (!updateData.description && updateData.details?.description) {
            updateData.description = updateData.details.description
        }

        // Remover campos que não devem ser atualizados ou que vêm de joins
        delete updateData.id
        delete updateData.tenant_id
        delete updateData.created_at
        delete updateData.profiles
        
        // Se não for admin, permitimos a edição mas forçamos o status para Pendente
        // para que as alterações passem por aprovação do nível admin.
        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            delete updateData.created_by
            updateData.status = 'Pendente'
        }

        let query = supabase
            .from('assets')
            .update(updateData)
            .eq('id', assetId)
            .eq('tenant_id', tenantId)

        // Se não for admin, só pode atualizar se for o criador
        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            query = query.eq('created_by', profile?.id)
        }

        const { data, error } = await query
            .select()
            .single()

        if (error) {
            // Se o erro for especificamente sobre colunas que podem não existir ainda no schema cache
            const isMissingColumnError = 
                error.code === '42703' || 
                error.message.includes('column') || 
                error.message.includes('schema cache') ||
                error.message.includes('created_by') ||
                error.message.includes('description') ||
                error.message.includes('status') ||
                error.message.includes('is_archived');

            if (isMissingColumnError) {
                console.warn('Column error detected during update, applying definitive fallback...')
                const fallbackData = { ...updateData } as any
                
                // Se a descrição falhar como coluna, movemos para details como fallback
                if (fallbackData.description !== undefined) {
                    fallbackData.details = {
                        ...(fallbackData.details || {}),
                        description: fallbackData.description
                    }
                    delete fallbackData.description
                }
                
                if (error.message.includes('created_by') || error.code === '42703') {
                    delete fallbackData.created_by
                }
                
                if (error.message.includes('is_archived') || error.code === '42703') {
                    delete fallbackData.is_archived
                }
                
                if (error.message.includes('status')) {
                    delete fallbackData.status
                }
                
                let retryQuery = supabase
                    .from('assets')
                    .update(fallbackData)
                    .eq('id', assetId)
                    .eq('tenant_id', tenantId)

                // Se não for admin, só pode atualizar se for o criador
                if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
                    retryQuery = retryQuery.eq('created_by', profile?.id)
                }

                const { data: retryData, error: retryError } = await retryQuery
                    .select('id, title, type, price, status, details, images, videos, documents, created_by')
                    .single()
                
                if (retryError) {
                    // Tenta o update mais básico possível se o anterior falhar
                    const essentialUpdate = {
                        title: fallbackData.title,
                        type: fallbackData.type,
                        price: fallbackData.price,
                        details: fallbackData.details,
                        images: fallbackData.images
                    }
                    
                    const { error: finalError } = await supabase
                        .from('assets')
                        .update(essentialUpdate)
                        .eq('id', assetId)
                        .eq('tenant_id', tenantId)
                    
                    if (finalError) throw finalError
                    return { success: true }
                }

                // Garantir description no retorno
                const resultData = retryData ? {
                    ...retryData,
                    description: retryData.description || retryData.details?.description
                } : null

                revalidatePath('/properties')
                return { success: true, data: resultData }
            }
            throw error
        }

        revalidatePath('/properties')

        await createLog({
            action: 'update_asset',
            entityType: 'asset',
            entityId: (data as any)?.id,
            details: { title: (data as any)?.title }
        })

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
                        if (item.description !== undefined) {
                            item.details = {
                                ...(item.details || {}),
                                description: item.description
                            }
                            delete item.description
                        }
                    }

                    return item
                })
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .insert(fallbackData)
                    .select('id, title, type, price, status, details, created_by')
                
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

export async function deleteAsset(tenantId: string, assetId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        let query = supabase
            .from('assets')
            .delete()
            .eq('id', assetId)
            .eq('tenant_id', tenantId)

        // Se não for admin, só pode excluir se for o criador
        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            query = query.eq('created_by', profile?.id)
        }

        const { error } = await query

        if (error) throw error

        await createLog({
            action: 'delete_asset',
            entityType: 'asset',
            entityId: assetId
        })

        // Notificar administradores do mesmo tenant
        try {
            const { profile: currentProfile } = await getProfile();
            if (currentProfile?.tenant_id) {
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('tenant_id', currentProfile.tenant_id)
                    .in('role', ['admin', 'superadmin'])
                    .neq('id', currentProfile.id);

                if (admins && admins.length > 0) {
                    await Promise.all(admins.map((admin: any) => 
                        createNotification({
                            user_id: admin.id,
                            title: 'Imóvel Excluído',
                            message: `O imóvel #${assetId.slice(0, 8)} foi excluído por ${currentProfile.full_name}.`,
                            type: 'critical_deletion',
                            metadata: { asset_id: assetId, action_by: currentProfile.id }
                        })
                    ));
                }
            }
        } catch (e) {
            console.error('Error sending admin notifications:', e);
        }

        revalidatePath('/properties')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting asset:', error)
        return { success: false, error: error.message }
    }
}

export async function archiveAsset(tenantId: string, assetId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        let query = supabase
            .from('assets')
            .update({ is_archived: true })
            .eq('id', assetId)
            .eq('tenant_id', tenantId)

        // Se não for admin, só pode arquivar se for o criador
        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            query = query.eq('created_by', profile?.id)
        }

        const { error } = await query

        if (error) throw error

        await createLog({
            action: 'archive_asset',
            entityType: 'asset',
            entityId: assetId
        })

        // Notificar administradores
        try {
            const { profile: currentProfile } = await getProfile();
            if (currentProfile?.tenant_id) {
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('tenant_id', currentProfile.tenant_id)
                    .in('role', ['admin', 'superadmin'])
                    .neq('id', currentProfile.id);

                if (admins && admins.length > 0) {
                    await Promise.all(admins.map((admin: any) => 
                        createNotification({
                            user_id: admin.id,
                            title: 'Imóvel Arquivado',
                            message: `O imóvel #${assetId.slice(0, 8)} foi arquivado por ${currentProfile.full_name}.`,
                            type: 'system',
                            metadata: { asset_id: assetId }
                        })
                    ));
                }
            }
        } catch (e) {
            console.error('Error sending admin notifications:', e);
        }

        revalidatePath('/properties')
        return { success: true }
    } catch (error: any) {
        console.error('Error archiving asset:', error)
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
            if (error.message.includes('created_by') || error.message.includes('description') || error.message.includes('status') || error.code === '42703') {
                const { data: retryData, error: retryError } = await supabase
                    .from('assets')
                    .select('id, title, type, price, details, images, videos, documents, created_by, status')
                    .eq('id', assetId)
                    .single()
                
                if (retryError) throw retryError

                // Garantir campos básicos no retorno
                const mappedData = {
                    ...retryData,
                    description: retryData.description || retryData.details?.description,
                    status: retryData.status || 'Disponível'
                }
                return { success: true, data: mappedData }
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
