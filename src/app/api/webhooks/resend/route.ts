import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    try {
        // Obter payload
        const payload = await req.json()
        const { type, data } = payload

        if (!data || !data.email_id) {
            return NextResponse.json({ success: true, message: 'Ignoring webhook with no email_id' })
        }

        const emailId = data.email_id
        
        // Criar admin client para bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        
        if (!supabaseUrl || !supabaseServiceKey) {
             console.error('Supabase admin vars not set for webhook')
             return NextResponse.json({ success: false, message: 'Internal config error' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Identificar o log da campanha associado a esse email_id
        const { data: logEntry, error: logError } = await supabase
            .from('email_campaign_logs')
            .select('id, tenant_id, recipient_email, campaign_id')
            .eq('resend_email_id', emailId)
            .single()

        if (logError || !logEntry) {
            console.warn(`Email_id ${emailId} não encontrado nos logs locais.`)
            return NextResponse.json({ success: true, message: 'Ignored, ID not found in system' })
        }

        // 2. Atualizar o status baseado no tipo do evento
        let newStatus = ''
        const updateData: any = {}

        switch (type) {
            case 'email.delivered':
                newStatus = 'delivered'
                break
            case 'email.opened':
                newStatus = 'opened'
                updateData.opened_at = new Date().toISOString()
                break
            case 'email.bounced':
                newStatus = 'bounced'
                updateData.error_message = 'Email bounced'
                break
            case 'email.complained':
                newStatus = 'complained'
                break
            case 'email.delivery_delayed':
                // apenas log
                break
            default:
                // Outro evento
                break
        }

        if (newStatus) {
            // Se já estava como opened e chegou um delivered atrasado, não retrocede
            // Supabase client call to update log
            await supabase
                .from('email_campaign_logs')
                .update({ status: newStatus, ...updateData })
                .eq('id', logEntry.id)
                // Se era opened, não volta pra delivered
                .neq('status', newStatus === 'delivered' ? 'opened' : 'random_impossible_value')

            // Atualizar counters na tabela da campanha
            if (newStatus === 'opened') {
                 // Incrementar apenas se for o primeiro open
                 // (Isso idealmente é checado num RPC, mas como simplificação, deixaremos para o dashboard contar)
            }
        }

        // 3. Se complained, adicionar à blacklist (opt-out) automaticamente
        if (type === 'email.complained' || type === 'email.bounced') {
             // email.bounced pode ser erro temporário, mas para e-mail marketing, costuma-se parar de mandar.
             // vamos focar no complained (marcou como spam)
             if (type === 'email.complained') {
                 await supabase
                    .from('email_unsubscribes')
                    .upsert({
                        tenant_id: logEntry.tenant_id,
                        email: logEntry.recipient_email,
                        reason: 'Marked as spam via Resend Webhook'
                    }, { onConflict: 'tenant_id, email' })
             }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Webhook Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
