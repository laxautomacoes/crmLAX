'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createPartnerSchema, validateInput } from '@/lib/validations/schemas'

export async function getPartners(tenantId: string) {
    const supabase = await createClient()
    
    try {
        const { data, error } = await supabase
            .from('partners')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('name', { ascending: true })

        if (error) throw error
        return { success: true, data: data || [] }
    } catch (error: any) {
        console.error('Error fetching partners:', error)
        return { success: false, error: error.message }
    }
}

export async function createPartner(tenantId: string, partnerData: unknown) {
    const { data: input, error } = validateInput(createPartnerSchema, partnerData)
    if (error || !input) return { success: false, error: error || 'Dados inválidos' }

    const supabase = await createClient()

    try {
        const { data, error: insertError } = await supabase
            .from('partners')
            .insert([{
                ...input,
                tenant_id: tenantId
            }])
            .select()
            .single()

        if (insertError) throw insertError
        
        revalidatePath('/leads')
        revalidatePath('/properties')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating partner:', error)
        return { success: false, error: error.message }
    }
}
