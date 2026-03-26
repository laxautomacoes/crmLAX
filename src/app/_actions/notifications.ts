'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore } from 'next/cache'
import { notificationService } from '@/services/notification-service'

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

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error) {
        console.error('Error marking as read:', error)
        return { error: 'Failed to mark as read' }
    }
}

export async function deleteNotifications(ids: string[]) {
    const result = await notificationService.delete(ids);
    if (result.success) revalidatePath('/', 'layout');
    return result;
}

export async function createNotification(data: any) {
    const { getProfile } = await import('@/app/_actions/profile');
    const { profile: userProfile } = await getProfile();
    
    return notificationService.create({
        ...data,
        tenant_id: data.tenant_id || userProfile?.tenant_id
    });
}
