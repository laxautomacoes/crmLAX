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

    // Buscar profile do usuário para usar o nome como identificador da instância
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, full_name')
        .eq('id', user.id)
        .single();

    let instanceName = 'instance';
    let tenantSlug: string | null = null;

    // Usar o nome do usuário logado para gerar o nome da instância
    // Cada usuário terá sua própria instância com nome único
    if (profile?.full_name) {
        instanceName = profile.full_name;
    }

    if (profile?.tenant_id) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('slug')
            .eq('id', profile.tenant_id)
            .single();

        if (tenant?.slug) {
            tenantSlug = tenant.slug;
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

        let initialStatus = 'disconnected';
        let connectedPhone = null;

        try {
            await evolutionService.createInstance(instanceName, webhookUrl);
        } catch (createErr: any) {
            if (createErr.message && createErr.message.includes('already in use')) {
                // Instância já existe na Evolution API, então apenas re-adotamos ela e reconfiguramos o webhook
                console.log('[WhatsApp] Instância já existia, reconfigurando webhook...');
                await evolutionService.setWebhook(instanceName, webhookUrl);
                
                try {
                    const statusData = await evolutionService.getInstanceStatus(instanceName);
                    if (statusData?.instance?.state === 'open') {
                        initialStatus = 'connected';
                        const instanceInfo = await evolutionService.fetchInstanceInfo(instanceName);
                        const info = Array.isArray(instanceInfo) ? instanceInfo[0] : instanceInfo;
                        const ownerJid = info?.instance?.ownerJid || info?.ownerJid || '';
                        connectedPhone = ownerJid.split('@')[0].replace(/\D/g, '') || null;
                    }
                } catch (e) {
                    console.error('[WhatsApp] Falha ao recuperar status da instância existente', e);
                }
            } else {
                throw createErr;
            }
        }

        const { data, error } = await supabase
            .from('whatsapp_instances')
            .insert({
                user_id: user.id,
                tenant_id: profile?.tenant_id,
                instance_name: instanceName,
                status: initialStatus,
                connected_phone: connectedPhone
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
        // A Evolution API pode retornar base64 diretamente ou dentro de um objeto
        const base64 = qrData?.base64 || qrData?.qrcode?.base64 || null;
        if (base64) {
            return { data: { base64 } };
        }
        // Se conectou (sem QR), retornar vazio indicando que já está conectado
        if (qrData?.instance?.state === 'open') {
            return { data: null, connected: true };
        }
        return { error: 'QR code não disponível. Tente novamente em alguns segundos.' };
    } catch (err: any) {
        console.log('[WhatsApp] getQrCode falhou, tentando recriar instância...', err.message);
        // Instância provavelmente não existe na Evolution — recriar automaticamente
        try {
            const supabase = await createClient();
            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .single();

            const { data: tenant } = profile?.tenant_id
                ? await supabase.from('tenants').select('slug').eq('id', profile.tenant_id).single()
                : { data: null };

            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
            const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
            const tenantSlug = tenant?.slug;
            let webhookUrl: string;
            if (tenantSlug && !rootDomain.includes('localhost')) {
                webhookUrl = `${protocol}://${tenantSlug}.${rootDomain}/api/webhooks/evolution`;
            } else {
                webhookUrl = `${protocol}://${rootDomain}/api/webhooks/evolution`;
            }

            console.log('[WhatsApp] Recriando instância:', data.instance_name, 'webhook:', webhookUrl);
            await evolutionService.createInstance(data.instance_name, webhookUrl);
            
            // Tentar obter QR code novamente após recriar
            const retryQr = await evolutionService.getQrCode(data.instance_name);
            const retryBase64 = retryQr?.base64 || retryQr?.qrcode?.base64 || null;
            if (retryBase64) {
                return { data: { base64: retryBase64 } };
            }
            return { error: 'Instância recriada mas QR code não gerado. Tente novamente.' };
        } catch (recreateErr: any) {
            console.error('[WhatsApp] Falha ao recriar instância:', recreateErr.message);
            return { error: `Falha ao reconectar: ${recreateErr.message}` };
        }
    }
}

export async function refreshInstanceStatus() {
    const { data, error } = await getWhatsAppInstance();
    if (error || !data) return { error: 'No instance found' };

    try {
        const statusData = await evolutionService.getInstanceStatus(data.instance_name);
        const status = statusData.instance.state === 'open' ? 'connected' : 'disconnected';

        const supabase = await createClient();

        // Se conectado, buscar o número do WhatsApp (ownerJid) e salvar
        let connectedPhone: string | null = null;
        if (status === 'connected') {
            try {
                const instanceInfo = await evolutionService.fetchInstanceInfo(data.instance_name);
                // fetchInstances retorna array ou objeto com ownerJid
                const info = Array.isArray(instanceInfo) ? instanceInfo[0] : instanceInfo;
                const ownerJid = info?.instance?.ownerJid || info?.ownerJid || '';
                connectedPhone = ownerJid.split('@')[0].replace(/\D/g, '') || null;
            } catch {
                // Falha ao buscar info não bloqueia a atualização de status
            }
        }

        await supabase
            .from('whatsapp_instances')
            .update({ status, connected_phone: connectedPhone })
            .eq('id', data.id);

        revalidatePath('/settings/integrations');
        return { status, connectedPhone };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function disconnectWhatsApp() {
    const { data, error } = await getWhatsAppInstance();
    if (error || !data) return { error: 'No instance found' };

    const supabase = await createClient();

    // Tentar desconectar na Evolution API
    try {
        await evolutionService.logoutInstance(data.instance_name);
    } catch (logoutErr: any) {
        console.log('[WhatsApp] logout falhou, tentando delete...', logoutErr.message);
        // Se logout falhar, tentar deletar a instância na Evolution
        try {
            await evolutionService.deleteInstance(data.instance_name);
        } catch (deleteErr: any) {
            console.log('[WhatsApp] delete também falhou:', deleteErr.message);
            // Mesmo assim, atualizar o banco local
        }
    }

    // Sempre atualizar o banco local independente do resultado da API
    await supabase
        .from('whatsapp_instances')
        .update({ status: 'disconnected', connected_phone: null })
        .eq('id', data.id);

    revalidatePath('/settings/integrations');
    return { success: true };
}

export async function deleteWhatsAppInstance() {
    const { data, error } = await getWhatsAppInstance();
    if (error || !data) return { error: 'No instance found' };

    let warningMessage: string | undefined = undefined;

    // Tentar logout + delete na Evolution API (não bloqueia se falhar)
    try {
        await evolutionService.logoutInstance(data.instance_name);
    } catch (e: any) {
        console.log('[WhatsApp] logout antes de delete falhou (ok):', e.message);
    }

    try {
        await evolutionService.deleteInstance(data.instance_name);
    } catch (e: any) {
        console.log('[WhatsApp] delete na Evolution falhou:', e.message);
        const msg = e.message.toLowerCase();
        
        // Se for um erro [object Object] ou similar, significa que a Evolution falhou internamente
        if (msg.includes('[object object]')) {
            warningMessage = `Evolution API returned Bad Request (object Object) for instance: ${data.instance_name}`;
        } else if (!msg.includes('not found') && !msg.includes("doesn't exist")) {
            // Se for outro tipo de erro real, bloqueia a deleção para segurança
            return { error: `Falha ao excluir na Evolution: ${e.message}` };
        }
    }

    // Sempre deletar do banco local
    const supabase = await createClient();
    await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', data.id);

    revalidatePath('/settings/integrations');
    return { success: true, warning: warningMessage };
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

/** Envia uma mensagem de teste para o próprio número conectado. */
export async function sendTestMessage() {
    const { data, error } = await getWhatsAppInstance();
    if (error || !data) return { error: 'Nenhuma instância encontrada' };
    if (!data.connected_phone) return { error: 'Número conectado não identificado. Atualize o status primeiro.' };

    try {
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const testMsg = `✅ *Teste CRM LAX*\n\n🔗 Integração funcionando corretamente!\n📅 ${now}\n\n_Esta é uma mensagem automática de verificação._`;
        await evolutionService.sendMessage(data.instance_name, data.connected_phone, testMsg);
        return { success: true };
    } catch (err: any) {
        if (err.message && err.message.includes('Connection Closed')) {
            return { error: 'O servidor perdeu a conexão com o seu celular. Por favor, clique em "Excluir Instância" e leia o QR Code novamente para reconectar.' };
        }
        return { error: err.message };
    }
}

/** Envia uma mensagem para um lead específico através da instância conectada. */
export async function sendWhatsAppMessage(targetPhone: string, message: string, leadId?: string) {
    const { data, error } = await getWhatsAppInstance();
    if (error || !data) return { error: 'Nenhuma instância conectada encontrada' };
    if (data.status !== 'connected') return { error: 'Instância desconectada' };

    try {
        const formattedPhone = targetPhone.replace(/\D/g, '');
        // Se número tem 11 ou 10 digitos sem DDI, adiciona 55
        const fullPhone = formattedPhone.length <= 11 && !formattedPhone.startsWith('55') 
            ? `55${formattedPhone}` 
            : formattedPhone;

        await evolutionService.sendMessage(data.instance_name, fullPhone, message);

        // Se passamos leadId, gravar no banco de dados local do Supabase na hora
        if (leadId) {
            const supabase = await createClient();
            const { data: lead } = await supabase
                .from('leads')
                .select('id, whatsapp_chat')
                .eq('id', leadId)
                .maybeSingle();

            if (lead) {
                const newMessage = {
                    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                    text: message,
                    fromMe: true,
                    timestamp: new Date().toISOString(),
                    senderName: 'Você'
                };

                const currentChat = Array.isArray(lead.whatsapp_chat) ? lead.whatsapp_chat : [];
                const updatedChat = [...currentChat, newMessage].slice(-20);

                await supabase
                    .from('leads')
                    .update({ whatsapp_chat: updatedChat })
                    .eq('id', leadId);

                // Registrar interação
                await supabase.from('interactions').insert({
                    lead_id: leadId,
                    type: 'whatsapp',
                    content: message,
                    metadata: { fromMe: true, messageId: newMessage.id }
                });
            }
        }

        revalidatePath('/settings/integrations');
        return { success: true };
    } catch (err: any) {
        if (err.message && err.message.includes('Connection Closed')) {
            return { error: 'Conexão com o WhatsApp perdida. Acesse Configurações > Integrações, exclua a instância atual e leia o QR Code novamente.' };
        }
        return { error: err.message };
    }
}

/** Reporta o erro de exclusão da Evolution API para os desenvolvedores (superadmins) e gera log do sistema. */
export async function reportWhatsAppDeleteError(instanceName: string, errorMessage: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Buscar dados do usuário logado (nome, tenant)
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, full_name')
        .eq('id', user.id)
        .single();

    let tenantName = 'Inquilino desconhecido';
    if (profile?.tenant_id) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', profile.tenant_id)
            .single();
        if (tenant?.name) tenantName = tenant.name;
    }

    const title = '⚠️ Falha na exclusão de Instância WhatsApp';
    const message = `O usuário ${profile?.full_name || 'Desconhecido'} (${tenantName}) solicitou a exclusão da instância "${instanceName}" no CRM, mas a API da Evolution retornou erro ao deletar. Erro: ${errorMessage}. É necessária a remoção manual no painel da Evolution.`;

    // Buscar todos os superadmins do sistema
    const { data: superadmins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'superadmin');

    if (superadmins && superadmins.length > 0) {
        const notificationsToInsert = superadmins.map((admin: { id: string }) => ({
            user_id: admin.id,
            tenant_id: profile?.tenant_id || null,
            title,
            message,
            type: 'system_error',
            read: false
        }));

        await supabase.from('notifications').insert(notificationsToInsert);
    }

    // Gravar log de sistema
    await supabase.from('system_logs').insert({
        tenant_id: profile?.tenant_id || null,
        profile_id: user.id,
        action: 'whatsapp_delete_failed_report',
        entity_type: 'whatsapp_instance',
        details: {
            instance_name: instanceName,
            error: errorMessage,
            reporter: profile?.full_name
        }
    });

    return { success: true };
}

/** Recupera as mensagens do WhatsApp do lead atual */
export async function getWhatsAppChat(leadId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('leads')
        .select('whatsapp_chat')
        .eq('id', leadId)
        .maybeSingle();

    return { chat: (data?.whatsapp_chat as any[]) || [], error: error?.message };
}
