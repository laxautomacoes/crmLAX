'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { getTenantFromHeaders } from '@/lib/utils/tenant'
import { headers } from 'next/headers'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPropertyEmail(leadId: string, leadEmail: string, propertyData: any, config?: any) {
    const tenant = await getTenantFromHeaders()
    if (!tenant) return { success: false, error: 'Tenant not found' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const brokerId = user?.id

    // Obter o host atual para construir a URL
    const headersList = await headers()
    const host = headersList.get('host') || 'laxperience.online'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    
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
        if (config.images && propertyData.images) {
            const imageIndices = config.images
                .map((url: string) => (propertyData.images || []).indexOf(url))
                .filter((idx: number) => idx !== -1)
            if (imageIndices.length < propertyData.images.length) {
                queryParams.set('ci', imageIndices.join(','))
            }
        }

        if (config.videos && propertyData.videos) {
            const videoIndices = config.videos
                .map((url: string) => (propertyData.videos || []).indexOf(url))
                .filter((idx: number) => idx !== -1)
            if (videoIndices.length < propertyData.videos.length) {
                queryParams.set('cv', videoIndices.join(','))
            }
        }

        if (config.documents && propertyData.documents) {
            const docIndices = config.documents
                .map((doc: any) => (propertyData.documents || []).findIndex((d: any) => d.url === doc.url))
                .filter((idx: number) => idx !== -1)
            if (docIndices.length < propertyData.documents.length) {
                queryParams.set('cdoc', docIndices.join(','))
            }
        }
    }

    const queryString = queryParams.toString()
    const propertyUrl = `${protocol}://${host}/site/${tenant.slug}/property/${propertyData.id}${queryString ? `?${queryString}` : ''}`

    // Apply configuration if provided
    const displayTitle = config?.title !== false ? propertyData.title : 'Imóvel disponível'
    const displayPrice = config?.price !== false ? `R$ ${new Intl.NumberFormat('pt-BR').format(propertyData.price)}` : 'Preço sob consulta'
    const displayImages = config?.images?.length > 0 ? config.images : propertyData.images || []
    
    const showDetails = config?.details !== 'none'
    const details = propertyData.details || {}
    
    try {
        const { data, error } = await resend.emails.send({
            from: `${tenant.name} <noreply@laxperience.online>`,
            to: [leadEmail],
            subject: `Confira este imóvel: ${displayTitle}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          ${displayImages[0] ? `<img src="${displayImages[0]}" style="width: 100%; height: 300px; object-fit: cover;" />` : ''}
          <div style="padding: 24px;">
            <h1 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 24px;">${displayTitle}</h1>
            <p style="font-size: 20px; font-weight: bold; color: #000; margin: 0 0 24px 0;">
              ${displayPrice}
            </p>
            
            ${config?.description === 'full' && propertyData.description ? `
              <div style="margin-bottom: 24px;">
                <h2 style="font-size: 16px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">Descrição</h2>
                <p style="color: #444; line-height: 1.6; white-space: pre-wrap;">${propertyData.description}</p>
              </div>
            ` : ''}

            ${showDetails ? `
              <div style="margin-bottom: 24px;">
                <h2 style="font-size: 16px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">Detalhes do Imóvel</h2>
                <ul style="margin: 0; padding: 0; list-style: none;">
                  ${(config?.showBedrooms !== false && (details.dormitorios || details.quartos)) ? `<li style="margin-bottom: 8px; color: #444;">• ${details.dormitorios || details.quartos} Dormitórios</li>` : ''}
                  ${(config?.showSuites !== false && details.suites) ? `<li style="margin-bottom: 8px; color: #444;">• ${details.suites} Suítes</li>` : ''}
                  ${(config?.showArea !== false && details.area_privativa) ? `<li style="margin-bottom: 8px; color: #444;">• ${details.area_privativa}m² privativos</li>` : ''}
                  ${config?.showType !== false ? `<li style="margin-bottom: 8px; color: #444;">• Tipo: ${propertyData.type}</li>` : ''}
                </ul>
              </div>
            ` : ''}

            ${config?.location !== 'none' ? `
              <div style="margin-bottom: 24px;">
                <h2 style="font-size: 16px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">Localização</h2>
                <p style="color: #444;">
                  ${config?.location === 'exact' 
                    ? `${details.endereco?.rua || ''}, ${details.endereco?.numero || ''} - ${details.endereco?.bairro || ''}, ${details.endereco?.cidade || ''}`
                    : `${details.endereco?.bairro || ''}, ${details.endereco?.cidade || ''}`
                  }
                </p>
              </div>
            ` : ''}

            <a href="${propertyUrl}" style="background-color: #000; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; text-align: center;">
              Ver todos os detalhes no site
            </a>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0;">Enviado por <strong>${tenant.name}</strong></p>
            <p style="color: #999; font-size: 12px; margin: 8px 0 0 0;">Gerenciado pelo CRM LAX</p>
          </div>
        </div>
      `
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
