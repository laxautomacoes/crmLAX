'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore } from 'next/cache'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifySuperAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado', supabase: null, user: null }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role !== 'superadmin') {
        return { error: 'Acesso negado. Apenas Super Admins podem gerenciar o Roadmap.', supabase: null, user: null }
    }

    return { error: null, supabase, user }
}

// ─── Roadmap Items ────────────────────────────────────────────────────────────

export async function getRoadmap() {
    try {
        unstable_noStore()
        const supabase = await createClient()

        const [itemsRes, stagesRes] = await Promise.all([
            supabase.from('updates').select('*').order('published_at', { ascending: false }),
            supabase.from('roadmap_stages').select('*').order('order_index', { ascending: true })
        ])

        if (itemsRes.error) {
            console.error('Error fetching roadmap items:', itemsRes.error)
            return { items: [], stages: [], error: itemsRes.error.message }
        }

        if (stagesRes.error) {
            console.error('Error fetching roadmap stages:', stagesRes.error)
            return { items: [], stages: [], error: stagesRes.error.message }
        }

        return { items: itemsRes.data || [], stages: stagesRes.data || [] }
    } catch (error) {
        console.error('Error in getRoadmap:', error)
        return { items: [], stages: [], error: 'Falha ao buscar roadmap' }
    }
}

export async function createRoadmapItem(data: {
    title: string,
    description: string,
    type: 'feature' | 'fix' | 'roadmap',
    stage_id: string
}) {
    try {
        const { error: authError, supabase } = await verifySuperAdmin()
        if (authError || !supabase) return { error: authError }

        const { error } = await supabase
            .from('updates')
            .insert([{
                title: data.title,
                description: data.description,
                type: data.type,
                stage_id: data.stage_id,
                status: 'planned'
            }])

        if (error) {
            console.error('Error creating roadmap item:', error)
            return { error: error.message }
        }

        revalidatePath('/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in createRoadmapItem:', error)
        return { error: 'Falha ao criar item no roadmap' }
    }
}

export async function updateRoadmapItem(id: string, data: {
    title?: string,
    description?: string,
    type?: 'feature' | 'fix' | 'roadmap',
    stage_id?: string
}) {
    try {
        const { error: authError, supabase } = await verifySuperAdmin()
        if (authError || !supabase) return { error: authError }

        const { error } = await supabase
            .from('updates')
            .update(data)
            .eq('id', id)

        if (error) {
            console.error('Error updating roadmap item:', error)
            return { error: error.message }
        }

        revalidatePath('/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in updateRoadmapItem:', error)
        return { error: 'Falha ao atualizar' }
    }
}

export async function updateRoadmapItemStage(itemId: string, stageId: string) {
    try {
        const { error: authError, supabase } = await verifySuperAdmin()
        if (authError || !supabase) return { error: authError }

        const { error } = await supabase
            .from('updates')
            .update({ stage_id: stageId })
            .eq('id', itemId)

        if (error) {
            console.error('Error updating item stage:', error)
            return { error: error.message }
        }

        revalidatePath('/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in updateRoadmapItemStage:', error)
        return { error: 'Falha ao mover item' }
    }
}

export async function deleteRoadmapItem(id: string) {
    try {
        const { error: authError, supabase } = await verifySuperAdmin()
        if (authError || !supabase) return { error: authError }

        const { error } = await supabase
            .from('updates')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting roadmap item:', error)
            return { error: error.message }
        }

        revalidatePath('/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in deleteRoadmapItem:', error)
        return { error: 'Falha ao excluir' }
    }
}

// ─── Roadmap Stages ───────────────────────────────────────────────────────────

export async function createRoadmapStage(name: string) {
    try {
        const { error: authError, supabase } = await verifySuperAdmin()
        if (authError || !supabase) return { error: authError }

        // Pegar o maior order_index existente
        const { data: stages } = await supabase
            .from('roadmap_stages')
            .select('order_index')
            .order('order_index', { ascending: false })
            .limit(1)

        const nextOrder = (stages?.[0]?.order_index ?? -1) + 1

        const { error } = await supabase
            .from('roadmap_stages')
            .insert([{ name, order_index: nextOrder }])

        if (error) {
            console.error('Error creating roadmap stage:', error)
            return { error: error.message }
        }

        revalidatePath('/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in createRoadmapStage:', error)
        return { error: 'Falha ao criar coluna' }
    }
}

export async function renameRoadmapStage(stageId: string, name: string) {
    try {
        const { error: authError, supabase } = await verifySuperAdmin()
        if (authError || !supabase) return { error: authError }

        const { error } = await supabase
            .from('roadmap_stages')
            .update({ name })
            .eq('id', stageId)

        if (error) {
            console.error('Error renaming roadmap stage:', error)
            return { error: error.message }
        }

        revalidatePath('/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in renameRoadmapStage:', error)
        return { error: 'Falha ao renomear coluna' }
    }
}

export async function deleteRoadmapStage(stageId: string) {
    try {
        const { error: authError, supabase } = await verifySuperAdmin()
        if (authError || !supabase) return { error: authError }

        // Verificar se há items vinculados
        const { data: items } = await supabase
            .from('updates')
            .select('id')
            .eq('stage_id', stageId)
            .limit(1)

        if (items && items.length > 0) {
            return { error: 'Não é possível excluir uma coluna que contém itens. Mova os itens primeiro.' }
        }

        const { error } = await supabase
            .from('roadmap_stages')
            .delete()
            .eq('id', stageId)

        if (error) {
            console.error('Error deleting roadmap stage:', error)
            return { error: error.message }
        }

        revalidatePath('/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in deleteRoadmapStage:', error)
        return { error: 'Falha ao excluir coluna' }
    }
}

export async function updateRoadmapStageColor(stageId: string, color: string) {
    try {
        const { error: authError, supabase } = await verifySuperAdmin()
        if (authError || !supabase) return { error: authError }

        const { error } = await supabase
            .from('roadmap_stages')
            .update({ color })
            .eq('id', stageId)

        if (error) return { error: error.message }

        revalidatePath('/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in updateRoadmapStageColor:', error)
        return { error: 'Falha ao atualizar cor' }
    }
}

export async function duplicateRoadmapStage(stageId: string) {
    try {
        const { error: authError, supabase } = await verifySuperAdmin()
        if (authError || !supabase) return { error: authError }

        const { data: stage } = await supabase
            .from('roadmap_stages')
            .select('*')
            .eq('id', stageId)
            .single()

        if (!stage) return { error: 'Estágio não encontrado' }

        const { data: allStages } = await supabase
            .from('roadmap_stages')
            .select('name')

        const baseName = stage.name.replace(/ \(Cópia \d+\)$/, '')
        let copyNumber = 1
        let newName = `${baseName} (Cópia ${copyNumber})`

        const existingNames = allStages?.map((s: any) => s.name) || []
        while (existingNames.includes(newName)) {
            copyNumber++
            newName = `${baseName} (Cópia ${copyNumber})`
        }

        return await createRoadmapStage(newName)
    } catch (error) {
        console.error('Error in duplicateRoadmapStage:', error)
        return { error: 'Falha ao duplicar coluna' }
    }
}

export async function updateRoadmapStagesOrder(updates: { id: string, order_index: number }[]) {
    try {
        const { error: authError, supabase } = await verifySuperAdmin()
        if (authError || !supabase) return { error: authError }

        // We can do an upsert or individual updates
        // Supabase update for multiple rows can be done with upsert if we select all required fields
        // Since we only want to update order_index, we might need a loop or RPC
        // Let's use a loop since there are typically few stages
        for (const update of updates) {
            const { error } = await supabase
                .from('roadmap_stages')
                .update({ order_index: update.order_index })
                .eq('id', update.id)
            if (error) {
                console.error('Error updating stage order:', error)
                return { error: error.message }
            }
        }

        revalidatePath('/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in updateRoadmapStagesOrder:', error)
        return { error: 'Falha ao reordenar colunas' }
    }
}
