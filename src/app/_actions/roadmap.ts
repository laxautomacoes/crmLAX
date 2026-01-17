'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore } from 'next/cache'

export async function getRoadmap() {
    try {
        unstable_noStore()
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('roadmap')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching roadmap:', error)
            return { items: [], error: error.message }
        }

        return { items: data || [] }
    } catch (error) {
        console.error('Error in getRoadmap:', error)
        return { items: [], error: 'Falha ao buscar roadmap' }
    }
}

export async function createRoadmapItem(data: {
    title: string,
    description: string,
    type: 'feature' | 'fix' | 'roadmap',
    status: string
}) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Não autenticado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.role !== 'superadmin') {
            return { error: 'Acesso negado. Apenas Super Admins podem gerenciar o Roadmap.' }
        }

        const { error } = await supabase
            .from('roadmap')
            .insert([data])

        if (error) {
            console.error('Error creating roadmap item:', error)
            return { error: error.message }
        }

        revalidatePath('/dashboard/roadmap')
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
    status?: string
}) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Não autenticado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.role !== 'superadmin') {
            return { error: 'Acesso negado' }
        }

        const { error } = await supabase
            .from('roadmap')
            .update(data)
            .eq('id', id)

        if (error) {
            console.error('Error updating roadmap item:', error)
            return { error: error.message }
        }

        revalidatePath('/dashboard/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in updateRoadmapItem:', error)
        return { error: 'Falha ao atualizar' }
    }
}

export async function deleteRoadmapItem(id: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Não autenticado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.role !== 'superadmin') {
            return { error: 'Acesso negado' }
        }

        const { error } = await supabase
            .from('roadmap')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting roadmap item:', error)
            return { error: error.message }
        }

        revalidatePath('/dashboard/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in deleteRoadmapItem:', error)
        return { error: 'Falha ao excluir' }
    }
}
