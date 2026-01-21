'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAssets(tenantId: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching assets:', error)
        return { success: false, error: error.message }
    }
}

export async function createAsset(tenantId: string, assetData: any) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('assets')
            .insert([{
                ...assetData,
                tenant_id: tenantId
            }])
            .select()
            .single()

        if (error) throw error

        revalidatePath('/properties')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating asset:', error)
        return { success: false, error: error.message }
    }
}

export async function updateAsset(tenantId: string, assetId: string, assetData: any) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('assets')
            .update(assetData)
            .eq('id', assetId)
            .eq('tenant_id', tenantId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/properties')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error updating asset:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteAsset(assetId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', assetId)

        if (error) throw error

        revalidatePath('/properties')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting asset:', error)
        return { success: false, error: error.message }
    }
}
