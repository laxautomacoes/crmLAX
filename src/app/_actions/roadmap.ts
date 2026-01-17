'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore } from 'next/cache'

export async function getUpdates() {
    try {
        unstable_noStore()
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('updates')
            .select('*')
            .order('published_at', { ascending: false })

        if (error) {
            console.error('Error fetching updates:', error)
            return { updates: [], error: error.message }
        }

        return { updates: data || [] }
    } catch (error) {
        console.error('Error in getUpdates:', error)
        return { updates: [], error: 'Falha ao buscar atualizações' }
    }
}

export async function createUpdate(data: {
    title: string,
    description: string,
    type: 'feature' | 'fix' | 'roadmap',
    status: string
}) {
    try {
        const supabase = await createClient()

        // Verificação extra de segurança no server-side
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
            .from('updates')
            .insert([data])

        if (error) {
            console.error('Error creating update:', error)
            return { error: error.message }
        }

        revalidatePath('/dashboard/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in createUpdate:', error)
        return { error: 'Falha ao criar atualização' }
    }
}

export async function updateUpdate(id: string, data: {
    title?: string,
    description?: string,
    type?: 'feature' | 'fix' | 'roadmap',
    status?: string
}) {
    try {
        const supabase = await createClient()

        // Verificação extra de segurança
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
            .from('updates')
            .update(data)
            .eq('id', id)

        if (error) {
            console.error('Error updating update:', error)
            return { error: error.message }
        }

        revalidatePath('/dashboard/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in updateUpdate:', error)
        return { error: 'Falha ao atualizar' }
    }
}

export async function deleteUpdate(id: string) {
    try {
        const supabase = await createClient()

        // Verificação extra de segurança
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
            .from('updates')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting update:', error)
            return { error: error.message }
        }

        revalidatePath('/dashboard/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error in deleteUpdate:', error)
        return { error: 'Falha ao excluir' }
    }
}
