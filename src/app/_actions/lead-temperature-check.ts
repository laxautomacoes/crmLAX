'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { notificationService } from '@/services/notification-service'
import { getLeadTemperature, getTemperatureLabel, getTemperatureEmoji, getDaysSinceInteraction } from '@/lib/utils/lead-temperature'
import type { LeadTemperature } from '@/lib/utils/lead-temperature'

interface LeadRow {
    id: string
    tenant_id: string
    assigned_to: string | null
    last_interaction_at: string | null
    created_at: string | null
    contacts: { name: string } | null
}

/**
 * Verifica transições de temperatura de leads e dispara notificações.
 * Roda 1x/dia via cron.
 */
export async function checkLeadTemperatureTransitions() {
    const supabase = createAdminClient()

    // 1. Buscar todos os leads ativos com dados necessários
    const { data: leads, error } = await supabase
        .from('leads')
        .select('id, tenant_id, assigned_to, last_interaction_at, created_at, contacts(name)')
        .eq('is_archived', false)
        .not('tenant_id', 'is', null)

    if (error || !leads) {
        console.error('[LeadTemperature] Erro ao buscar leads:', error)
        return { success: false, error: error?.message }
    }

    // 2. Buscar admins de cada tenant (cache)
    const adminCache = new Map<string, string[]>()

    async function getAdminIds(tenantId: string): Promise<string[]> {
        if (adminCache.has(tenantId)) return adminCache.get(tenantId)!

        const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('tenant_id', tenantId)
            .in('role', ['admin', 'superadmin'])

        const ids = (admins || []).map(a => a.id)
        adminCache.set(tenantId, ids)
        return ids
    }

    let notificationsCreated = 0

    // 3. Para cada lead, verificar se precisa de notificação
    for (const lead of leads as LeadRow[]) {
        const lastDate = lead.last_interaction_at || lead.created_at
        const temp = getLeadTemperature(lastDate)
        const days = getDaysSinceInteraction(lastDate)

        // Só notifica em transições específicas (exatamente no dia da mudança)
        if (!shouldNotify(temp, days)) continue

        const leadName = lead.contacts?.name || 'Lead sem nome'
        const emoji = getTemperatureEmoji(temp)
        const label = getTemperatureLabel(temp)
        const title = `${emoji} Lead ${label}: ${leadName}`
        const message = buildMessage(temp, leadName, days)

        // Notificar corretor responsável
        if (lead.assigned_to) {
            await notificationService.create({
                user_id: lead.assigned_to,
                tenant_id: lead.tenant_id,
                title,
                message,
                type: 'warning'
            })
            notificationsCreated++
        }

        // Notificar admins do tenant
        const adminIds = await getAdminIds(lead.tenant_id)
        for (const adminId of adminIds) {
            if (adminId === lead.assigned_to) continue // evitar duplicata
            await notificationService.create({
                user_id: adminId,
                tenant_id: lead.tenant_id,
                title,
                message,
                type: 'warning'
            })
            notificationsCreated++
        }
    }

    console.log(`[LeadTemperature] Check concluído. ${notificationsCreated} notificações criadas.`)
    return { success: true, notificationsCreated }
}

/**
 * Define se deve notificar baseado na temperatura e dias.
 * Notifica apenas nos dias exatos de transição para evitar spam.
 */
function shouldNotify(temp: LeadTemperature, days: number | null): boolean {
    if (days === null) return false
    // Notifica exatamente no dia da transição
    if (days === 8) return true   // quente → morno
    if (days === 16) return true  // morno → frio
    if (days === 31) return true  // frio → inativo
    return false
}

function buildMessage(temp: LeadTemperature, name: string, days: number | null): string {
    const dayText = days ? `${days} dias` : 'muito tempo'

    switch (temp) {
        case 'warm':
            return `O lead "${name}" está morno — sem interação há ${dayText}. Considere retomar contato.`
        case 'cold':
            return `⚠️ O lead "${name}" está frio — sem interação há ${dayText}. Risco de perda!`
        case 'inactive':
            return `O lead "${name}" está inativo — sem interação há ${dayText}. Recomendamos avaliar se deve ser arquivado.`
        default:
            return `O lead "${name}" mudou de classificação.`
    }
}
