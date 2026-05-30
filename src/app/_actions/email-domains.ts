'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from './profile'
import { getResendClient } from '@/lib/emails/client'

// Adicionar um domínio no Resend e no banco de dados
export async function addEmailDomain(tenantId: string, domain: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    if (!profile || profile.role !== 'superadmin' && profile.role !== 'admin') {
        return { success: false, error: 'Acesso negado.' }
    }

    try {
        const resend = getResendClient()
        if (!resend) throw new Error('API do Resend não configurada.')

        // 1. Cria no Resend
        const { data: resendDomain, error: resendError } = await resend.domains.create({
            name: domain
        });

        if (resendError) {
            return { success: false, error: resendError.message }
        }

        if (!resendDomain) throw new Error('Erro ao criar domínio no Resend.')

        // 2. Salva no banco de dados
        const { data, error } = await supabase
            .from('email_domains')
            .insert({
                tenant_id: tenantId,
                domain: domain,
                resend_domain_id: resendDomain.id,
                status: 'pending'
            })
            .select()
            .single()

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error adding email domain:', error)
        return { success: false, error: error.message }
    }
}

// Verifica status do domínio (DNS)
export async function verifyEmailDomain(domainId: string, resendDomainId: string) {
    const supabase = await createClient()
    
    try {
        const resend = getResendClient()
        if (!resend) throw new Error('API do Resend não configurada.')

        const { data: resendData, error: resendError } = await resend.domains.verify(resendDomainId)

        if (resendError) {
            return { success: false, error: resendError.message }
        }

        // Resend API returns the domain object. We can check status.
        // Also fetch to check status if verify just triggers it.
        const { data: statusData, error: statusError } = await resend.domains.get(resendDomainId)
        
        if (statusError) {
             return { success: false, error: statusError.message }
        }

        let newStatus = 'pending'
        if (statusData?.status === 'verified') newStatus = 'verified'
        if (statusData?.status === 'failed') newStatus = 'failed'

        const { data, error } = await supabase
            .from('email_domains')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', domainId)
            .select()
            .single()

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error verifying email domain:', error)
        return { success: false, error: error.message }
    }
}

// Obter os domínios do tenant
export async function getEmailDomains(tenantId: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('email_domains')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Enrich with DNS records if pending
        const resend = getResendClient()
        if (resend && data) {
            for (const d of data) {
                if (d.status === 'pending' && d.resend_domain_id) {
                    const { data: rData } = await resend.domains.get(d.resend_domain_id)
                    if (rData && rData.records) {
                        d.dns_records = rData.records
                    }
                }
            }
        }

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching email domains:', error)
        return { success: false, error: error.message }
    }
}

// Remover um domínio
export async function deleteEmailDomain(domainId: string, resendDomainId: string) {
    const supabase = await createClient()

    try {
        const resend = getResendClient()
        if (resend && resendDomainId) {
            await resend.domains.remove(resendDomainId)
        }

        const { error } = await supabase
            .from('email_domains')
            .delete()
            .eq('id', domainId)

        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting email domain:', error)
        return { success: false, error: error.message }
    }
}
