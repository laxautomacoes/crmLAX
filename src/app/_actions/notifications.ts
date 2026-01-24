'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore } from 'next/cache'

export async function getNotifications() {
    unstable_noStore()
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { notifications: [] }
        }

        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching notifications:', error)
            return { notifications: [] }
        }

        // Formata a data para exibir algo amigável como "Há 5 min", "Há 1 hora", etc.
        // No momento retornaremos a data crua ou formatada simples, e o frontend lida com a exibição.
        return { notifications: notifications || [] }
    } catch (error) {
        console.error('Error in getNotifications:', error)
        return { notifications: [] }
    }
}

export async function markAsRead(ids: string[]) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Not authenticated' }

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', ids)
            .eq('user_id', user.id)

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error marking as read:', error)
        return { error: 'Failed to mark as read' }
    }
}

export async function deleteNotifications(ids: string[]) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Not authenticated' }

        const { error } = await supabase
            .from('notifications')
            .delete()
            .in('id', ids)
            .eq('user_id', user.id)

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting notifications:', error)
        return { error: 'Failed to delete notifications' }
    }
}

export async function createNotification(data: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
}) {
    try {
        const supabase = await createClient()
        
        const { error } = await supabase
            .from('notifications')
            .insert([{
                ...data,
                read: false,
                created_at: new Date().toISOString()
            }])

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error creating notification:', error)
        return { error: 'Failed to create notification' }
    }
}
