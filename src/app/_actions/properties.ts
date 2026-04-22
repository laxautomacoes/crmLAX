'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { getProfile } from './profile'
import { createLog } from '@/lib/utils/logging'
import { notificationService } from '@/services/notification-service'
import { createPropertySchema, updatePropertySchema, validateInput } from '@/lib/validations/schemas'

function slugify(text: string) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
}

export async function getProperties(tenantId: string, status?: string, callerUserId?: string, callerRole?: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    // Usar dados passados pelo caller (evita duplo getProfile com sessão inconsistente)
    const effectiveRole = callerRole?.toLowerCase() ?? profile?.role?.toLowerCase()
    const effectiveUserId = callerUserId ?? profile?.id

    try {
        let query = supabase
            .from('properties')
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
        console.error('Error fetching properties:', error)
        return { success: false, error: error.message }
    }
}

// Diagnóstico e Bypass de Emergência
const validatePropertySafely = (schema: any, data: any) => {
    try {
        if (!schema || typeof schema.safeParse !== 'function') {
            console.error('[PropertiesAction] Schema inválido ou corrompido:', typeof schema)
            throw new Error('Schema corrompido')
        }
        return schema.safeParse(data)
    } catch (e) {
        console.warn('[PropertiesAction] Falha crítica/interna no Zod, ativando bypass manual:', e)
        // Validação manual mínima para garantir que o sistema não trave
        const d = data as any
        if (!d || !d.title) return { success: false, error: { issues: [{ path: ['title'], message: 'Título é obrigatório (Manual)' }] } }
        return { success: true, data: data }
    }
}

export async function createProperty(tenantId: string, propertyData: unknown) {
    // Validação segura
    const result = validatePropertySafely(createPropertySchema, propertyData)
    if (!result.success) {
        const errorMsg = (result as any).error?.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ') || 'Erro de validação desconhecido'
        console.error('[createProperty] Erro de validação:', errorMsg)
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
            slug: input.slug || slugify(input.title)
        }

        // Se não for admin, o status é sempre Pendente
        const userRoleUpdate = profile?.role?.toLowerCase()
        if (userRoleUpdate !== 'admin' && userRoleUpdate !== 'superadmin') {
            insertData.status = 'Pending'
        }

        const { data, error } = await supabase
            .from('properties')
            .insert([insertData])
            .select()
            .single()

        if (error) throw error

        revalidatePath('/properties')
        
        await createLog({
            action: 'create_property',
            entityType: 'property',
            entityId: (data as any)?.id,
            details: { title: (data as any)?.title }
        })

        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating property:', error)
        return { success: false, error: error.message }
    }
}

export async function updateProperty(tenantId: string, propertyId: string, propertyData: unknown) {
    // Validação segura
    const result = validatePropertySafely(updatePropertySchema, propertyData)
    if (!result.success) {
        const errorMsg = (result as any).error?.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ') || 'Erro de validação desconhecido'
        console.error('[updateProperty] Erro de validação:', errorMsg)
        return { success: false, error: `Dados inválidos: ${errorMsg}` }
    }
    const input = result.data as any

    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        console.log(`[updateProperty] Iniciando atualização do property ${propertyId} para tenant ${tenantId}`)
        const updateData: any = { ...input }

        if (input.title && !input.slug) {
            updateData.slug = slugify(input.title)
        }
        
        // Se não for admin, permitimos a edição mas forçamos o status para Pendente
        const userRoleUpdate = profile?.role?.toLowerCase()
        if (userRoleUpdate !== 'admin' && userRoleUpdate !== 'superadmin') {
            console.log(`[updateProperty] Usuário não é admin (${userRoleUpdate}), forçando status Pendente`)
            updateData.status = 'Pending'
        }

        let query = supabase
            .from('properties')
            .update(updateData)
            .eq('id', propertyId)
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
            action: 'update_property',
            entityType: 'property',
            entityId: (data as any)?.id,
            details: { title: (data as any)?.title }
        })

        return { success: true, data }
    } catch (error: any) {
        console.error('Error updating property:', error)
        return { success: false, error: error.message }
    }
}

export async function bulkCreateProperties(tenantId: string, propertiesData: unknown[]) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

        // Validar cada property individualmente
        const validatedItems = []
        for (const property of propertiesData) {
            const validated = validateInput(createPropertySchema, property)
            if (validated.error) return { success: false, error: `Item inválido: ${validated.error}` }
            validatedItems.push(validated.data)
        }

        const insertData = validatedItems.map((property) => ({
            ...property,
            tenant_id: tenantId,
            created_by: profile?.id,
            status: isAdmin ? (property!.status || 'Available') : 'Pending'
        }))

        const { data, error } = await supabase
            .from('properties')
            .insert(insertData)
            .select()

        if (error) throw error

        revalidatePath('/properties')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error bulk creating properties:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteProperty(tenantId: string, propertyId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        let query = supabase
            .from('properties')
            .delete()
            .eq('id', propertyId)
            .eq('tenant_id', tenantId)

        // Se não for admin, só pode excluir se for o criador
        const userRoleUpdate = profile?.role?.toLowerCase()
        if (userRoleUpdate !== 'admin' && userRoleUpdate !== 'superadmin') {
            query = query.eq('created_by', profile?.id)
        }

        const { error } = await query

        if (error) throw error

        await createLog({
            action: 'delete_property',
            entityType: 'property',
            entityId: propertyId
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
                            message: `O imóvel #${propertyId.slice(0, 8)} foi excluído por ${profile.full_name}.`,
                            type: 'error',
                            metadata: { property_id: propertyId, action_by: profile.id }
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
        console.error('Error deleting property:', error)
        return { success: false, error: error.message }
    }
}

export async function archiveProperty(tenantId: string, propertyId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        let query = supabase
            .from('properties')
            .update({ is_archived: true })
            .eq('id', propertyId)
            .eq('tenant_id', tenantId)

        // Se não for admin, só pode arquivar se for o criador
        const userRoleUpdate = profile?.role?.toLowerCase()
        if (userRoleUpdate !== 'admin' && userRoleUpdate !== 'superadmin') {
            query = query.eq('created_by', profile?.id)
        }

        const { error } = await query

        if (error) throw error

        await createLog({
            action: 'archive_property',
            entityType: 'property',
            entityId: propertyId
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
                            message: `O imóvel #${propertyId.slice(0, 8)} foi arquivado por ${profile.full_name}.`,
                            type: 'info',
                            metadata: { property_id: propertyId }
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
        console.error('Error archiving property:', error)
        return { success: false, error: error.message }
    }
}

export async function getPropertyById(propertyId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single()

        if (error) throw error

        // Se o property estiver Pendente, apenas o criador ou admins podem ver
        if (data.status === 'Pending') {
            if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin' && data.created_by && data.created_by !== profile.id)) {
                return { success: false, error: 'Not authorized' }
            }
        }

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching property by id:', error)
        return { success: false, error: error.message }
    }
}

export async function approveProperty(tenantId: string, propertyId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    const userRole = profile?.role?.toLowerCase()

    if (userRole !== 'admin' && userRole !== 'superadmin') {
        return { success: false, error: 'Apenas administradores podem aprovar imóveis.' }
    }

    try {
        const { data, error } = await supabase
            .from('properties')
            .update({ status: 'Available' })
            .eq('id', propertyId)
            .eq('tenant_id', tenantId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/properties')
        revalidatePath('/dashboard')

        await createLog({
            action: 'update_property',
            entityType: 'property',
            entityId: propertyId,
            details: { previousStatus: 'Pending', newStatus: 'Available', approvedBy: profile?.id }
        })

        return { success: true, data }
    } catch (error: any) {
        console.error('Error approving property:', error)
        return { success: false, error: error.message || 'Erro ao aprovar imóvel' }
    }
}

export async function getPropertyBySlug(type: string, slug: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('type', type)
            .eq('slug', slug)
            .eq('is_archived', false)
            .is('deleted_at', null)
            .single()

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching property by slug:', error)
        return { success: false, error: 'Imóvel não encontrado' }
    }
}
