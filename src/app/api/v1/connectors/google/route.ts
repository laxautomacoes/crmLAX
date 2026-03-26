import { NextRequest, NextResponse } from 'next/server';
import { processLeadInbound } from '@/services/lead-service';

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const body = await req.json();

        // Google Ads envia um 'google_key' para autenticação básica
        const googleKey = process.env.GOOGLE_ADS_WEBHOOK_KEY || 'crmlax_google_secret';
        
        if (body.google_key !== googleKey) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verificar se a integração está ativa
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const supabase = createAdminClient();
        const { data: integration } = await supabase
            .from('integrations')
            .select('status')
            .eq('tenant_id', body.tenant_id)
            .eq('provider', 'google ads')
            .maybeSingle();

        if (integration?.status !== 'active') {
            return NextResponse.json({ error: 'Integration disabled' }, { status: 403 });
        }

        // Mapeamento de campos do Google Ads
        // O Google envia um array 'user_column_data' com {column_name, string_value}
        const findField = (name: string) => 
            body.user_column_data?.find((c: any) => c.column_id === name || c.column_name === name)?.string_value;

        const leadData = {
            tenant_id: body.tenant_id, // Idealmente enviado via URL param ou mapeado
            name: findField('FULL_NAME') || findField('FIRST_NAME') || 'Lead Google Ads',
            phone: findField('PHONE_NUMBER') || '',
            email: findField('USER_EMAIL') || '',
            source: 'Google Ads',
            utm_data: {
                campaign_id: body.campaign_id,
                adgroup_id: body.adgroup_id,
                creative_id: body.creative_id,
                gclid: body.gclid
            },
            status: 'new'
        };

        if (leadData.phone) {
            const result = await processLeadInbound(leadData);
            return NextResponse.json({ success: true, lead_id: result.lead_id });
        }

        return NextResponse.json({ message: 'No phone found, lead skipped' });
    } catch (error: any) {
        console.error('Google Ads Webhook Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
