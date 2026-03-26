import { createAdminClient } from '@/lib/supabase/admin';
import { evolutionService } from '@/lib/evolution';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'new_lead' | 'calendar' | 'calendar_reminder' | 'email_change_request' | 'critical_deletion' | string;

export interface CreateNotificationParams {
    user_id: string;
    tenant_id: string;
    title: string;
    message: string;
    type?: NotificationType;
    metadata?: any;
    send_whatsapp?: boolean;
    whatsapp_number?: string;
}

// Cache simples para deduplicação (em memória - funcional para o ciclo de vida da Warm Lambda/Edge)
// Para uma solução mais robusta em escala, poderíamos usar Redis ou uma tabela de 'locks'.
// Mas para este cenário, um set de hashes recentes resolve a maioria dos spams de UI.
const recentNotifications = new Set<string>();

export const notificationService = {
    /**
     * Cria uma notificação no sistema e opcionalmente envia via WhatsApp.
     * Inclui lógica de deduplicação básica.
     */
    async create(params: CreateNotificationParams) {
        const {
            user_id,
            tenant_id,
            title,
            message,
            type = 'info',
            metadata = {},
            send_whatsapp = false,
            whatsapp_number
        } = params;

        // Gerar hash para deduplicação
        const hash = `${user_id}:${title}:${message}`;
        if (recentNotifications.has(hash)) {
            console.log(`[NotificationService] Deduplicada: ${title}`);
            return { success: true, duplicated: true };
        }

        // Adicionar ao cache de recentes e agendar remoção
        recentNotifications.add(hash);
        setTimeout(() => recentNotifications.delete(hash), 10000); // 10 segundos de janela

        const supabase = createAdminClient();

        try {
            // 1. Inserir no Banco
            const { data, error } = await supabase
                .from('notifications')
                .insert([{
                    user_id,
                    tenant_id,
                    title,
                    message,
                    type,
                    read: false,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            // 2. Enviar WhatsApp se solicitado
            if (send_whatsapp && whatsapp_number) {
                await this.sendWhatsApp(tenant_id, user_id, whatsapp_number, `🔔 *${title}*\n\n${message}`);
            }

            return { success: true, data };
        } catch (error) {
            console.error('[NotificationService] Erro ao criar notificação:', error);
            return { success: false, error };
        }
    },

    /**
     * Envia mensagem de WhatsApp usando a instância conectada do tenant/user.
     */
    async sendWhatsApp(tenant_id: string, user_id: string, target_number: string, message: string) {
        const supabase = createAdminClient();
        
        try {
            // Busca instância de WhatsApp conectada (preferencialmente do usuário, senão do tenant)
            const { data: instance } = await supabase
                .from('whatsapp_instances')
                .select('instance_name')
                .eq('tenant_id', tenant_id)
                .eq('status', 'connected')
                .order('user_id', { ascending: false }) // Prioriza instâncias vinculadas a usuários
                .limit(1)
                .maybeSingle();

            if (instance?.instance_name) {
                const cleanNumber = target_number.replace(/\D/g, '');
                await evolutionService.sendMessage(
                    instance.instance_name,
                    cleanNumber,
                    message
                ).catch(err => console.error('[NotificationService] Erro Evolution API:', err));
            }
        } catch (error) {
            console.error('[NotificationService] Erro ao enviar WhatsApp:', error);
        }
    },

    /**
     * Deleta notificações por IDs
     */
    async delete(ids: string[]) {
        if (!ids.length) return { success: true };

        const supabase = createAdminClient();
        const { error } = await supabase
            .from('notifications')
            .delete()
            .in('id', ids);

        if (error) {
            console.error('[NotificationService] Erro ao deletar notificações:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    }
};
