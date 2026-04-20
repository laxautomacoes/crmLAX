import { NextRequest, NextResponse } from 'next/server';
import { processLeadInbound } from '@/services/lead-service';

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const body = await req.json();

        // Identificamos o portal pelo header ou pelo corpo
        const portal = req.headers.get('x-portal-name') || body.portal_name || 'Portal';
        const tenant_id = searchParams.get('tenant_id') || body.tenant_id;

        if (!tenant_id) return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 });

        // Verificar se a integração está ativa
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const supabase = createAdminClient();
        const { data: integration } = await supabase
            .from('integrations')
            .select('status')
            .eq('tenant_id', tenant_id)
            .eq('provider', 'portais imobiliários')
            .maybeSingle();

        if (integration?.status !== 'active') {
            return NextResponse.json({ error: 'Integration disabled' }, { status: 403 });
        }
        
        const leadData = {
            tenant_id,
            name: body.lead_name || body.name || body.clientName || 'Lead Portal',
            phone: body.lead_phone || body.phone || body.clientPhone || '',
            email: body.lead_email || body.email || body.clientEmail || '',
            property_id: body.external_id || body.property_id || body.listingId,
            source: `Portal: ${portal}`,
            utm_data: {
                portal_url: body.portal_url,
                message: body.message || body.description
            },
            status: 'new'
        };

        if (leadData.phone) {
            const result = await processLeadInbound(leadData);
            return NextResponse.json({ success: true, lead_id: result.lead_id });
        }

        return NextResponse.json({ message: 'No phone found' }, { status: 400 });
    } catch (error: any) {
        console.error('Portal Connector Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
