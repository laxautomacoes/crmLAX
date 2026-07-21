'use server'

import { createClient } from '@/lib/supabase/server'

export async function getLeadDetails(leadId: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('leads')
            .select(`
                id,
                notes,
                images,
                videos,
                documents,
                whatsapp_chat
            `)
            .eq('id', leadId)
            .single()

        if (error) throw error

        return {
            success: true,
            data
        }
    } catch (error: any) {
        console.error('Error fetching lead details:', error)
        return { success: false, error: error.message }
    }
}
