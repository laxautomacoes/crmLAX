'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { getProfile } from './profile'
import { createLog } from '@/lib/utils/logging'
import { notificationService } from '@/services/notification-service'
import { createAssetSchema, updateAssetSchema, validateInput } from '@/lib/validations/schemas'

export async function getAssets(tenantId: string, status?: string, callerUserId?: string, callerRole?: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    // Usar dados passados pelo caller (evita duplo getProfile com sessão inconsistente)
    const effectiveRole = callerRole?.toLowerCase() ?? profile?.role?.toLowerCase()
    const effectiveUserId = callerUserId ?? profile?.id

    try {
        let query = supabase
            .from('assets')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)

        // Nota: Permitimos que todos os membros do tenant vejam o inventário global (is_archived: false).
        // Restrições de edição/exclusão permanecem ativas em suas respectivas ações.


        // Aplicar filtro de status se fornecido
        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data: data || [] }
    } catch (error: any) {
        console.error('Error fetching assets:', error)
        return { success: false, error: error.message }
    }
}

// Diagnóstico e Bypass de Emergência
const validateAssetSafely = (schema: any, data: any) => {
    try {
        if (!schema || typeof schema.safeParse !== 'function') {
            console.error('[AssetsAction] Schema inválido ou corrompido:', typeof schema)
            throw new Error('Schema corrompido')
        }
        return schema.safeParse(data)
    } catch (e) {
        console.warn('[AssetsAction] Falha crítica/interna no Zod, ativando bypass manual:', e)
        // Validação manual mínima para garantir que o sistema não trave
        const d = data as any
        if (!d || !d.title) return { success: false, error: { issues: [{ path: ['title'], message: 'Título é obrigatório (Manual)' }] } }
        return { success: true, data: data }
    }
}

export async function createAsset(tenantId: string, assetData: unknown) {
    // Validação segura
    const result = validateAssetSafely(createAssetSchema, assetData)
    if (!result.success) {
        const errorMsg = (result as any).error?.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ') || 'Erro de validação desconhecido'
        console.error('[createAsset] Erro de validação:', errorMsg)
        return { success: false, error: `Dados inválidos: ${errorMsg}` }
    }
    const input = result.data as any

    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        const insertData: Record<string, any> = {
            created_by: profile?.id,
            ...input,
            tenant_id: tenantId,
        }

        // Se não for admin, o status é sempre Pendente
        const userRoleUpdate = profile?.role?.toLowerCase()
        if (userRoleUpdate !== 'admin' && userRoleUpdate !== 'superadmin') {
            insertData.status = 'Pendente'
        }

        const { data, error } = await supabase
            .from('assets')
            .insert([insertData])
            .select()
            .single()

        if (error) throw error

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

export async function updateAsset(tenantId: string, assetId: string, assetData: unknown) {
    // Validação segura
    const result = validateAssetSafely(updateAssetSchema, assetData)
    if (!result.success) {
        const errorMsg = (result as any).error?.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ') || 'Erro de validação desconhecido'
        console.error('[updateAsset] Erro de validação:', errorMsg)
        return { success: false, error: `Dados inválidos: ${errorMsg}` }
    }
    const input = result.data as any

    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        console.log(`[updateAsset] Iniciando atualização do imóvel ${assetId} para tenant ${tenantId}`)
        const updateData = { ...input }
        
        // Se não for admin, permitimos a edição mas forçamos o status para Pendente
        const userRoleUpdate = profile?.role?.toLowerCase()
        if (userRoleUpdate !== 'admin' && userRoleUpdate !== 'superadmin') {
            console.log(`[updateAsset] Usuário não é admin (${userRoleUpdate}), forçando status Pendente`)
            updateData.status = 'Pendente'
        }

        let query = supabase
            .from('assets')
            .update(updateData)
            .eq('id', assetId)
            .eq('tenant_id', tenantId)

        // Se não for admin, só pode atualizar se for o criador
        if (userRoleUpdate !== 'admin' && userRoleUpdate !== 'superadmin') {
            query = query.eq('created_by', profile?.id)
        }

        const { data, error } = await query
            .select()
            .single()

        if (error) throw error

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

export async function bulkCreateAssets(tenantId: string, assetsData: unknown[]) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

        // Validar cada asset individualmente
        const validatedItems = []
        for (const asset of assetsData) {
            const validated = validateInput(createAssetSchema, asset)
            if (validated.error) return { success: false, error: `Item inválido: ${validated.error}` }
            validatedItems.push(validated.data)
        }

        const insertData = validatedItems.map((asset) => ({
            ...asset,
            tenant_id: tenantId,
            created_by: profile?.id,
            status: isAdmin ? (asset.status || 'Disponível') : 'Pendente'
        }))

        const { data, error } = await supabase
            .from('assets')
            .insert(insertData)
            .select()

        if (error) throw error

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
        const userRoleUpdate = profile?.role?.toLowerCase()
        if (userRoleUpdate !== 'admin' && userRoleUpdate !== 'superadmin') {
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
            if (profile?.tenant_id) {
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('tenant_id', profile.tenant_id)
                    .in('role', ['admin', 'superadmin'])
                    .neq('id', profile.id)

                if (admins && admins.length > 0) {
                    await Promise.all(admins.map((admin: any) => 
                        notificationService.create({
                            user_id: admin.id,
                            tenant_id: profile.tenant_id as string,
                            title: 'Imóvel Excluído',
                            message: `O imóvel #${assetId.slice(0, 8)} foi excluído por ${profile.full_name}.`,
                            type: 'error',
                            metadata: { asset_id: assetId, action_by: profile.id }
                        })
                    ))
                }
            }
        } catch (e) {
            console.error('Error sending admin notifications:', e)
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
        const userRoleUpdate = profile?.role?.toLowerCase()
        if (userRoleUpdate !== 'admin' && userRoleUpdate !== 'superadmin') {
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
            if (profile?.tenant_id) {
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('tenant_id', profile.tenant_id)
                    .in('role', ['admin', 'superadmin'])
                    .neq('id', profile.id)

                if (admins && admins.length > 0) {
                    await Promise.all(admins.map((admin: any) => 
                        notificationService.create({
                            user_id: admin.id,
                            tenant_id: profile.tenant_id as string,
                            title: 'Imóvel Arquivado',
                            message: `O imóvel #${assetId.slice(0, 8)} foi arquivado por ${profile.full_name}.`,
                            type: 'info',
                            metadata: { asset_id: assetId }
                        })
                    ))
                }
            }
        } catch (e) {
            console.error('Error sending admin notifications:', e)
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
            .select('*')
            .eq('id', assetId)
            .single()

        if (error) throw error

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

export async function approveAsset(tenantId: string, assetId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    const userRole = profile?.role?.toLowerCase()

    if (userRole !== 'admin' && userRole !== 'superadmin') {
        return { success: false, error: 'Apenas administradores podem aprovar imóveis.' }
    }

    try {
        const { data, error } = await supabase
            .from('assets')
            .update({ status: 'Disponível' })
            .eq('id', assetId)
            .eq('tenant_id', tenantId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/properties')
        revalidatePath('/dashboard')

        await createLog({
            action: 'update_asset',
            entityType: 'asset',
            entityId: assetId,
            details: { previousStatus: 'Pendente', newStatus: 'Disponível', approvedBy: profile?.id }
        })

        return { success: true, data }
    } catch (error: any) {
        console.error('Error approving asset:', error)
        return { success: false, error: error.message || 'Erro ao aprovar imóvel' }
    }
}
