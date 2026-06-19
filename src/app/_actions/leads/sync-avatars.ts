'use server'

import { createClient } from '@/lib/supabase/server'
import { evolutionService } from '@/lib/evolution'

/** Garante que o número tenha DDI 55 */
function ensureBrazilDDI(phone: string): string {
    const clean = phone.replace(/\D/g, '')
    return clean.startsWith('55') ? clean : `55${clean}`
}

/**
 * Sincroniza o avatar_url de um contato específico a partir do WhatsApp.
 * Retorna a URL da foto de perfil ou null se não encontrar.
 */
export async function syncContactAvatar(contactId: string, tenantId: string): Promise<{ success: boolean; avatar_url: string | null }> {
    try {
        const supabase = await createClient()

        // 1. Buscar dados do contato
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('id, phone, avatar_url')
            .eq('id', contactId)
            .single()

        if (contactError || !contact) {
            return { success: false, avatar_url: null }
        }

        // Se já tem avatar, retornar
        if (contact.avatar_url) {
            return { success: true, avatar_url: contact.avatar_url }
        }

        if (!contact.phone) {
            return { success: false, avatar_url: null }
        }

        // 2. Buscar instância conectada do tenant
        const { data: instance } = await supabase
            .from('whatsapp_instances')
            .select('instance_name')
            .eq('tenant_id', tenantId)
            .eq('status', 'connected')
            .limit(1)
            .maybeSingle()

        if (!instance?.instance_name) {
            return { success: false, avatar_url: null }
        }

        // 3. Buscar foto de perfil via Evolution API
        const fullPhone = ensureBrazilDDI(contact.phone)
        const profile = await evolutionService.fetchProfile(instance.instance_name, fullPhone)
        const avatarUrl = profile?.picture || profile?.profilePictureUrl || profile?.profileUrl || null

        if (avatarUrl) {
            // 4. Salvar no banco
            await supabase
                .from('contacts')
                .update({ avatar_url: avatarUrl })
                .eq('id', contact.id)

            return { success: true, avatar_url: avatarUrl }
        }

        return { success: true, avatar_url: null }
    } catch (error) {
        console.error('[sync-avatars] Erro ao sincronizar avatar do contato:', error)
        return { success: false, avatar_url: null }
    }
}

/**
 * Sincroniza avatares de todos os contatos de um tenant que ainda não possuem avatar_url.
 * Retorna a quantidade de contatos atualizados.
 */
export async function syncAllContactAvatars(tenantId: string): Promise<{ success: boolean; updated: number; total: number }> {
    try {
        const supabase = await createClient()

        // 1. Buscar instância conectada
        const { data: instance } = await supabase
            .from('whatsapp_instances')
            .select('instance_name')
            .eq('tenant_id', tenantId)
            .eq('status', 'connected')
            .limit(1)
            .maybeSingle()

        if (!instance?.instance_name) {
            return { success: false, updated: 0, total: 0 }
        }

        // 2. Buscar contatos sem avatar
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('id, phone')
            .eq('tenant_id', tenantId)
            .is('avatar_url', null)
            .not('phone', 'is', null)

        if (error || !contacts) {
            return { success: false, updated: 0, total: 0 }
        }

        let updated = 0

        // 3. Sincronizar cada contato (com delay para não sobrecarregar a API)
        for (const contact of contacts) {
            try {
                const fullPhone = ensureBrazilDDI(contact.phone!)
                const profile = await evolutionService.fetchProfile(instance.instance_name, fullPhone)
                const avatarUrl = profile?.picture || profile?.profilePictureUrl || profile?.profileUrl || null

                if (avatarUrl) {
                    await supabase
                        .from('contacts')
                        .update({ avatar_url: avatarUrl })
                        .eq('id', contact.id)
                    updated++
                }

                // Delay de 500ms entre cada requisição para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 500))
            } catch (err) {
                console.error(`[sync-avatars] Erro ao sincronizar contato ${contact.id}:`, err)
            }
        }

        return { success: true, updated, total: contacts.length }
    } catch (error) {
        console.error('[sync-avatars] Erro ao sincronizar avatares em batch:', error)
        return { success: false, updated: 0, total: 0 }
    }
}
