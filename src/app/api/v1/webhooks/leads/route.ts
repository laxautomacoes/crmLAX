import { NextRequest, NextResponse } from 'next/server';
import { processLeadInbound, LeadCreateData } from '@/services/lead-service';

export async function POST(req: NextRequest) {
    try {
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
