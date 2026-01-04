'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function createLeadFromSite(data: {
    name: string;
    phone: string;
    email?: string;
    asset_id?: string;
}) {
    try {
        // Obter tenant_id dos headers (setado pelo middleware)
        const headersList = await headers();
        const tenantId = headersList.get('x-tenant-id');
        
        if (!tenantId) {
            return { error: 'Tenant não identificado' };
        }

        if (!data.phone) {
            return { error: 'Telefone é obrigatório' };
        }

        const supabase = await createClient();

        // 1. Upsert no contato pelo telefone
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .upsert(
                { 
                    tenant_id: tenantId, 
                    name: data.name, 
                    phone: data.phone, 
                    email: data.email,
                    tags: ['site'] 
                },
                { onConflict: 'tenant_id,phone' }
            )
            .select('id')
            .single();

        if (contactError) throw contactError;

        // 2. Criar o lead
        const { error: leadError } = await supabase
            .from('leads')
            .insert({
                contact_id: contact.id,
                tenant_id: tenantId,
                asset_id: data.asset_id,
                source: 'site',
                status: 'new'
            });

        if (leadError) throw leadError;

        return { success: true, message: 'Lead criado com sucesso!' };
    } catch (error: any) {
        console.error('Erro ao criar lead:', error);
        return { error: error.message || 'Erro ao processar solicitação' };
    }
}

