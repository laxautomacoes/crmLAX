'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore } from 'next/cache'

export async function getProfile() {
    try {
        unstable_noStore()
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { error: 'Not authenticated' }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

        return {
            profile: {
                ...profile,
                id: user.id,
                email: user.email || 'leocrm@lax.com',
                full_name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Léo Acosta',
                role: profile?.role || 'user',
                avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture
            }
        }
    } catch (error) {
        console.error('Error in getProfile:', error)
        return {
            profile: {
                full_name: 'Léo Acosta',
                email: 'leocrm@lax.com',
                role: 'user'
            }
        }
    }
}

export async function updateProfileAvatar(avatarUrl: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

    if (error) {
        console.error('Error updating profile avatar:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
}
