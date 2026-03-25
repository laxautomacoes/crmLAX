'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from './profile';

export async function getSystemLogs(params: {
    page?: number;
    pageSize?: number;
    actionType?: string;
    profileId?: string;
    startDate?: string;
    endDate?: string;
}) {
    const supabase = await createClient();
    const { profile } = await getProfile();

    if (!profile || !['admin', 'superadmin', 'super_admin', 'super administrador'].includes(profile.role?.toLowerCase())) {
        return { success: false, error: 'Não autorizado' };
    }

    const {
        page = 1,
        pageSize = 20,
        actionType,
        profileId,
        startDate,
        endDate
    } = params;

    try {
        let query = supabase
            .from('system_logs')
            .select(`
                *,
                profiles!inner (
                    full_name,
                    avatar_url,
                    role
                )
            `, { count: 'exact' })
            .eq('tenant_id', profile.tenant_id)
            .order('created_at', { ascending: false });

        // Lógica de Visibilidade Baseada em Papel
        const requestingRole = profile.role?.toLowerCase();
        if (requestingRole === 'admin') {
            // Admin vê apenas Admin e User (Colaborador)
            query = query.in('profiles.role', ['admin', 'user']);
        } else if (['user', 'broker'].includes(requestingRole)) {
            // Usuário comum não deveria nem acessar, mas por segurança vê apenas a si mesmo
            query = query.eq('profile_id', profile.id);
        }

        if (actionType && actionType !== 'all') {
            query = query.eq('action', actionType);
        }

        if (profileId && profileId !== 'all') {
            query = query.eq('profile_id', profileId);
        }

        if (startDate) {
            query = query.gte('created_at', `${startDate}T00:00:00`);
        }

        if (endDate) {
            query = query.lte('created_at', `${endDate}T23:59:59`);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await query.range(from, to);

        if (error) throw error;

        return {
            success: true,
            data,
            totalCount: count || 0,
            currentPage: page,
            totalPages: Math.ceil((count || 0) / pageSize)
        };
    } catch (error: any) {
        console.error('Error fetching system logs:', error);
        return { success: false, error: error.message };
    }
}
