'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { getTenantFromHeaders } from '@/lib/utils/tenant'
import { getPropertyUrl } from '@/lib/utils/url'
import { getPropertyEmail } from '@/lib/emails/templates'

export async function sendPropertyEmail(leadId: string, leadEmail: string, propertyData: Record<string, any>, config?: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const brokerId = user?.id

    // Tentar obter tenant via headers (proxy), com fallback via profile do usuário
    let tenant = await getTenantFromHeaders()
    if (!tenant && user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (profile?.tenant_id) {
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('id, slug, name, custom_domain, custom_domain_verified, branding')
                .eq('id', profile.tenant_id)
                .single()

            tenant = tenantData
        }
    }
    if (!tenant) return { success: false, error: 'Tenant not found' }
    
    // Build config query params for the URL
    const queryParams = new URLSearchParams()
    if (brokerId) queryParams.set('b', brokerId)
    
    if (config) {
        if (config.title === false) queryParams.set('ct', '0')
        if (config.price === false) queryParams.set('cp', '0')
        if (config.showCondo === false) queryParams.set('cco', '0')
        if (config.showIptu === false) queryParams.set('cip', '0')
        if (config.description === 'none') queryParams.set('cd', 'n')
        if (config.location !== 'approximate') queryParams.set('cl', config.location === 'exact' ? 'e' : 'n')
        if (config.showBedrooms === false) queryParams.set('cbr', '0')
        if (config.showSuites === false) queryParams.set('cst', '0')
        if (config.showArea === false) queryParams.set('car', '0')
        if (config.showAreaPrivativa === false) queryParams.set('carp', '0')
        if (config.showAreaTotal === false) queryParams.set('cart', '0')
        if (config.showVagas === false) queryParams.set('cvag', '0')
        if (config.showHobbyBox === false) queryParams.set('chob', '0')
        if (config.showType === false) queryParams.set('cty', '0')
        if (config.showSacada === false) queryParams.set('csa', '0')
        if (config.showEscritorio === false) queryParams.set('ces', '0')
        if (config.showDependencia === false) queryParams.set('cde', '0')
        if (config.showObservations === false) queryParams.set('cob', '0')
        if (config.showIdade === false) queryParams.set('cid', '0')
        if (config.showElevador === false) queryParams.set('cel', '0')
        if (config.showTorres === false) queryParams.set('ctr', '0')
        if (config.showAptosTorre === false) queryParams.set('cat', '0')
        if (config.showResponsavel) queryParams.set('crs', '1')
        if (config.showConstrutora) queryParams.set('cct', '1')
        
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
    const finalSettings = settings || {}
    
    // Parse branding to handle cases where Supabase returns it as a string
    const branding = typeof tenant.branding === 'string' 
        ? JSON.parse(tenant.branding) 
        : (tenant.branding || {})
        
    if (!finalSettings.logo_url && branding?.logo_full) {
        finalSettings.logo_url = branding.logo_full
    }

    const { subject, html } = getPropertyEmail(propertyData, propertyUrl, config, finalSettings)

    try {
        if (!process.env.RESEND_API_KEY) {
            console.error('ERRO: RESEND_API_KEY não encontrada.')
            return { success: false, error: 'Serviço de e-mail não configurado' }
        }

        const resend = new Resend(process.env.RESEND_API_KEY)
        
        // Define o domínio (usa custom_domain se existir e estiver verificado)
        const domain = (tenant.custom_domain && tenant.custom_domain_verified) 
            ? tenant.custom_domain 
            : 'laxperience.online'
            
        // Se o admin logado tiver um e-mail com o mesmo domínio customizado, envia através do e-mail dele
        let senderEmail = `noreply@${domain}`
        if (user?.email && tenant.custom_domain && user.email.endsWith(`@${tenant.custom_domain}`)) {
            senderEmail = user.email
        }
        
        const { data, error } = await resend.emails.send({
            from: `${tenant.name} <${senderEmail}>`,
            to: [leadEmail],
            replyTo: user?.email || undefined,
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
                content: description,
                created_at: new Date().toISOString()
            })

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Error logging interaction:', error)
        return { success: false, error: error.message }
    }
}
