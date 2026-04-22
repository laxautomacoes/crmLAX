import { NextRequest, NextResponse } from 'next/server';
import { processLeadInbound } from '@/services/lead-service';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Token de verificação que o usuário deve configurar no Facebook Developer Portal
    const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'crmlax_fb_verify';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenant_id');
        const body = await req.json();

        if (!tenantId) {
            return NextResponse.json({ error: 'Missing tenant_id in URL' }, { status: 400 });
        }

        // 1. Verificar se temos um leadgen_id
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0]?.value;
        const leadgen_id = change?.leadgen_id;

        if (!leadgen_id) {
            return NextResponse.json({ message: 'No lead data found' });
        }

        console.log('Facebook Lead ID Received:', leadgen_id);

        // 2. Buscar o Access Token do Tenant no banco
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const supabase = createAdminClient();
        
        const { data: integration } = await supabase
            .from('integrations')
            .select('credentials, status')
            .eq('tenant_id', tenantId)
            .eq('provider', 'facebook & instagram ads') // Usando o título do card como chave
            .maybeSingle();

        if (integration?.status !== 'active') {
            console.warn('Facebook Integration is disabled for tenant:', tenantId);
            return NextResponse.json({ error: 'Integration disabled' }, { status: 403 });
        }

        const accessToken = (integration?.credentials as any)?.access_token;

        if (!accessToken) {
            console.error('No Access Token found for tenant:', tenantId);
            return NextResponse.json({ error: 'Integration not configured (missing token)' }, { status: 401 });
        }

        // 3. Buscar dados do lead na Graph API
        const response = await fetch(`https://graph.facebook.com/v19.0/${leadgen_id}?access_token=${accessToken}`);
        const leadData = await response.json();

        if (leadData.error) {
            console.error('Meta Graph API Error:', leadData.error);
            return NextResponse.json({ error: leadData.error.message }, { status: 500 });
        }

        // 4. Mapear campos (Meta envia como array de {name, values})
        const fieldData = leadData.field_data || [];
        const getValue = (name: string) => fieldData.find((f: any) => f.name === name)?.values?.[0] || '';

        const name = getValue('full_name') || getValue('name') || 'Lead do Facebook';
        const phone = getValue('phone_number') || getValue('phone') || '';
        const email = getValue('email') || '';

        if (!phone) {
            console.warn('Lead without phone received, ignoring:', leadgen_id);
            return NextResponse.json({ message: 'Lead without phone' });
        }

        // 5. Processar no CRM (Cria contato, lead e dispara notificações)
        const result = await processLeadInbound({
            tenant_id: tenantId,
            name,
            phone,
            email,
            source: 'Facebook Ads',
            utm_data: { leadgen_id }
        });

        return NextResponse.json({ success: true, lead_id: result.lead_id });
    } catch (error: any) {
        console.error('Facebook Webhook Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
