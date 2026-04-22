'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '@/app/_actions/profile'
import { FinanceiroClient } from '@/components/financial/FinanceiroClient'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function FinanceiroPage() {
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [leads, setLeads] = useState<Array<{ id: string; name: string }>>([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasAccess, setHasAccess] = useState(false)
    const router = useRouter()

    useEffect(() => {
        async function load() {
            try {
                const { profile } = await getProfile()
                if (!profile?.tenant_id) return

                const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'
                if (!isAdmin) {
                    router.replace('/dashboard')
                    return
                }

                setHasAccess(true)
                setTenantId(profile.tenant_id)

                // Buscar leads para vincular nas transações
                const supabase = createClient()
                const { data: leadsData } = await supabase
                    .from('leads')
                    .select('id, contacts(name)')
                    .eq('tenant_id', profile.tenant_id)
                    .eq('is_archived', false)
                    .order('created_at', { ascending: false })
                    .limit(100)

                const mappedLeads = (leadsData || []).map((l: any) => ({
                    id: l.id,
                    name: l.contacts?.name || 'Lead sem nome'
                }))

                setLeads(mappedLeads)
            } catch (error) {
                console.error('Erro ao carregar página financeira:', error)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [router])

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    if (!hasAccess || !tenantId) return null

    return <FinanceiroClient tenantId={tenantId} leads={leads} />
}
