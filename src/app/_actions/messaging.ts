'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { getTenantFromHeaders } from '@/lib/utils/tenant'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPropertyEmail(leadId: string, leadEmail: string, propertyData: any) {
    const tenant = await getTenantFromHeaders()
    if (!tenant) return { success: false, error: 'Tenant not found' }

    try {
        const { data, error } = await resend.emails.send({
            from: `${tenant.name} <noreply@laxperience.online>`,
            to: [leadEmail],
            subject: `Confira este imóvel: ${propertyData.title}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          ${propertyData.images?.[0] ? `<img src="${propertyData.images[0]}" style="width: 100%; height: 300px; object-fit: cover;" />` : ''}
          <div style="padding: 24px;">
            <h1 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 24px;">${propertyData.title}</h1>
            <p style="font-size: 20px; font-weight: bold; color: #000; margin: 0 0 24px 0;">
              R$ ${new Intl.NumberFormat('pt-BR').format(propertyData.price)}
            </p>
            
            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 16px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">Detalhes do Imóvel</h2>
              <ul style="margin: 0; padding: 0; list-style: none;">
                ${propertyData.details?.quartos ? `<li style="margin-bottom: 8px; color: #444;">• ${propertyData.details.quartos} Quartos</li>` : ''}
                ${propertyData.details?.suites ? `<li style="margin-bottom: 8px; color: #444;">• ${propertyData.details.suites} Suítes</li>` : ''}
                ${propertyData.details?.area_privativa ? `<li style="margin-bottom: 8px; color: #444;">• ${propertyData.details.area_privativa}m² privativos</li>` : ''}
                <li style="margin-bottom: 8px; color: #444;">• Tipo: ${propertyData.type}</li>
              </ul>
            </div>

            <a href="https://${tenant.slug}.laxperience.online/site/${tenant.slug}" style="background-color: #000; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; text-align: center;">
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

        // Log interaction
        await logInteraction(leadId, 'system', `E-mail enviado com o imóvel: ${propertyData.title}`)

        return { success: true, data }
    } catch (error: any) {
        console.error('Error sending email:', error)
        return { success: false, error: error.message }
    }
}

export async function logInteraction(leadId: string, type: 'whatsapp' | 'system' | 'note', content: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('interactions')
        .insert({
            lead_id: leadId,
            type: type,
            content: content,
            metadata: { sent_at: new Date().toISOString() }
        })

    if (error) console.error('Error logging interaction:', error)
}
