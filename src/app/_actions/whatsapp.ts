'use server';

import { createClient } from '@/lib/supabase/server';
import { evolutionService } from '@/lib/evolution';
import { revalidatePath } from 'next/cache';

export async function getWhatsAppInstance() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    return { data, error: error?.message };
}

export async function setupWhatsAppInstance() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Check if user already has an instance
    const { data: existing } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (existing) return { error: 'Você já possui uma instância ativa.' };

    // Buscar tenant para usar o slug como nome da instância
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    let instanceName = 'instance';
    let tenantSlug: string | null = null;
    if (profile?.tenant_id) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('slug, name')
            .eq('id', profile.tenant_id)
            .single();

        if (tenant?.slug) {
            instanceName = tenant.slug;
            tenantSlug = tenant.slug;
        } else if (tenant?.name) {
            instanceName = tenant.name;
        }
    }

    // Garantir nome alfanumérico compatível com a Evolution API
    instanceName = instanceName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (!instanceName) instanceName = `tenant${Date.now()}`;
    
    try {
        // Montar URL do webhook para a Evolution API
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
        const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
        let webhookUrl: string;
        if (tenantSlug && !rootDomain.includes('localhost')) {
            webhookUrl = `${protocol}://${tenantSlug}.${rootDomain}/api/webhooks/evolution`;
        } else {
            webhookUrl = `${protocol}://${rootDomain}/api/webhooks/evolution`;
        }

        const evolution = await evolutionService.createInstance(instanceName, webhookUrl);

        const { data, error } = await supabase
            .from('whatsapp_instances')
            .insert({
                user_id: user.id,
                tenant_id: profile?.tenant_id,
                instance_name: instanceName,
                status: 'disconnected'
            })
            .select()
            .single();

        revalidatePath('/settings/integrations');
        return { data, error: error?.message };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function getQrCode() {
    const { data, error } = await getWhatsAppInstance();
    if (error || !data) return { error: 'No instance found' };

    try {
        const qrData = await evolutionService.getQrCode(data.instance_name);
        return { data: qrData };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function refreshInstanceStatus() {
    const { data, error } = await getWhatsAppInstance();
    if (error || !data) return { error: 'No instance found' };

    try {
        const statusData = await evolutionService.getInstanceStatus(data.instance_name);
        const status = statusData.instance.state === 'open' ? 'connected' : 'disconnected';

        const supabase = await createClient();
        await supabase
            .from('whatsapp_instances')
            .update({ status })
            .eq('id', data.id);

        revalidatePath('/settings/integrations');
        return { status };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function disconnectWhatsApp() {
    const { data, error } = await getWhatsAppInstance();
    if (error || !data) return { error: 'No instance found' };

    try {
        await evolutionService.logoutInstance(data.instance_name);
        
        const supabase = await createClient();
        await supabase
            .from('whatsapp_instances')
            .update({ status: 'disconnected' })
            .eq('id', data.id);

        revalidatePath('/settings/integrations');
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function deleteWhatsAppInstance() {
    const { data, error } = await getWhatsAppInstance();
    if (error || !data) return { error: 'No instance found' };

    try {
        await evolutionService.deleteInstance(data.instance_name);
        
        const supabase = await createClient();
        await supabase
            .from('whatsapp_instances')
            .delete()
            .eq('id', data.id);

        revalidatePath('/settings/integrations');
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function configureWebhook() {
    const { data, error } = await getWhatsAppInstance();
    if (error || !data) return { error: 'Nenhuma instância encontrada' };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    let tenantSlug: string | null = null;
    if (profile?.tenant_id) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('slug')
            .eq('id', profile.tenant_id)
            .single();
        tenantSlug = tenant?.slug || null;
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
    let webhookUrl: string;
    if (tenantSlug && !rootDomain.includes('localhost')) {
        webhookUrl = `${protocol}://${tenantSlug}.${rootDomain}/api/webhooks/evolution`;
    } else {
        webhookUrl = `${protocol}://${rootDomain}/api/webhooks/evolution`;
    }

    try {
        await evolutionService.setWebhook(data.instance_name, webhookUrl);
        return { success: true, webhookUrl };
    } catch (err: any) {
        return { error: err.message };
    }
}
