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

        // Facebook Lead Ads envia notificações em body.entry[0].changes[0].value
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0]?.value;

        if (change?.leadgen_id) {
            console.log('Facebook Lead Received:', change.leadgen_id);
            
            // NOTA: Para buscar os dados do lead (Nome, Telefone), 
            // precisaríamos chamar a Graph API do Facebook usando o leadgen_id
            // e um Page Access Token.
            
            // Por enquanto, registramos a intenção/entrada. 
            // No futuro, esta lógica deve ser expandida para buscar os dados.
            
            return NextResponse.json({ processed: true, leadgen_id: change.leadgen_id });
        }

        return NextResponse.json({ message: 'No lead data found' });
    } catch (error: any) {
        console.error('Facebook Webhook Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
