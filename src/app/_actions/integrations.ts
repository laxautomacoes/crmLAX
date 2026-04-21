'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getIntegration(provider: string) {
    const supabase = await createClient();
    
    // Get user to find tenant_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('getIntegration: Usuário não autenticado');
        return { data: null, error: 'User not found' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile) {
        console.error(`getIntegration: Perfil não encontrado para o usuário ${user.id}`);
        return { data: null, error: 'Profile not found' };
    }

    if (!profile.tenant_id) {
        console.error(`getIntegration: tenant_id não encontrado no perfil do usuário ${user.id}`);
    }

    const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('provider', provider)
        .maybeSingle();

    if (error) {
        console.error(`getIntegration: Erro ao buscar integração ${provider}:`, error);
    } else {
        console.log(`getIntegration: Sucesso ao buscar ${provider}. Status: ${data?.status || 'Não iniciada'}`);
    }

    return { data, error: error?.message };
}

export async function saveIntegration(provider: string, credentials: any) {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'User not found' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile) return { error: 'Profile not found' };

    const { error } = await supabase
        .from('integrations')
        .upsert({
            tenant_id: profile.tenant_id,
            provider,
            credentials,
            status: 'active',
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,provider' });

    if (error) return { error: error.message };

    revalidatePath('/settings/integrations');
    return { success: true };
}
export async function updateIntegrationStatus(provider: string, status: 'active' | 'inactive') {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'User not found' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile) return { error: 'Profile not found' };

    // Tenta atualizar primeiro para não apagar credenciais existentes
    const { data, error } = await supabase
        .from('integrations')
        .update({
            status,
            updated_at: new Date().toISOString()
        })
        .eq('tenant_id', profile.tenant_id)
        .eq('provider', provider)
        .select();

    // Se não encontrou linha para atualizar, insere uma nova
    if (!error && (!data || data.length === 0)) {
        const { error: insertError } = await supabase
            .from('integrations')
            .insert({
                tenant_id: profile.tenant_id,
                provider,
                status,
                updated_at: new Date().toISOString()
            });
        
        if (insertError) return { error: insertError.message };
    } else if (error) {
        return { error: error.message };
    }

    revalidatePath('/settings/integrations');
    return { success: true };
}
