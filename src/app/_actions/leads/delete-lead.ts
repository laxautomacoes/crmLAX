'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getProfile } from '../profile'
import { createLog } from '@/lib/utils/logging'
import { notificationService } from '@/services/notification-service'

export async function deleteLead(leadId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile?.tenant_id) return { success: false, error: 'Tenant não identificado' }

    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)
        .eq('tenant_id', profile.tenant_id)

    if (error) return { success: false, error: error.message }

    await createLog({ action: 'delete_lead', entityType: 'lead', entityId: leadId })

    // Notificar administradores
    try {
        if (profile?.tenant_id) {
            const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('tenant_id', profile.tenant_id)
                .in('role', ['admin', 'superadmin'])
                .neq('id', profile.id)

            if (admins && admins.length > 0) {
                await Promise.all(admins.map((admin: { id: string }) =>
                    notificationService.create({
                        user_id: admin.id,
                        tenant_id: profile.tenant_id as string,
                        title: 'Lead Excluído',
                        message: `O lead #${leadId.slice(0, 8)} foi excluído por ${profile.full_name}.`,
                        type: 'error',
                        metadata: { lead_id: leadId, action_by: profile.id }
                    })
                ))
            }
        }
    } catch (e) {
        console.error('Error sending admin notifications:', e)
    }

    revalidatePath('/leads')
    return { success: true }
}

export async function archiveLead(leadId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile?.tenant_id) return { success: false, error: 'Tenant não identificado' }

    const { error } = await supabase
        .from('leads')
        .update({ is_archived: true })
        .eq('id', leadId)
        .eq('tenant_id', profile.tenant_id)

    if (error) return { success: false, error: error.message }

    await createLog({ action: 'archive_lead', entityType: 'lead', entityId: leadId })

    // Notificar administradores
    try {
        if (profile?.tenant_id) {
            const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('tenant_id', profile.tenant_id)
                .in('role', ['admin', 'superadmin'])
                .neq('id', profile.id)

            if (admins && admins.length > 0) {
                await Promise.all(admins.map((admin: any) =>
                    notificationService.create({
                        user_id: admin.id,
                        tenant_id: profile.tenant_id as string,
                        title: 'Lead Arquivado',
                        message: `O lead #${leadId.slice(0, 8)} foi arquivado por ${profile.full_name}.`,
                        type: 'info',
                        metadata: { lead_id: leadId }
                    })
                ))
            }
        }
    } catch (e) {
        console.error('Error sending admin notifications:', e)
    }

    revalidatePath('/leads')
    return { success: true }
}
