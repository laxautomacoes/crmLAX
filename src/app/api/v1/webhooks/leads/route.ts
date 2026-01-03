import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface LeadPayload {
    tenant_id: string;
    name: string;
    phone: string;
    email?: string;
    asset_id?: string;
    source?: string;
    tags?: string[];
    utm_data?: Record<string, any>;
}

export async function POST(req: NextRequest) {
    try {
        const payload: LeadPayload = await req.json();
        const { tenant_id, name, phone, email, asset_id, source, tags, utm_data } = payload;

        if (!tenant_id || !phone) {
            return NextResponse.json({ error: 'Missing tenant_id or phone' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Upsert no contato pelo telefone (tabela contacts)
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .upsert(
                { tenant_id, name, phone, email, tags: JSON.stringify(tags || []) },
                { onConflict: 'tenant_id,phone' } // Assumindo que criamos um índice único composto
            )
            .select('id')
            .single();

        if (contactError) throw contactError;

        // 2. Criar o lead vinculado a esse contato na tabela leads
        const { error: leadError } = await supabase
            .from('leads')
            .insert({
                contact_id: contact.id,
                tenant_id,
                asset_id,
                source,
                utm_data: utm_data || {},
                status: 'new'
            });

        if (leadError) throw leadError;

        return NextResponse.json({ message: 'Lead processed successfully', contact_id: contact.id });
    } catch (error: any) {
        console.error('Webhook Lead Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
