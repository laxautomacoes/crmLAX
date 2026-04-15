import { NextRequest, NextResponse } from 'next/server';
import { processLeadInbound, LeadCreateData } from '@/services/lead-service';
import { verifyWebhookApiKey, checkRateLimit, getRequestIp } from '@/lib/api/auth-guards';

export async function POST(req: NextRequest) {
    try {
        // Autenticação via API Key
        const authError = verifyWebhookApiKey(req);
        if (authError) return authError;

        // Rate limiting por IP (30 req/min)
        const rateLimitError = checkRateLimit(getRequestIp(req), 30, 60_000);
        if (rateLimitError) return rateLimitError;

        const payload: LeadCreateData = await req.json();
        
        const result = await processLeadInbound(payload);

        return NextResponse.json({ 
            message: 'Lead processed successfully', 
            contact_id: result.contact_id,
            lead_id: result.lead_id
        });
    } catch (error: any) {
        console.error('Webhook Lead Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
