'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { getTenantFromHeaders } from '@/lib/utils/tenant'
import { getPropertyUrl } from '@/lib/utils/url'
import { getPropertyEmail } from '@/lib/emails/templates'

export async function sendPropertyEmail(leadId: string, leadEmail: string, propertyData: Record<string, any>, config?: any) {
    const tenant = await getTenantFromHeaders()
    if (!tenant) return { success: false, error: 'Tenant not found' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const brokerId = user?.id
    
    // Build config query params for the URL
    const queryParams = new URLSearchParams()
    if (brokerId) queryParams.set('b', brokerId)
    
    if (config) {
        if (config.title === false) queryParams.set('ct', '0')
        if (config.price === false) queryParams.set('cp', '0')
        if (config.description === 'none') queryParams.set('cd', 'n')
        if (config.location !== 'approximate') queryParams.set('cl', config.location === 'exact' ? 'e' : 'n')
        if (config.showBedrooms === false) queryParams.set('cbr', '0')
        if (config.showSuites === false) queryParams.set('cst', '0')
        if (config.showArea === false) queryParams.set('car', '0')
        if (config.showType === false) queryParams.set('cty', '0')
        
        // Add media selections as indices
        if (config.images && (propertyData as any).images) {
            const imageIndices = config.images
                .map((url: string) => ((propertyData as any).images || []).indexOf(url))
                .filter((idx: number) => idx !== -1)
            if (imageIndices.length < (propertyData as any).images.length) {
                queryParams.set('ci', imageIndices.join(','))
            }
        }

        if (config.videos && (propertyData as any).videos) {
            const videoIndices = config.videos
                .map((url: string) => ((propertyData as any).videos || []).indexOf(url))
                .filter((idx: number) => idx !== -1)
            if (videoIndices.length < (propertyData as any).videos.length) {
                queryParams.set('cv', videoIndices.join(','))
            }
        }

        if (config.documents && (propertyData as any).documents) {
            const docIndices = config.documents
                .map((doc: any) => ((propertyData as any).documents || []).findIndex((d: any) => d.url === doc.url))
                .filter((idx: number) => idx !== -1)
            if (docIndices.length < (propertyData as any).documents.length) {
                queryParams.set('cdoc', docIndices.join(','))
            }
        }
    }

    const queryString = queryParams.toString()
    const propertyUrl = getPropertyUrl(tenant, propertyData.id, propertyData.slug, propertyData.type) + (queryString ? `?${queryString}` : '')

    // Fetch branding settings
    const { data: settings } = await supabase
        .from('email_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .single()

    const { subject, html } = getPropertyEmail(propertyData, propertyUrl, config, settings || {})

    try {
        if (!process.env.RESEND_API_KEY) {
            console.error('ERRO: RESEND_API_KEY não encontrada.')
            return { success: false, error: 'Serviço de e-mail não configurado' }
        }

        const resend = new Resend(process.env.RESEND_API_KEY)
        const { data, error } = await resend.emails.send({
            from: `${tenant.name} <noreply@laxperience.online>`,
            to: [leadEmail],
            subject,
            html
        })

        if (error) throw error

        await logInteraction(leadId, 'system', `E-mail enviado com o imóvel: ${propertyData.title}`)

        return { success: true, data }
    } catch (error: any) {
        console.error('Error sending property email:', error)
        return { success: false, error: error.message }
    }
}

export async function logInteraction(leadId: string, type: 'email' | 'whatsapp' | 'call' | 'system', description: string) {
    const supabase = await createClient()
    
    try {
        const { error } = await supabase
            .from('interactions')
            .insert({
                lead_id: leadId,
                type,
                description,
                created_at: new Date().toISOString()
            })

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Error logging interaction:', error)
        return { success: false, error: error.message }
    }
}
