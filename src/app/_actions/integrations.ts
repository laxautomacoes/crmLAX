'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getIntegration(provider: string) {
    const supabase = await createClient();
    
    // Get user to find tenant_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not found' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile) return { data: null, error: 'Profile not found' };

    const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('provider', provider)
        .maybeSingle();

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

    const { error } = await supabase
        .from('integrations')
        .upsert({
            tenant_id: profile.tenant_id,
            provider,
            status,
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,provider' });

    if (error) return { error: error.message };

    revalidatePath('/settings/integrations');
    return { success: true };
}
