'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getProfile } from './profile'

export async function getNotes(tenantId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    
    try {
        const { data, error } = await supabase
            .from('notes')
            .select('*, profiles:profile_id(full_name), leads:lead_id(contacts!inner(name)), properties:property_id(title)')
            .eq('tenant_id', tenantId)
            .eq('profile_id', profile?.id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching notes:', error)
        return { success: false, error: error.message }
    }
}

export async function createNote(tenantId: string, noteData: any) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        const { data, error } = await supabase
            .from('notes')
            .insert([{
                ...noteData,
                tenant_id: tenantId,
                profile_id: profile?.id
            }])
            .select()
            .single()

        if (error) throw error
        
        revalidatePath('/notes')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating note:', error)
        return { success: false, error: error.message }
    }
}

export async function updateNote(noteId: string, noteData: any) {
    const supabase = await createClient()
    
    try {
        const { data, error } = await supabase
            .from('notes')
            .update(noteData)
            .eq('id', noteId)
            .select()
            .single()

        if (error) throw error
        
        revalidatePath('/notes')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error updating note:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteNote(noteId: string) {
    const supabase = await createClient()
    
    try {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId)

        if (error) throw error
        
        revalidatePath('/notes')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting note:', error)
        return { success: false, error: error.message }
    }
}
