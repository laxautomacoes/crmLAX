'use server'

import { createClient } from '@/lib/supabase/server'

export async function getTenantInvoices() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Não autenticado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (!profile?.tenant_id) return { error: 'Tenant não encontrado' }

        const { data: invoices, error } = await supabase
            .from('tenant_invoices')
            .select('*')
            .eq('tenant_id', profile.tenant_id)
            .order('paid_at', { ascending: false })
            .limit(50)

        if (error) throw error

        return { invoices }
    } catch (error: any) {
        console.error('Erro ao buscar faturas:', error)
        return { error: error.message }
    }
}
